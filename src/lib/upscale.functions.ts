import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Ultra HD upscale via Replicate.
// - Two tiers: "fast" (Real-ESRGAN, 1 credit) and "studio" (Clarity Upscaler, 2 credits).
// - Credits consumed only after a successful provider result.
// - Clarity creativity locked to 0.2 to protect brand text / logos for e-commerce sellers.

const MAX_INPUT_BYTES = 10 * 1024 * 1024; // 10MB hard cap to bound provider cost.

// Real-ESRGAN — pinned community version (sharpens existing pixels, ~$0.003).
const FAST_MODEL = "nightmareai/real-esrgan";
const FAST_VERSION = "b3ef194191d13140337468c916c2c5b96dd0cb06dffc032a022a31807f6a5ea8";

// Clarity Upscaler — pinned community version (SDXL-based redraw, ~$0.04).
const STUDIO_MODEL = "philz1337x/clarity-upscaler";
const STUDIO_VERSION = "dfad41707589d68ecdccd1dfa600d55a208f9310748e44bfe35b4a6291453d5e";

export type UpscaleTier = "fast" | "studio";

type UpscaleResult =
  | {
      ok: true;
      resultDataUrl: string;
      remainingCredits: number;
      tier: UpscaleTier;
    }
  | {
      ok: false;
      reason:
        | "no_credits"
        | "provider_unavailable"
        | "provider_no_output"
        | "image_too_large"
        | "invalid_image_payload"
        | "unknown_error";
    };

function assertDataUrl(input: string): void {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/.exec(input);
  if (!match) throw new Error("invalid_image_payload");
  const b64 = match[2];
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  const bytes = Math.floor((b64.length * 3) / 4) - padding;
  if (bytes > MAX_INPUT_BYTES) throw new Error("image_too_large");
}

export const upscaleImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { imageDataUrl: string; tier: UpscaleTier; mock?: boolean }) => {
    const url = String(input?.imageDataUrl ?? "");
    assertDataUrl(url);
    const tier: UpscaleTier = input?.tier === "studio" ? "studio" : "fast";
    const mock = Boolean(input?.mock);
    return { imageDataUrl: url, tier, mock };
  })
  .handler(async ({ data, context }): Promise<UpscaleResult> => {
    const { supabase } = context;

    const cost = 2; // Flat 2 credits per Ultra HD upscale — tier only affects model quality.

    // 1. Pre-flight credit check (don't burn provider $ if the user can't pay).
    //    Admins bypass.
    const { isBillingAdminUser, readUserCreditBalance } = await import("./billing-admin.server");
    const isAdmin = await isBillingAdminUser(context.userId);

    // Sandbox / MOCK mode — admin only. Echoes input back, no Replicate call,
    // no credits consumed. Protects test budget when iterating on UI/UX.
    if (isAdmin && data.mock) {
      return {
        ok: true as const,
        resultDataUrl: data.imageDataUrl,
        remainingCredits: 9999,
        tier: data.tier,
      };
    }

    if (!isAdmin) {
      const { data: row } = await supabase
        .from("user_credits")
        .select("credits")
        .eq("user_id", context.userId)
        .maybeSingle();
      const available = typeof row?.credits === "number" ? row.credits : 0;
      if (available < cost) return { ok: false, reason: "no_credits" };
    }

    const { runReplicateModel, fetchAsDataUrl } = await import("./replicate.server");


    // 2. Call Replicate.
    try {
      const modelSlug = data.tier === "studio" ? STUDIO_MODEL : FAST_MODEL;
      const version = data.tier === "studio" ? STUDIO_VERSION : FAST_VERSION;

      const input: Record<string, unknown> =
        data.tier === "studio"
          ? {
              image: data.imageDataUrl,
              scale_factor: 2,
              creativity: 0.2, // locked low — protects brand text/logos for e-commerce.
              resemblance: 1.5,
              dynamic: 6,
              sharpen: 0,
              handfix: "disabled",
              output_format: "png",
            }
          : {
              image: data.imageDataUrl,
              scale: 4,
              face_enhance: false,
            };

      const prediction = await runReplicateModel(modelSlug, input, {
        timeoutMs: data.tier === "studio" ? 180_000 : 120_000,
        version,
      });

      const output = prediction.output;
      const outputUrl =
        typeof output === "string"
          ? output
          : Array.isArray(output) && typeof output[0] === "string"
            ? (output[0] as string)
            : null;

      if (!outputUrl) return { ok: false, reason: "provider_no_output" };

      const resultDataUrl = await fetchAsDataUrl(outputUrl);

      // 3. Admin bypass: no credit consumption.
      if (isAdmin) {
        const credits = await readUserCreditBalance(context.userId);
        return {
          ok: true as const,
          resultDataUrl,
          remainingCredits: credits,
          tier: data.tier,
        };
      }

      // 4. Consume credits atomically only after a usable result.
      const { data: remaining, error: creditErr } = await supabase.rpc("consume_credits", {
        _n: cost,
      });
      if (creditErr) {
        if (creditErr.message?.includes("no_credits")) {
          return { ok: false, reason: "no_credits" };
        }
        console.error("[upscaleImage] credit failed", creditErr);
        return { ok: false, reason: "unknown_error" };
      }

      return {
        ok: true as const,
        resultDataUrl,
        remainingCredits: typeof remaining === "number" ? remaining : Number(remaining),
        tier: data.tier,
      };
    } catch (err) {
      console.error("[upscaleImage] failed", err);
      const message = err instanceof Error ? err.message : "unknown_error";
      const { logFeedback } = await import("./feedback-log.server");
      void logFeedback({
        kind: "ai_error",
        severity: "error",
        source: "upscale",
        title: `Upscale hata: ${message.slice(0, 100)}`,
        detail: message,
        user_id: context.userId,
        metadata: { tier: data.tier },
      });
      if (
        message.includes("402") ||
        message.includes("429") ||
        message.includes("Insufficient credit") ||
        /rate limit|throttled/i.test(message)
      ) {
        return { ok: false, reason: "provider_unavailable" };
      }
      return { ok: false, reason: "unknown_error" };
    }
  });
