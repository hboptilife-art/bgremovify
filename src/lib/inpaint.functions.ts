import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// AI Inpainting — motorlar:
//  - "remove"    (Red, 1 kredi)  — Fırça: BRIA Eraser (temiz büyük alan). SAM: LaMa (zylim0702, hızlı ufak nesne).
//  - "aesthetic" (Blue, 1 kredi) — CodeFormer yüz rötuşu.
//  - "magic"     (Purple, 2 kredi) — SDXL Inpainting, prompt destekli hızlı doldurma.
// Admin sandbox (mock=true) Replicate'i atlar.

const MAX_INPUT_BYTES = 12 * 1024 * 1024;
const CODEFORMER_MODEL = "sczhou/codeformer";
// `cjwbw/lama` was removed from Replicate (404). `zylim0702/remove-object`
// is a LaMa-based inpainter with the same { image, mask } interface — used
// after SAM click-select where the mask is tight & object-shaped.
const LAMA_MODEL = "zylim0702/remove-object";
// BRIA Eraser — official model, best-in-class for large brush-painted areas
// (group photos, hands, complex crowds). ~$0.04/img, ~5-10s warm.
const BRIA_MODEL = "bria/eraser";
// SDXL inpainting — serverless, ~3-5 sn cold start.
const SDXL_INPAINT_MODEL = "lucataco/sdxl-inpainting";

// Kredi katsayıları — sağlayıcı maliyeti / paket kredi değeri ($0.10/kredi) oranına göre.
// bria/eraser ~$0.04/call → 2 kredi (=$0.20, ~80% marj)
// codeformer ~$0.01/call → 1 kredi (=$0.10, ~90% marj)
// sdxl-inpaint ~$0.02/call → 2 kredi (=$0.20, ~90% marj)
const COST_REMOVE = 2;
const COST_AESTHETIC = 1;
const COST_MAGIC = 2;

// 8x8 dummy image + mask for cold-start warmup pings.
const DUMMY_IMG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAF0lEQVR4nGNgYGD4z0AEYBxVSF+FAAmmAQd0K2rEAAAAAElFTkSuQmCC";
const DUMMY_MASK =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAF0lEQVR4nGNgYGD4z8DAwMDEwMDwHwAEAgH/1SqgTgAAAABJRU5ErkJggg==";

// Fire-and-forget warmup: hits Replicate to spin up cold containers for the
// inpaint models (LaMa + BRIA + SDXL) so the user's first real request doesn't
// eat the 60-150s cold-start wall. Does NOT poll, does NOT charge credits.
export const warmupInpaintModels = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { engines?: Array<"lama" | "bria" | "sdxl-inpaint"> }) => ({
    engines: Array.isArray(input?.engines) && input.engines.length > 0
      ? input.engines
      : (["lama", "bria"] as Array<"lama" | "bria" | "sdxl-inpaint">),
  }))
  .handler(async ({ data }): Promise<{ ok: true; warmed: string[] }> => {
    const { createReplicatePrediction } = await import("./replicate.server");
    const warmed: string[] = [];
    await Promise.all(
      data.engines.map(async (engine) => {
        try {
          if (engine === "lama") {
            await createReplicatePrediction(
              LAMA_MODEL,
              { image: DUMMY_IMG, mask: DUMMY_MASK },
              { official: false },
            );
          } else if (engine === "bria") {
            await createReplicatePrediction(
              BRIA_MODEL,
              { image: DUMMY_IMG, mask: DUMMY_MASK, sync: false },
              { official: true },
            );
          } else {
            await createReplicatePrediction(
              SDXL_INPAINT_MODEL,
              {
                image: DUMMY_IMG,
                mask: DUMMY_MASK,
                prompt: "warmup",
                num_inference_steps: 1,
              },
              { official: false },
            );
          }
          warmed.push(engine);
        } catch (err) {
          console.warn("[warmupInpaintModels] failed", engine, err);
        }
      }),
    );
    return { ok: true, warmed };
  });


type InpaintMode = "remove" | "aesthetic" | "magic";

type InpaintResult =
  | {
      ok: true;
      resultDataUrl: string;
      maskDataUrl: string; // exact mask AI was allowed to touch (for client-side strict compositing)
      remainingCredits: number;
      expanded: boolean; // true if smart expansion generated a larger repair mask
      engine: "lama" | "bria" | "codeformer" | "sdxl-inpaint";

      creditsCharged: number;
    }
  | {
      ok: false;
      reason:
        | "no_credits"
        | "provider_unavailable"
        | "provider_no_output"
        | "image_too_large"
        | "invalid_image_payload"
        | "prompt_required"
        | "unknown_error";
      detail?: string;
    };

function assertDataUrl(input: string): void {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/.exec(input);
  if (!match) throw new Error("invalid_image_payload");
  const b64 = match[2];
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  const bytes = Math.floor((b64.length * 3) / 4) - padding;
  if (bytes > MAX_INPUT_BYTES) throw new Error("image_too_large");
}

export const inpaintRemoveObject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    imageDataUrl: string;
    maskDataUrl: string;
    mode?: InpaintMode;
    smartExpand?: boolean;
    point?: { x: number; y: number } | null;
    prompt?: string;
    maskPixels?: number;
    imagePixels?: number;
    imageWidth?: number;
    imageHeight?: number;
    source?: "ai" | "brush";
    mock?: boolean;
  }) => {
    const image = String(input?.imageDataUrl ?? "");
    const mask = String(input?.maskDataUrl ?? "");
    assertDataUrl(image);
    assertDataUrl(mask);
    const mode: InpaintMode =
      input?.mode === "aesthetic" ? "aesthetic" : input?.mode === "magic" ? "magic" : "remove";
    const point =
      input?.point &&
      Number.isFinite(input.point.x) &&
      Number.isFinite(input.point.y) &&
      input.point.x >= 0 &&
      input.point.y >= 0
        ? { x: Number(input.point.x), y: Number(input.point.y) }
        : null;
    return {
      imageDataUrl: image,
      maskDataUrl: mask,
      mode,
      smartExpand: Boolean(input?.smartExpand) && mode === "remove" && !!point,
      point,
      prompt: typeof input?.prompt === "string" ? input.prompt.slice(0, 500) : "",
      maskPixels: Number.isFinite(input?.maskPixels) ? Math.max(0, Number(input?.maskPixels)) : 0,
      imagePixels: Number.isFinite(input?.imagePixels) ? Math.max(0, Number(input?.imagePixels)) : 0,
      imageWidth: Number.isFinite(input?.imageWidth) ? Math.max(1, Math.round(Number(input.imageWidth))) : undefined,
      imageHeight: Number.isFinite(input?.imageHeight) ? Math.max(1, Math.round(Number(input.imageHeight))) : undefined,
      source: input?.source === "brush" ? "brush" : "ai",
      mock: Boolean(input?.mock),
    };
  })
  .handler(async ({ data, context }): Promise<InpaintResult> => {
    const { supabase } = context;

    // Magic mode requires a non-empty prompt.
    if (data.mode === "magic" && !data.prompt.trim()) {
      return { ok: false, reason: "prompt_required" };
    }

    const maskRatio =
      data.imagePixels > 0 && data.maskPixels > 0 ? data.maskPixels / data.imagePixels : 1;

    // Remove mode → BRIA Eraser (aynı temizleme motoru hem fırça hem tıkla-seç için).
    const engine: "lama" | "bria" | "codeformer" | "sdxl-inpaint" =
      data.mode === "aesthetic"
        ? "codeformer"
        : data.mode === "magic"
          ? "sdxl-inpaint"
          : "bria";


    const cost =
      engine === "codeformer"
        ? COST_AESTHETIC
        : engine === "sdxl-inpaint"
          ? COST_MAGIC
          : COST_REMOVE;


    const { isBillingAdminUser, readUserCreditBalance } = await import("./billing-admin.server");
    const isAdmin = await isBillingAdminUser(context.userId);

    console.info("[inpaintRemoveObject] request", {
      userId: context.userId,
      mode: data.mode,
      source: data.source,
      engine,
      cost,
      maskRatio: Number(maskRatio.toFixed(4)),
      isAdmin: !!isAdmin,
      mock: data.mock,
      smartExpand: data.smartExpand,
    });

    if (isAdmin && data.mock) {
      return {
        ok: true as const,
        resultDataUrl: data.imageDataUrl,
        maskDataUrl: data.maskDataUrl,
        remainingCredits: 9999,
        expanded: false,
        engine,
        creditsCharged: 0,
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

    const { expandMaskLocally, padPaintedMask, normalizeMaskToImage, refineMaskForInpaint } = await import("./inpaint-mask.server");

    // Optionally expand the brush touch into a larger object/person repair mask.
    let repairMask = data.maskDataUrl;
    let expanded = false;
    if (data.smartExpand && data.point) {
      const expandedMask = await expandMaskLocally(data.maskDataUrl, data.point);
      if (expandedMask) {
        repairMask = expandedMask;
        expanded = true;
      }
    }

    // Replicate inpaint (LaMa/BRIA/SDXL) modelleri image + mask boyutlarının
    // aynı olmasını bekliyor. Normalize et + clean PNG re-encode. Sonra
    // dilate + feather ile SAM/fırça kenarlarının ghost bırakmasını engelle.
    if (engine === "bria" || engine === "sdxl-inpaint") {
      const normalized = normalizeMaskToImage(
        data.imageDataUrl,
        repairMask,
        data.imageWidth && data.imageHeight ? { width: data.imageWidth, height: data.imageHeight } : null,
      );
      if (normalized) repairMask = normalized;
      // SAM (ai) maskeleri milimetrik dar çıkıyor → kenarda renk artığı bırakmasın
      // diye 48px dilate — kaçan giysi çapağı BRIA'nın "insan uydurma" hallüsinasyonunu
      // tetikliyordu. Manuel fırça zaten kalın boyandığından 8px yeterli.
      const dilatePx = data.source === "ai" ? 48 : 8;
      const refined = refineMaskForInpaint(repairMask, { dilatePx, featherPx: 3 });
      if (refined) repairMask = refined;
    }


    const { runReplicateModel, runReplicateOfficialModel, fetchAsDataUrl } = await import("./replicate.server");

    try {
      const prediction =
        engine === "bria"
          ? await runReplicateOfficialModel(
              BRIA_MODEL,
              {
                image_url: data.imageDataUrl,
                mask_url: repairMask,
                sync: true,
              },
              { timeoutMs: 180_000 },
            )
          : engine === "sdxl-inpaint"
            ? await runReplicateModel(

                  SDXL_INPAINT_MODEL,
                  {
                    image: data.imageDataUrl,
                    mask: repairMask,
                    prompt: data.prompt,
                    negative_prompt: "blurry, distorted, low quality, deformed",
                    num_inference_steps: 25,
                    guidance_scale: 8,
                    strength: 0.99,
                  },
                  { timeoutMs: 180_000 },
                )
              : await runReplicateModel(
                  CODEFORMER_MODEL,
                  {
                    image: data.imageDataUrl,
                    codeformer_fidelity: 0.7,
                    background_enhance: false,
                    face_upsample: false,
                    upscale: 1,
                  },
                  { timeoutMs: 180_000 },
                );


      const output = prediction.output;
      const outputUrl =
        typeof output === "string"
          ? output
          : Array.isArray(output) && typeof output[0] === "string"
            ? (output[0] as string)
            : null;
      if (!outputUrl) return { ok: false, reason: "provider_no_output" };

      const resultDataUrl = await fetchAsDataUrl(outputUrl);

      if (isAdmin) {
        const credits = await readUserCreditBalance(context.userId);
        return {
          ok: true as const,
          resultDataUrl,
          maskDataUrl: repairMask,
          remainingCredits: credits,
          expanded,
          engine,
          creditsCharged: 0,
        };
      }

      const { data: remaining, error: creditErr } = await supabase.rpc("consume_credits", {
        _n: cost,
      });
      if (creditErr) {
        if (creditErr.message?.includes("no_credits")) {
          return { ok: false, reason: "no_credits" };
        }
        console.error("[inpaintRemoveObject] credit failed", creditErr);
        return { ok: false, reason: "unknown_error" };
      }

      return {
        ok: true as const,
        resultDataUrl,
        maskDataUrl: repairMask,
        remainingCredits: typeof remaining === "number" ? remaining : Number(remaining),
        expanded,
        engine,
        creditsCharged: cost,
      };
    } catch (err) {
      console.error("[inpaintRemoveObject] failed", err);
      const message = err instanceof Error ? err.message : "unknown_error";
      const { logFeedback } = await import("./feedback-log.server");
      void logFeedback({
        kind: "ai_error",
        severity: "error",
        source: "inpaint",
        title: `Inpaint hata (${engine}): ${message.slice(0, 100)}`,
        detail: message,
        user_id: context.userId,
      });
      if (
        message.includes("402") ||
        message.includes("429") ||
        message.includes("Insufficient credit") ||
        /rate limit|throttled/i.test(message)
      ) {
        return { ok: false, reason: "provider_unavailable", detail: message };
      }
      return { ok: false, reason: "unknown_error", detail: message };
    }
  });

// ──────────────────────────────────────────────────────────────────────────
// Async / polling variant used by object-removal.tsx to survive Replicate
// cold starts (~50-90s) without holding the Cloudflare Worker fetch open.
// startInpaintJob → returns { jobId } immediately after Replicate ACKs.
// pollInpaintJob → non-blocking status check + credit charge on success.
// ──────────────────────────────────────────────────────────────────────────

interface InpaintJobMeta {
  mask: string;         // exact/expanded mask AI was allowed to touch
  expanded: boolean;
  mode: InpaintMode;
  engine: "lama" | "bria" | "codeformer" | "sdxl-inpaint";
  cost: number;
  isAdminMock: boolean;
}

export const startInpaintJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    imageDataUrl: string;
    maskDataUrl: string;
    mode?: InpaintMode;
    smartExpand?: boolean;
    point?: { x: number; y: number } | null;
    prompt?: string;
    maskPixels?: number;
    imagePixels?: number;
    imageWidth?: number;
    imageHeight?: number;
    source?: "ai" | "brush";
    mock?: boolean;
  }) => {
    const image = String(input?.imageDataUrl ?? "");
    const mask = String(input?.maskDataUrl ?? "");
    assertDataUrl(image);
    assertDataUrl(mask);
    const mode: InpaintMode =
      input?.mode === "aesthetic" ? "aesthetic" : input?.mode === "magic" ? "magic" : "remove";
    const point =
      input?.point &&
      Number.isFinite(input.point.x) &&
      Number.isFinite(input.point.y) &&
      input.point.x >= 0 &&
      input.point.y >= 0
        ? { x: Number(input.point.x), y: Number(input.point.y) }
        : null;
    return {
      imageDataUrl: image,
      maskDataUrl: mask,
      mode,
      smartExpand: Boolean(input?.smartExpand) && mode === "remove" && !!point,
      point,
      prompt: typeof input?.prompt === "string" ? input.prompt.slice(0, 500) : "",
      maskPixels: Number.isFinite(input?.maskPixels) ? Math.max(0, Number(input?.maskPixels)) : 0,
      imagePixels: Number.isFinite(input?.imagePixels) ? Math.max(0, Number(input?.imagePixels)) : 0,
      imageWidth: Number.isFinite(input?.imageWidth) ? Math.max(1, Math.round(Number(input.imageWidth))) : undefined,
      imageHeight: Number.isFinite(input?.imageHeight) ? Math.max(1, Math.round(Number(input.imageHeight))) : undefined,
      source: input?.source === "brush" ? "brush" : "ai",
      mock: Boolean(input?.mock),
    };
  })
  .handler(async ({ data, context }): Promise<
    | { ok: true; jobId: string; engine: string; cost: number; expanded: boolean; mockResultDataUrl?: string }
    | { ok: false; reason: "no_credits" | "prompt_required" | "provider_unavailable" | "invalid_image_payload" | "image_too_large" | "unknown_error"; detail?: string }
  > => {
    const { supabase } = context;

    if (data.mode === "magic" && !data.prompt.trim()) {
      return { ok: false, reason: "prompt_required" };
    }

    const maskRatio =
      data.imagePixels > 0 && data.maskPixels > 0 ? data.maskPixels / data.imagePixels : 1;

    // Fırça (brush) modu → BRIA Eraser (temiz büyük alan silme).
    // Remove mode → BRIA Eraser (aynı temizleme motoru hem fırça hem tıkla-seç için).
    const engine: InpaintJobMeta["engine"] =
      data.mode === "aesthetic"
        ? "codeformer"
        : data.mode === "magic"
          ? "sdxl-inpaint"
          : "bria";


    const cost =
      engine === "codeformer"
        ? COST_AESTHETIC
        : engine === "sdxl-inpaint"
          ? COST_MAGIC
          : COST_REMOVE;


    const { isBillingAdminUser } = await import("./billing-admin.server");
    const isAdmin = await isBillingAdminUser(context.userId);

    if (!isAdmin) {
      const { data: row } = await supabase
        .from("user_credits")
        .select("credits")
        .eq("user_id", context.userId)
        .maybeSingle();
      const available = typeof row?.credits === "number" ? row.credits : 0;
      if (available < cost) return { ok: false, reason: "no_credits" };
    }

    // Admin sandbox: return image as-is, no Replicate call.
    if (isAdmin && data.mock) {
      const meta: InpaintJobMeta = {
        mask: data.maskDataUrl,
        expanded: false,
        mode: data.mode,
        engine,
        cost,
        isAdminMock: true,
      };
      const { data: row, error } = await supabase
        .from("inference_jobs")
        .insert({
          user_id: context.userId,
          prediction_id: `mock_${Date.now()}`,
          kind: "inpaint",
          engine,
          cost,
          status: "succeeded",
          mask_data: JSON.stringify(meta),
          is_admin_mock: true,
          result_data_url: data.imageDataUrl,
        })
        .select("id")
        .single();
      if (error || !row) return { ok: false, reason: "unknown_error", detail: error?.message };
      return { ok: true, jobId: row.id, engine, cost, expanded: false, mockResultDataUrl: data.imageDataUrl };
    }

    const { expandMaskLocally, padPaintedMask, normalizeMaskToImage, refineMaskForInpaint } = await import("./inpaint-mask.server");

    let repairMask = data.maskDataUrl;
    let expanded = false;
    if (data.smartExpand && data.point) {
      const expandedMask = await expandMaskLocally(data.maskDataUrl, data.point);
      if (expandedMask) {
        repairMask = expandedMask;
        expanded = true;
      }
    }
    // LaMa/BRIA/SDXL tight mask ile daha iyi çalışır — pad etmiyoruz.
    // Ancak model image ile mask dims TAM eşleşmezse tensor hatası atıyor.
    // Mask'i image boyutlarına normalize et + clean PNG re-encode.
    if (engine === "bria" || engine === "sdxl-inpaint") {
      const normalized = normalizeMaskToImage(
        data.imageDataUrl,
        repairMask,
        data.imageWidth && data.imageHeight ? { width: data.imageWidth, height: data.imageHeight } : null,
      );
      if (normalized) repairMask = normalized;
      // SAM (ai) maskeleri milimetrik dar çıkıyor → kenarda renk artığı bırakmasın
      // diye 48px dilate — kaçan giysi çapağı BRIA'nın "insan uydurma" hallüsinasyonunu
      // tetikliyordu. Manuel fırça zaten kalın boyandığından 8px yeterli.
      const dilatePx = data.source === "ai" ? 48 : 8;
      const refined = refineMaskForInpaint(repairMask, { dilatePx, featherPx: 3 });
      if (refined) repairMask = refined;
    }

    const { createReplicatePrediction } = await import("./replicate.server");

    let predictionId: string;
    try {
      const pred =
        engine === "bria"
          ? await createReplicatePrediction(
              BRIA_MODEL,
              { image_url: data.imageDataUrl, mask_url: repairMask, sync: false },
              { official: true },
            )

            : engine === "sdxl-inpaint"
              ? await createReplicatePrediction(
                  SDXL_INPAINT_MODEL,
                  {
                    image: data.imageDataUrl,
                    mask: repairMask,
                    prompt: data.prompt,
                    negative_prompt: "blurry, distorted, low quality, deformed",
                    num_inference_steps: 25,
                    guidance_scale: 8,
                    strength: 0.99,
                  },
                  { official: false },
                )
              : await createReplicatePrediction(
                  CODEFORMER_MODEL,
                  { image: data.imageDataUrl, codeformer_fidelity: 0.7, background_enhance: false, face_upsample: false, upscale: 1 },
                  { official: false },
                );

      predictionId = pred.id;
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown";
      console.error("[startInpaintJob] create failed", message);
      if (/rate limit|429|throttled|Insufficient credit|402/i.test(message)) {
        return { ok: false, reason: "provider_unavailable", detail: message };
      }
      return { ok: false, reason: "unknown_error", detail: message };
    }

    const meta: InpaintJobMeta = { mask: repairMask, expanded, mode: data.mode, engine, cost, isAdminMock: false };
    const { data: row, error } = await supabase
      .from("inference_jobs")
      .insert({
        user_id: context.userId,
        prediction_id: predictionId,
        kind: "inpaint",
        engine,
        cost,
        status: "pending",
        mask_data: JSON.stringify(meta),
        is_admin_mock: false,
      })
      .select("id")
      .single();
    if (error || !row) {
      console.error("[startInpaintJob] db insert failed", error);
      return { ok: false, reason: "unknown_error", detail: error?.message };
    }

    console.info("[startInpaintJob] created", { jobId: row.id, prediction_id: predictionId, engine, cost, expanded });
    return { ok: true, jobId: row.id, engine, cost, expanded };
  });

export const pollInpaintJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { jobId: string }) => ({ jobId: String(input?.jobId ?? "") }))
  .handler(async ({ data, context }): Promise<
    | { status: "pending"; elapsedMs: number }
    | { status: "done"; ok: true; resultDataUrl: string; maskDataUrl: string; remainingCredits: number; expanded: boolean; engine: string; creditsCharged: number }
    | { status: "done"; ok: false; reason: "provider_no_output" | "provider_unavailable" | "no_credits" | "unknown_error"; detail?: string }
  > => {
    const { supabase } = context;
    const { data: job, error } = await supabase
      .from("inference_jobs")
      .select("id,prediction_id,status,engine,cost,mask_data,is_admin_mock,credits_charged,result_data_url,created_at,error")
      .eq("id", data.jobId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error || !job) {
      return { status: "done", ok: false, reason: "unknown_error", detail: "job_not_found" };
    }

    const meta: InpaintJobMeta = job.mask_data ? JSON.parse(job.mask_data) : { mask: "", expanded: false, mode: "remove", engine: "bria", cost: 0, isAdminMock: false };
    const elapsedMs = Date.now() - new Date(job.created_at).getTime();

    const { readUserCreditBalance } = await import("./billing-admin.server");

    // Admin mock terminates immediately.
    if (job.is_admin_mock && job.status === "succeeded" && job.result_data_url) {
      const credits = await readUserCreditBalance(context.userId).catch(() => 9999);
      return {
        status: "done", ok: true,
        resultDataUrl: job.result_data_url,
        maskDataUrl: meta.mask,
        remainingCredits: credits,
        expanded: meta.expanded,
        engine: meta.engine,
        creditsCharged: 0,
      };
    }

    // Already finalized (e.g. reconnect).
    if (job.status === "succeeded" && job.result_data_url) {
      const credits = await readUserCreditBalance(context.userId).catch(() => 0);
      return {
        status: "done", ok: true,
        resultDataUrl: job.result_data_url,
        maskDataUrl: meta.mask,
        remainingCredits: credits,
        expanded: meta.expanded,
        engine: meta.engine,
        creditsCharged: job.credits_charged ?? 0,
      };
    }
    if (job.status === "failed") {
      return { status: "done", ok: false, reason: "provider_no_output", detail: job.error ?? "failed" };
    }

    const { getReplicatePrediction, fetchAsDataUrl } = await import("./replicate.server");
    let prediction;
    try {
      prediction = await getReplicatePrediction(job.prediction_id);
    } catch (err) {
      console.warn("[pollInpaintJob] poll error", err);
      return { status: "pending", elapsedMs };
    }

    if (prediction.status === "starting" || prediction.status === "processing") {
      return { status: "pending", elapsedMs };
    }

    if (prediction.status !== "succeeded") {
      await supabase.from("inference_jobs")
        .update({ status: "failed", error: prediction.error ?? prediction.status })
        .eq("id", job.id);
      return { status: "done", ok: false, reason: "provider_no_output", detail: prediction.error ?? prediction.status };
    }

    const output = prediction.output;
    const outputUrl =
      typeof output === "string"
        ? output
        : Array.isArray(output) && typeof output[0] === "string"
          ? (output[0] as string)
          : null;
    if (!outputUrl) {
      await supabase.from("inference_jobs").update({ status: "failed", error: "no_output" }).eq("id", job.id);
      return { status: "done", ok: false, reason: "provider_no_output" };
    }

    let resultDataUrl: string;
    try {
      resultDataUrl = await fetchAsDataUrl(outputUrl);
    } catch (err) {
      console.error("[pollInpaintJob] fetch result failed", err);
      return { status: "done", ok: false, reason: "unknown_error" };
    }

    const { isBillingAdminUser } = await import("./billing-admin.server");
    const isAdmin = await isBillingAdminUser(context.userId);

    let charged = 0;
    let remaining = 0;
    if (isAdmin) {
      remaining = await readUserCreditBalance(context.userId).catch(() => 9999);
    } else {
      const { data: rpcRemaining, error: creditErr } = await supabase.rpc("consume_credits", { _n: meta.cost });
      if (creditErr) {
        console.error("[pollInpaintJob] credit failed", creditErr);
        if (creditErr.message?.includes("no_credits")) {
          await supabase.from("inference_jobs").update({ status: "failed", error: "no_credits" }).eq("id", job.id);
          return { status: "done", ok: false, reason: "no_credits" };
        }
        return { status: "done", ok: false, reason: "unknown_error" };
      }
      charged = meta.cost;
      remaining = typeof rpcRemaining === "number" ? rpcRemaining : Number(rpcRemaining);
    }

    await supabase.from("inference_jobs")
      .update({ status: "succeeded", result_data_url: resultDataUrl, credits_charged: charged })
      .eq("id", job.id);

    return {
      status: "done", ok: true,
      resultDataUrl,
      maskDataUrl: meta.mask,
      remainingCredits: remaining,
      expanded: meta.expanded,
      engine: meta.engine,
      creditsCharged: charged,
    };
  });

