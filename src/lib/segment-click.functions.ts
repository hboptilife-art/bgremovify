import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// "Click & Select" via SAM point prompts on Replicate.
// Async/polling design: client calls startSegmentJob to kick off, then polls
// pollSegmentJob every 3-4s until status !== 'pending'. This avoids holding
// the Cloudflare Worker fetch open during long cold starts, which was
// causing "WebSocket closed prematurely" freezes on the UI.

type SamModel = {
  slug: string;
  official: boolean;
  buildInput: (args: { imageDataUrl: string; x: number; y: number }) => Record<string, unknown>;
};

const SAM_MODEL: SamModel = {
  slug: "ocg2347/sam-pointprompt",
  official: false,
  buildInput: ({ imageDataUrl, x, y }) => {
    // Geniş cluster: karmaşık/örtüşen silüetler (arkası dönük kadın, hırka altı vs)
    // tek tıkla çıksın diye 13 nokta — merkez + dikey aşağı zinciri (kafa→göğüs→
    // bel→bacak) + geniş yanal yamaçlar + yukarı doğru bir baş noktası.
    const cx = Math.round(x);
    const cy = Math.round(y);
    const pts: Array<[number, number]> = [
      [cx, cy],
      [cx, cy - 25],           // baş yukarı doğru
      [cx, cy + 30],           // göğüs
      [cx, cy + 60],           // bel
      [cx, cy + 100],          // bacak üstü
      [cx, cy + 150],          // bacak
      [cx - 20, cy + 10],
      [cx + 20, cy + 10],
      [cx - 30, cy + 50],
      [cx + 30, cy + 50],
      [cx - 40, cy + 90],
      [cx + 40, cy + 90],
      [cx, cy + 200],          // ayak bölgesi
    ].map(([px, py]) => [Math.max(0, px), Math.max(0, py)]);
    return {
      image: imageDataUrl,
      input_points: JSON.stringify(pts),
    };
  },
};


const MAX_INPUT_BYTES = 12 * 1024 * 1024;

function assertDataUrl(input: string): void {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/.exec(input);
  if (!match) throw new Error("invalid_image_payload");
  const b64 = match[2];
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  const bytes = Math.floor((b64.length * 3) / 4) - padding;
  if (bytes > MAX_INPUT_BYTES) throw new Error("image_too_large");
}

function pickOutputUrl(output: unknown): string | null {
  if (typeof output === "string") return output;
  if (Array.isArray(output)) {
    for (const item of output) {
      if (typeof item === "string") return item;
      if (item && typeof item === "object") {
        const anyItem = item as Record<string, unknown>;
        if (typeof anyItem.mask === "string") return anyItem.mask;
        if (typeof anyItem.url === "string") return anyItem.url;
      }
    }
  }
  if (output && typeof output === "object") {
    const rec = output as Record<string, unknown>;
    if (typeof rec.mask === "string") return rec.mask;
    if (typeof rec.url === "string") return rec.url;
    if (typeof rec.combined_mask === "string") return rec.combined_mask;
    if (Array.isArray(rec.individual_masks)) {
      for (const item of rec.individual_masks) if (typeof item === "string") return item;
    }
  }
  return null;
}

/**
 * Lightweight warmup — creates a SAM prediction but does NOT poll or write
 * to DB. Keeps the Replicate container hot without incurring polling cost.
 * Used by the workspace mount + every 25s keepalive interval.
 */
export const warmupSamModel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<{ ok: true }> => {
    const DUMMY_PNG =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAF0lEQVR4nGNgYGD4z0AEYBxVSF+FAAmmAQd0K2rEAAAAAElFTkSuQmCC";
    try {
      const { createReplicatePrediction } = await import("./replicate.server");
      await createReplicatePrediction(
        SAM_MODEL.slug,
        SAM_MODEL.buildInput({ imageDataUrl: DUMMY_PNG, x: 4, y: 4 }),
        { official: SAM_MODEL.official },
      );
    } catch {
      /* fire-and-forget */
    }
    return { ok: true };
  });

/**
 * Kick off a SAM segmentation. Returns immediately with a jobId.
 * Client polls pollSegmentJob until it resolves.
 */
export const startSegmentJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { imageDataUrl: string; x: number; y: number }) => {
    const url = String(input?.imageDataUrl ?? "");
    assertDataUrl(url);
    const x = Number(input?.x);
    const y = Number(input?.y);
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0) {
      throw new Error("invalid_click_coordinates");
    }
    return { imageDataUrl: url, x, y };
  })
  .handler(async ({ data, context }): Promise<
    { ok: true; jobId: string } | { ok: false; reason: "provider_unavailable" | "unknown_error"; detail?: string }
  > => {
    const { createReplicatePrediction } = await import("./replicate.server");
    try {
      const prediction = await createReplicatePrediction(
        SAM_MODEL.slug,
        SAM_MODEL.buildInput({ imageDataUrl: data.imageDataUrl, x: data.x, y: data.y }),
        { official: SAM_MODEL.official },
      );
      console.info("[startSegmentJob] created", {
        prediction_id: prediction.id,
        Target_X: Math.round(data.x),
        Target_Y: Math.round(data.y),
      });
      const { data: row, error } = await context.supabase
        .from("inference_jobs")
        .insert({
          user_id: context.userId,
          prediction_id: prediction.id,
          kind: "segment",
          engine: SAM_MODEL.slug,
          cost: 0,
          status: "pending",
        })
        .select("id")
        .single();
      if (error || !row) {
        console.error("[startSegmentJob] db insert failed", error);
        return { ok: false, reason: "unknown_error", detail: error?.message };
      }
      return { ok: true, jobId: row.id };
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown";
      console.error("[startSegmentJob] failed", message);
      if (/rate limit|429|throttled/i.test(message)) {
        return { ok: false, reason: "provider_unavailable", detail: message };
      }
      return { ok: false, reason: "unknown_error", detail: message };
    }
  });

/**
 * Poll a segmentation job. Returns { status: 'pending' } while running,
 * or the final mask on success.
 */
export const pollSegmentJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { jobId: string }) => ({ jobId: String(input?.jobId ?? "") }))
  .handler(async ({ data, context }): Promise<
    | { status: "pending" }
    | { status: "done"; ok: true; maskDataUrl: string; remainingCredits: number; model: string }
    | { status: "done"; ok: false; reason: "provider_no_output" | "provider_unavailable" | "unknown_error" | "no_credits"; detail?: string }
  > => {
    const { supabase } = context;
    const { data: job, error } = await supabase
      .from("inference_jobs")
      .select("id,prediction_id,status,engine,error")
      .eq("id", data.jobId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error || !job) {
      return { status: "done", ok: false, reason: "unknown_error", detail: "job_not_found" };
    }

    const { getReplicatePrediction, fetchAsDataUrl } = await import("./replicate.server");
    const { readUserCreditBalance } = await import("./billing-admin.server");

    let prediction;
    try {
      prediction = await getReplicatePrediction(job.prediction_id);
    } catch (err) {
      console.warn("[pollSegmentJob] poll error", err);
      return { status: "pending" };
    }

    if (prediction.status === "starting" || prediction.status === "processing") {
      return { status: "pending" };
    }

    if (prediction.status !== "succeeded") {
      await supabase.from("inference_jobs").update({
        status: "failed",
        error: prediction.error ?? prediction.status,
      }).eq("id", job.id);
      return {
        status: "done",
        ok: false,
        reason: "provider_no_output",
        detail: prediction.error ?? prediction.status,
      };
    }

    const outputUrl = pickOutputUrl(prediction.output);
    if (!outputUrl) {
      await supabase.from("inference_jobs").update({ status: "failed", error: "no_output" }).eq("id", job.id);
      return { status: "done", ok: false, reason: "provider_no_output" };
    }

    try {
      const maskDataUrl = await fetchAsDataUrl(outputUrl);
      await supabase.from("inference_jobs").update({ status: "succeeded" }).eq("id", job.id);
      const credits = await readUserCreditBalance(context.userId).catch(() => 0);
      return { status: "done", ok: true, maskDataUrl, remainingCredits: credits, model: job.engine };
    } catch (err) {
      console.error("[pollSegmentJob] fetch mask failed", err);
      return { status: "done", ok: false, reason: "unknown_error" };
    }
  });
