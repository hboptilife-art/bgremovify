import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Virtual Try-On (PoC): Gemini 3 Pro Image ile paired-template üzerinden
// gerçek dönüşüm (raw ürün → modelin üzerinde / mekanda ürün).
// İlk etap kategoriler: jacket, watch, balloon.

export type TryOnCategory = "jacket" | "watch" | "balloon";

// Paired template referansları — kategori başına AI'ya "hedef sahne" olarak
// veriliyor. Ürün fotoğrafı user'dan geliyor, referans sahne buradan.
const TEMPLATE_REFS: Record<TryOnCategory, { ref: string; scene: string }> = {
  jacket: {
    ref: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=1024&q=85&auto=format&fit=crop",
    scene:
      "a professional male fashion model, front-facing torso shot, plain neutral studio background, soft key light, high-end e-commerce look-book style, editorial lighting",
  },
  watch: {
    ref: "https://images.unsplash.com/photo-1509048191080-d2984bad6ae5?w=1024&q=85&auto=format&fit=crop",
    scene:
      "a close-up of a male wrist on a soft marble surface, cuff of a white shirt visible, warm natural daylight, luxury watch product photography composition",
  },
  balloon: {
    ref: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=1024&q=85&auto=format&fit=crop",
    scene:
      "an elegant indoor party venue with pastel walls, wooden floor, soft warm lighting, birthday celebration setup, wide angle interior photography",
  },
};

const SYSTEM_INSTRUCTION = [
  "You are a Virtual Try-On visual composer.",
  "You receive: (1) a REFERENCE SCENE image and (2) a PRODUCT image.",
  "Task: place the exact product from image (2) naturally into the scene of image (1).",
  "STRICT RULES:",
  "- Preserve the product's exact geometry, silhouette, color, material, logos and details from image (2). Do not redesign it.",
  "- Match scene lighting, perspective, shadows and scale. Contact shadows must be physically correct.",
  "- Photo-realistic, commercial e-commerce quality, sharp focus on the product, no text, no watermarks, no extra objects.",
  "- Output ONLY the composed image.",
].join(" ");

// Gemini 3 Pro Image ~$0.12/call → 3 kredi (=$0.30, ~60% marj)
const COST_TRYON = 3;

type TryOnOk = { ok: true; imageBase64: string; remainingCredits?: number };
type TryOnErr = {
  ok: false;
  reason: "empty" | "gateway_error" | "no_output" | "moderation" | "no_credits";
  detail?: string;
};
export type TryOnResult = TryOnOk | TryOnErr;

async function fetchAsBase64(url: string): Promise<{ mime: string; data: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ref_fetch_${res.status}`);
  const mime = res.headers.get("content-type") ?? "image/jpeg";
  const buf = new Uint8Array(await res.arrayBuffer());
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < buf.length; i += chunk) {
    binary += String.fromCharCode(...buf.subarray(i, i + chunk));
  }
  return { mime, data: btoa(binary) };
}

function parseDataUrl(input: string): { mime: string; data: string } {
  const m = input.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) throw new Error("bad_data_url");
  return { mime: m[1], data: m[2] };
}

export type WearableAnchor =
  | "hat" | "glasses" | "earring" | "necklace" | "watch"
  | "ring" | "top" | "bottom" | "shoes" | "bag" | "generic";

const ANCHOR_HINTS: Record<WearableAnchor, string> = {
  hat: "The product is HEADWEAR — place it on top of the subject's head, matching head tilt, hair volume, brim perspective and cast a soft shadow on the forehead.",
  glasses: "The product is EYEWEAR — rest on the bridge of the nose, temples over the ears, catch light on the lenses, reflection subtle.",
  earring: "The product is an EARRING — hang from the earlobe, respect gravity, keep symmetry with the visible ear.",
  necklace: "The product is a NECKLACE — drape around the neckline over the collarbone, chain curvature must match the body's perspective.",
  watch: "The product is a WATCH — wrap around the wrist, band curvature follows the wrist, dial faces the camera correctly.",
  ring: "The product is a RING — worn on a finger with correct scale, respect finger perspective.",
  top: "The product is a TOP / SHIRT — worn on the torso, shoulder seams aligned, sleeves following arm perspective, natural fabric drape.",
  bottom: "The product is BOTTOM WEAR — worn on hips/legs, waistband aligned, fabric fall respects gravity.",
  shoes: "The product is FOOTWEAR — worn on the feet with correct perspective and ground contact shadow.",
  bag: "The product is a BAG — held in hand or on shoulder, strap correctly draped, weight visible in posture.",
  generic: "Compose the product naturally into the scene with correct scale, perspective, and lighting.",
};

export type VirtualTryOnInput = {
  /** Legacy fast-path — one of jacket/watch/balloon presets. */
  category?: TryOnCategory | null;
  /** New: custom scene reference (any gallery item URL). */
  sceneUrl?: string | null;
  /** New: natural-language scene description (from gallery category prompt). */
  scenePrompt?: string | null;
  /** Required — user's product photo as a data URL. */
  productDataUrl: string;
  /** Smart-fit anchor (which body region the product is worn on). */
  wearableAnchor?: WearableAnchor | null;
};

export const virtualTryOn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: VirtualTryOnInput) => ({
    category: (input?.category ?? null) as TryOnCategory | null,
    sceneUrl: input?.sceneUrl ? String(input.sceneUrl) : null,
    scenePrompt: input?.scenePrompt ? String(input.scenePrompt).slice(0, 900) : null,
    productDataUrl: String(input?.productDataUrl ?? ""),
    wearableAnchor: (input?.wearableAnchor ?? null) as WearableAnchor | null,
  }))
  .handler(async ({ data, context }): Promise<TryOnResult> => {
    if (!data.productDataUrl) return { ok: false, reason: "empty" };

    // Pre-flight credit check (Gemini 3 Pro Image maliyetli — admin bypass hariç kredi zorunlu).
    const { isBillingAdminUser, readUserCreditBalance } = await import("./billing-admin.server");
    const isAdmin = await isBillingAdminUser(context.userId);
    if (!isAdmin) {
      const { supabase } = context;
      const { data: row } = await supabase
        .from("user_credits")
        .select("credits")
        .eq("user_id", context.userId)
        .maybeSingle();
      const available = typeof row?.credits === "number" ? row.credits : 0;
      if (available < COST_TRYON) return { ok: false, reason: "no_credits" };
    }



    // Resolve scene from either explicit sceneUrl or one of the built-in presets.
    let sceneUrl = data.sceneUrl;
    let sceneText = data.scenePrompt;
    if (!sceneUrl && data.category) {
      const preset = TEMPLATE_REFS[data.category];
      if (preset) {
        sceneUrl = preset.ref;
        sceneText = sceneText ?? preset.scene;
      }
    }
    if (!sceneUrl) return { ok: false, reason: "empty", detail: "no_scene" };
    if (!sceneText) {
      sceneText = "a premium e-commerce product photography scene, natural lighting, matching perspective";
    }

    const key = process.env.LOVABLE_API_KEY;
    if (!key) return { ok: false, reason: "gateway_error", detail: "missing_key" };

    let product: { mime: string; data: string };
    let sceneRef: { mime: string; data: string };
    try {
      product = parseDataUrl(data.productDataUrl);
      sceneRef = await fetchAsBase64(sceneUrl);
    } catch (err) {
      return {
        ok: false,
        reason: "gateway_error",
        detail: err instanceof Error ? err.message : "prep_failed",
      };
    }

    const anchorHint = ANCHOR_HINTS[(data.wearableAnchor ?? "generic") as WearableAnchor];
    const body = {
      model: "google/gemini-3-pro-image",
      contents: [
        {
          role: "user",
          parts: [
            { text: `${SYSTEM_INSTRUCTION}\n\nTarget scene: ${sceneText}\n\nFITTING GUIDANCE: ${anchorHint}\n\nImage 1 = REFERENCE SCENE. Image 2 = PRODUCT. Place the product on the correct body region as described, preserving product identity 100%.` },
            { inlineData: { mimeType: sceneRef.mime, data: sceneRef.data } },
            { inlineData: { mimeType: product.mime, data: product.data } },
          ],
        },
      ],
      generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
    };

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        console.error("[virtualTryOn] gateway", res.status, text.slice(0, 300));
        return { ok: false, reason: "gateway_error", detail: `${res.status}` };
      }
      const json = (await res.json()) as {
        data?: { b64_json?: string }[];
        error?: { message?: string; code?: string };
      };
      if (json.error) {
        return {
          ok: false,
          reason: json.error.code === "content_policy_violation" ? "moderation" : "gateway_error",
          detail: json.error.message,
        };
      }
      const b64 = json.data?.[0]?.b64_json;
      if (!b64) return { ok: false, reason: "no_output" };

      // Kredi tüketimi — sadece başarılı sonuçtan sonra (admin bypass).
      let remainingCredits: number | undefined;
      if (isAdmin) {
        remainingCredits = await readUserCreditBalance(context.userId);
      } else {
        const { data: remaining, error: creditErr } = await context.supabase.rpc("consume_credits", { _n: COST_TRYON });
        if (creditErr) {
          if (creditErr.message?.includes("no_credits")) return { ok: false, reason: "no_credits" };
          console.error("[virtualTryOn] credit failed", creditErr);
        } else {
          remainingCredits = typeof remaining === "number" ? remaining : Number(remaining);
        }
      }

      return { ok: true, imageBase64: `data:image/png;base64,${b64}`, remainingCredits };
    } catch (err) {
      return {
        ok: false,
        reason: "gateway_error",
        detail: err instanceof Error ? err.message : "unknown",
      };
    }
  });
