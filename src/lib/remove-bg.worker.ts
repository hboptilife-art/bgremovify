import {
  env,
  AutoModel,
  AutoProcessor,
  RawImage,
  type PreTrainedModel,
  type Processor,
} from "@huggingface/transformers";
import { defringeRgba, refineAlpha } from "./alpha-cleanup";


env.allowLocalModels = false;
if (env.backends?.onnx?.wasm) {
  env.backends.onnx.wasm.proxy = false;
  env.backends.onnx.wasm.simd = true;
  // Full capacity: use every available core when threading is allowed.
  env.backends.onnx.wasm.numThreads = self.crossOriginIsolated
    ? Math.min(8, Math.max(2, navigator.hardwareConcurrency || 4))
    : 1;
}

type RemoveBgStage = "model" | "prepare" | "remove" | "apply" | "finalize";
type Loaded = { model: PreTrainedModel; processor: Processor; device: string };
type MaskTensor = { mul: (value: number) => { to: (dtype: "uint8") => Parameters<typeof RawImage.fromTensor>[0] } };
type RemoveBgRequest = { type: "remove-bg/request"; id: string; imageDataUrl: string };
type RemoveBgResponse =
  | { type: "remove-bg/progress"; id: string; stage: RemoveBgStage }
  | { type: "remove-bg/result"; id: string; buffer: ArrayBuffer; mimeType: string }
  | { type: "remove-bg/error"; id: string; error: string };

let modelPromise: Promise<Loaded> | null = null;
const MODEL_LOAD_TIMEOUT_MS = 90_000;
const INFERENCE_TIMEOUT_MS = 45_000;

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timeoutId);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeoutId);
        reject(error);
      },
    );
  });
}

type NavigatorWithGpu = Navigator & { gpu?: { requestAdapter: () => Promise<unknown> } };

async function detectDevice(): Promise<"webgpu" | "wasm"> {
  const gpu = typeof navigator !== "undefined" ? (navigator as NavigatorWithGpu).gpu : undefined;
  if (gpu) {
    const adapter = await withTimeout(gpu.requestAdapter(), 2_500, "webgpu_adapter_timeout").catch(() => null);
    if (!adapter) return "wasm";
    return "webgpu";
  }
  return "wasm";
}

function postResponse(message: RemoveBgResponse) {
  self.postMessage(message);
}

async function getModel(id: string) {
  if (!modelPromise) {
    modelPromise = (async () => {
      try {
        const preferredDevice = await detectDevice();
        const load = async (device: "webgpu" | "wasm") => {
          postResponse({ type: "remove-bg/progress", id, stage: "model" });
          // RMBG-1.4 — açık erişimli (RMBG-2.0 gated/auth gerektiriyor).
          const model = await withTimeout(
            AutoModel.from_pretrained("briaai/RMBG-1.4", {
              // @ts-expect-error custom config not in types
              config: { model_type: "custom" },
              device,
              dtype: device === "webgpu" ? "fp32" : "q8",
            }),
            MODEL_LOAD_TIMEOUT_MS,
            "model_load_timeout",
          );
          return { model, device };
        };
        const loaded = await load(preferredDevice).catch((error) => {
          if (preferredDevice !== "webgpu") throw error;
          console.warn("WebGPU model load failed, falling back to WASM", error);
          return load("wasm");
        });
        const processor = await withTimeout(
          AutoProcessor.from_pretrained("briaai/RMBG-1.4", {
            config: {
              do_normalize: true,
              do_pad: false,
              do_rescale: true,
              do_resize: true,
              image_mean: [0.5, 0.5, 0.5],
              feature_extractor_type: "ImageFeatureExtractor",
              image_std: [1, 1, 1],
              resample: 2,
              rescale_factor: 0.00392156862745098,
              size: { width: 1024, height: 1024 },
            },
          }),
          MODEL_LOAD_TIMEOUT_MS,
          "processor_load_timeout",
        );
        return { model: loaded.model, processor, device: loaded.device };
      } catch (error) {
        modelPromise = null;
        throw error;
      }
    })();
  }

  return modelPromise;
}

async function buildAlphaMask(
  tensor: MaskTensor,
  targetWidth: number,
  targetHeight: number,
) {
  const mask = await RawImage.fromTensor(tensor.mul(255).to("uint8")).resize(targetWidth, targetHeight);
  const source = mask.data;
  const alpha = new Uint8ClampedArray(targetWidth * targetHeight);
  const channels = Math.max(1, Math.round(source.length / Math.max(1, alpha.length)));
  for (let i = 0; i < alpha.length; i++) {
    const p = i * channels;
    // RawImage.fromTensor can return RGB/RGBA mask data where alpha is just
    // bitmap opacity. Use luminance as the foreground mask to avoid blank or
    // vertically striped products after cutout.
    alpha[i] = Number(
      channels >= 3
        ? Math.round(((source[p] ?? 0) + (source[p + 1] ?? 0) + (source[p + 2] ?? 0)) / 3)
        : (source[p] ?? 0),
    );
  }
  return alpha;
}


self.onmessage = async (event: MessageEvent<RemoveBgRequest>) => {
  const message = event.data;
  if (message.type !== "remove-bg/request") return;

  try {
    const { model, processor } = await getModel(message.id);

    postResponse({ type: "remove-bg/progress", id: message.id, stage: "prepare" });
    const inputBlob = await fetch(message.imageDataUrl).then((response) => response.blob());

    // Model girişi zaten 1024px — daha büyüğünü işlemek kalite katmıyor,
    // sadece maske/post-process süresini katlıyor.
    const MAX_DIM = 1024;
    let workBlob = inputBlob;
    try {
      const bitmap = await createImageBitmap(inputBlob);
      const longest = Math.max(bitmap.width, bitmap.height);
      if (longest > MAX_DIM) {
        const scale = MAX_DIM / longest;
        const w = Math.round(bitmap.width * scale);
        const h = Math.round(bitmap.height * scale);
        const c = new OffscreenCanvas(w, h);
        const cctx = c.getContext("2d");
        if (cctx) {
          cctx.imageSmoothingEnabled = true;
          cctx.imageSmoothingQuality = "high";
          cctx.drawImage(bitmap, 0, 0, w, h);
          workBlob = await c.convertToBlob({ type: "image/png" });
        }
      }
      bitmap.close();
    } catch {
      // bitmap yoksa orijinal blob ile devam
    }

    const image = await RawImage.fromBlob(workBlob);
    const { pixel_values } = await processor(image);

    postResponse({ type: "remove-bg/progress", id: message.id, stage: "remove" });
    const { output } = await withTimeout(
      model({ input: pixel_values }) as Promise<{ output: unknown[] }>,
      INFERENCE_TIMEOUT_MS,
      "model_inference_timeout",
    );

    postResponse({ type: "remove-bg/progress", id: message.id, stage: "apply" });
    const width = image.width;
    const height = image.height;
    const rawMask = await buildAlphaMask(output[0] as MaskTensor, width, height);
    const alpha = refineAlpha(rawMask, width, height);



    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("worker result canvas init failed");
    ctx.drawImage(image.toCanvas(), 0, 0);

    const pixelData = ctx.getImageData(0, 0, width, height);
    const data = pixelData.data;
    defringeRgba(data, alpha, width, height);
    for (let i = 0; i < alpha.length; i++) {
      data[4 * i + 3] = alpha[i];
    }
    ctx.putImageData(pixelData, 0, 0);

    postResponse({ type: "remove-bg/progress", id: message.id, stage: "finalize" });
    const pngBlob = await canvas.convertToBlob({ type: "image/png" });
    const buffer = await pngBlob.arrayBuffer();
    postResponse({ type: "remove-bg/result", id: message.id, buffer, mimeType: "image/png" });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown worker error";
    postResponse({ type: "remove-bg/error", id: message.id, error: errorMessage });
  }
};
