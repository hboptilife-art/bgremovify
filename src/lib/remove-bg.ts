// Background removal — LOCAL ONLY.
// -----------------------------------------------------------------------------
// Pipeline (deterministic, no self-loops, no auto-retries, no credit burn):
//   1. Web Worker + RMBG-1.4 (HF transformers) — the single production path.
//   2. Inline WASM only when the browser cannot create the worker at all.
//
// There is NO Replicate / server-side fallback for background removal.
// Replicate is only used for upscale, click-to-select segmentation and inpaint
// (see upscale.functions.ts, segment-click.functions.ts, inpaint.functions.ts).
// Do not reintroduce a `remove-bg-*.functions.ts` server path — it burned
// credits in loops and was intentionally removed.
export type RemoveBgStage = "model" | "prepare" | "remove" | "apply" | "finalize";


type ProgressCallback = (stage: RemoveBgStage) => void;
type PendingRequest = {
  resolve: (blob: Blob) => void;
  reject: (error: Error) => void;
  onProgress?: ProgressCallback;
  timeoutId: number;
};
type WorkerResponse =
  | { type: "remove-bg/progress"; id: string; stage: RemoveBgStage }
  | { type: "remove-bg/result"; id: string; buffer: ArrayBuffer; mimeType: string }
  | { type: "remove-bg/error"; id: string; error: string };

let worker: Worker | null = null;
let workerRequestId = 0;
const pending = new Map<string, PendingRequest>();
const WORKER_REQUEST_TIMEOUT_MS = 120_000;

function supportsWorkerRemoval() {
  return (
    typeof window !== "undefined" &&
    typeof Worker !== "undefined" &&
    typeof OffscreenCanvas !== "undefined" &&
    typeof createImageBitmap !== "undefined"
  );
}

function cleanupWorker(error?: Error) {
  if (error) {
    for (const request of pending.values()) {
      window.clearTimeout(request.timeoutId);
      request.reject(error);
    }
    pending.clear();
  }

  if (worker) {
    worker.terminate();
    worker = null;
  }
}

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL("./remove-bg.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const message = event.data;
      const request = pending.get(message.id);
      if (!request) return;

      if (message.type === "remove-bg/progress") {
        request.onProgress?.(message.stage);
        return;
      }

      pending.delete(message.id);
      window.clearTimeout(request.timeoutId);

      if (message.type === "remove-bg/result") {
        request.resolve(new Blob([message.buffer], { type: message.mimeType }));
        return;
      }

      request.reject(new Error(message.error));
      cleanupWorker();
    };
    worker.onerror = () => {
      cleanupWorker(new Error("Worker processing failed"));
    };
    worker.onmessageerror = () => {
      cleanupWorker(new Error("Worker message failed"));
    };
  }

  return worker;
}

async function removeBackgroundWithWorker(imageDataUrl: string, onProgress?: ProgressCallback) {
  return await new Promise<Blob>((resolve, reject) => {
    const id = `bg-${++workerRequestId}`;
    let settled = false;
    const timeoutId = window.setTimeout(() => {
      const request = pending.get(id);
      if (!request) return;
      if (settled) return;
      pending.delete(id);
      request.reject(new Error("worker_timeout"));
      cleanupWorker(new Error("worker_timeout"));
    }, WORKER_REQUEST_TIMEOUT_MS);
    pending.set(id, {
      resolve: (blob) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeoutId);
        resolve(blob);
      },
      reject: (error) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeoutId);
        reject(error);
      },
      onProgress,
      timeoutId,
    });
    try {
      getWorker().postMessage({ type: "remove-bg/request", id, imageDataUrl });
    } catch (error) {
      pending.delete(id);
      window.clearTimeout(timeoutId);
      settled = true;
      reject(error instanceof Error ? error : new Error("Worker start failed"));
    }
  });
}

export async function removeBackground(
  imageDataUrl: string,
  onProgress?: ProgressCallback,
): Promise<Blob> {
  // Keep the heavy model load/inference off React's main thread. The worker can
  // still use WebGPU when available, but a GPU/wasm stall can no longer freeze
  // the UI into the silent "Waiting" state.
  if (supportsWorkerRemoval()) {
    return await removeBackgroundWithWorker(imageDataUrl, onProgress);
  }

  const { removeBackgroundInline } = await import("./remove-bg.inline");
  return await removeBackgroundInline(imageDataUrl, onProgress);
}