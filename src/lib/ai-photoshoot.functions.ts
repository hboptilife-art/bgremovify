import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * AI Photoshoot — composite the studio canvas (background scene + product +
 * text/badge layers already positioned by the user) and hand it to
 * Gemini 3 Pro Image as a reference frame, then regenerate a photo-real,
 * commercial-quality photoshoot that matches the user's prompt and aspect.
 *
 * Cost: 2 credits per generated image (admin bypass).
 */

export const PHOTOSHOOT_COST_PER_IMAGE = 2;
const COST_PER_IMAGE = PHOTOSHOOT_COST_PER_IMAGE;
const MAX_COUNT = 4;

export type PhotoshootMode = "precise" | "creative" | "inspiration";
export type PhotoshootAspect = "1:1" | "4:5" | "3:2" | "16:9" | "9:16";

type PhotoshootOk = {
  ok: true;
  images: string[]; // data URLs
  remainingCredits?: number;
};
type PhotoshootErr = {
  ok: false;
  reason:
    | "empty"
    | "gateway_error"
    | "no_output"
    | "moderation"
    | "no_credits"
    | "bad_input";
  detail?: string;
};
export type PhotoshootResult = PhotoshootOk | PhotoshootErr;

function parseDataUrl(input: string): { mime: string; data: string } {
  const m = input.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) throw new Error("bad_data_url");
  return { mime: m[1], data: m[2] };
}

function buildSystemInstruction(mode: PhotoshootMode, aspect: PhotoshootAspect, userPrompt: string) {
  const modeText =
    mode === "precise"
      ? "PRESERVE product geometry, color, material, logos and typography EXACTLY as shown."
      : mode === "creative"
        ? "PRESERVE product identity but you may adjust lighting, camera angle, and staging for artistic impact."
        : "USE the product as inspiration; re-imagine the scene freely while keeping the product recognizable.";

  return [
    "You are an AI Photoshoot composer for e-commerce catalog images.",
    "You receive ONE reference image that shows the product already staged by a user on a canvas.",
    "Task: regenerate a photo-realistic, high-end commercial photograph of the SAME product in the SAME staging.",
    modeText,
    `Target aspect ratio: ${aspect}. Match this ratio in the output.`,
    "Lighting must be studio-quality, shadows physically correct, focus sharp on the product.",
    "No text, no watermarks, no extra objects unless explicitly requested.",
    userPrompt ? `Creative direction from the user: ${userPrompt}` : "No extra creative direction — keep it clean and premium.",
    "Output ONLY the composed image.",
  ].join(" ");
}

async function callGeminiOnce(
  key: string,
  ref: { mime: string; data: string },
  systemInstruction: string,
): Promise<{ ok: true; b64: string } | { ok: false; reason: PhotoshootErr["reason"]; detail?: string }> {
  const body = {
    model: "google/gemini-3-pro-image",
    contents: [
      {
        role: "user",
        parts: [
          { text: systemInstruction },
          { inlineData: { mimeType: ref.mime, data: ref.data } },
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
      console.error("[aiPhotoshoot] gateway", res.status, text.slice(0, 400));
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
    return { ok: true, b64 };
  } catch (err) {
    return {
      ok: false,
      reason: "gateway_error",
      detail: err instanceof Error ? err.message : "unknown",
    };
  }
}

export type AIPhotoshootInput = {
  canvasDataUrl: string;
  prompt?: string | null;
  mode?: PhotoshootMode;
  aspect?: PhotoshootAspect;
  count?: number;
};

export const runAIPhotoshoot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: AIPhotoshootInput) => {
    const rawCount = typeof input?.count === "number" ? Math.floor(input.count) : 1;
    const count = Math.max(1, Math.min(MAX_COUNT, rawCount));
    return {
      canvasDataUrl: String(input?.canvasDataUrl ?? ""),
      prompt: input?.prompt ? String(input.prompt).slice(0, 900) : "",
      mode: (input?.mode ?? "precise") as PhotoshootMode,
      aspect: (input?.aspect ?? "1:1") as PhotoshootAspect,
      count,
    };
  })
  .handler(async ({ data, context }): Promise<PhotoshootResult> => {
    if (!data.canvasDataUrl) return { ok: false, reason: "empty" };

    let ref: { mime: string; data: string };
    try {
      ref = parseDataUrl(data.canvasDataUrl);
    } catch {
      return { ok: false, reason: "bad_input", detail: "not_a_data_url" };
    }

    const key = process.env.LOVABLE_API_KEY;
    if (!key) return { ok: false, reason: "gateway_error", detail: "missing_key" };

    // Pre-flight credit check (admin bypass).
    const { isBillingAdminUser, readUserCreditBalance } = await import("./billing-admin.server");
    const isAdmin = await isBillingAdminUser(context.userId);
    const totalCost = COST_PER_IMAGE * data.count;
    if (!isAdmin) {
      const { supabase } = context;
      const { data: row } = await supabase
        .from("user_credits")
        .select("credits")
        .eq("user_id", context.userId)
        .maybeSingle();
      const available = typeof row?.credits === "number" ? row.credits : 0;
      if (available < totalCost) return { ok: false, reason: "no_credits" };
    }

    const systemInstruction = buildSystemInstruction(data.mode, data.aspect, data.prompt);

    // Run N generations in parallel — Gemini 3 Pro Image is stateless per call.
    const settled = await Promise.all(
      Array.from({ length: data.count }, () => callGeminiOnce(key, ref, systemInstruction)),
    );

    const successes = settled.filter((r): r is { ok: true; b64: string } => r.ok);
    if (successes.length === 0) {
      const first = settled.find((r) => !r.ok) as
        | { ok: false; reason: PhotoshootErr["reason"]; detail?: string }
        | undefined;
      return {
        ok: false,
        reason: first?.reason ?? "no_output",
        detail: first?.detail,
      };
    }

    // Charge only for successful images.
    let remainingCredits: number | undefined;
    if (isAdmin) {
      remainingCredits = await readUserCreditBalance(context.userId);
    } else {
      const spend = COST_PER_IMAGE * successes.length;
      const { data: remaining, error: creditErr } = await context.supabase.rpc("consume_credits", {
        _n: spend,
      });
      if (creditErr) {
        if (creditErr.message?.includes("no_credits")) return { ok: false, reason: "no_credits" };
        console.error("[aiPhotoshoot] credit failed", creditErr);
      } else {
        remainingCredits = typeof remaining === "number" ? remaining : Number(remaining);
      }
    }

    return {
      ok: true,
      images: successes.map((s) => `data:image/png;base64,${s.b64}`),
      remainingCredits,
    };
  });
