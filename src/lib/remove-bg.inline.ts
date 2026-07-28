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
  env.backends.onnx.wasm.numThreads = self.crossOriginIsolated
    ? Math.min(8, Math.max(2, navigator.hardwareConcurrency || 4))
    : 1;
}

type RemoveBgStage = "model" | "prepare" | "remove" | "apply" | "finalize";
type Loaded = { model: PreTrainedModel; processor: Processor; device: string };
type MaskTensor = { mul: (value: number) => { to: (dtype: "uint8") => Parameters<typeof RawImage.fromTensor>[0] } };

let modelPromise: Promise<Loaded> | null = null;
const MODEL_LOAD_TIMEOUT_MS = 90_000;
const INFERENCE_TIMEOUT_MS = 45_000;

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timeoutId);
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

async function getModel(onProgress?: (stage: RemoveBgStage) => void) {
  if (!modelPromise) {
    modelPromise = (async () => {
      try {
        const preferredDevice = await detectDevice();
        const load = async (device: "webgpu" | "wasm") => {
          onProgress?.("model");
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
    // RawImage.fromTensor can materialize a mask as RGB/RGBA where the alpha
    // channel is only image opacity, not the semantic foreground mask. Reading
    // channel 3 produced empty/full/striped cutouts on some browsers. Use the
    // luminance channel(s) as the actual mask value instead.
    alpha[i] = Number(
      channels >= 3
        ? Math.round(((source[p] ?? 0) + (source[p + 1] ?? 0) + (source[p + 2] ?? 0)) / 3)
        : (source[p] ?? 0),
    );
  }
  return alpha;
}




export async function removeBackgroundInline(
  imageDataUrl: string,
  onProgress?: (stage: RemoveBgStage) => void,
): Promise<Blob> {
  // Sadece UI'ın bir kare nefes alması için mikro-yield; suni gecikme yok.
  const yieldToUi = () => Promise.resolve();

  const { model, processor } = await getModel(onProgress);

  onProgress?.("prepare");

  // Model girişi 1024px — daha büyüğü kalite katmadan süreyi katlıyor.
  const MAX_DIM = 1024;
  let workUrl = imageDataUrl;
  try {
    const tmpImg = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("preview decode failed"));
      i.src = imageDataUrl;
    });
    const longest = Math.max(tmpImg.naturalWidth, tmpImg.naturalHeight);
    if (longest > MAX_DIM) {
      const scale = MAX_DIM / longest;
      const w = Math.round(tmpImg.naturalWidth * scale);
      const h = Math.round(tmpImg.naturalHeight * scale);
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const cctx = c.getContext("2d");
      if (cctx) {
        cctx.imageSmoothingEnabled = true;
        cctx.imageSmoothingQuality = "high";
        cctx.drawImage(tmpImg, 0, 0, w, h);
        workUrl = c.toDataURL("image/png");
      }
    }
  } catch {
    // sorun olursa orijinal url ile devam
  }

  const image = await RawImage.fromURL(workUrl);
  const { pixel_values } = await processor(image);

  onProgress?.("remove");
  await yieldToUi();
  const { output } = await withTimeout(
    model({ input: pixel_values }) as Promise<{ output: unknown[] }>,
    INFERENCE_TIMEOUT_MS,
    "model_inference_timeout",
  );

  onProgress?.("apply");
  await yieldToUi();
  const width = image.width;
  const height = image.height;
  const rawMask = await buildAlphaMask(output[0] as MaskTensor, width, height);
  const alpha = refineAlpha(rawMask, width, height);



  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("result canvas init failed");
  ctx.drawImage(image.toCanvas(), 0, 0);

  const pixelData = ctx.getImageData(0, 0, width, height);
  const data = pixelData.data;
  defringeRgba(data, alpha, width, height);
  for (let i = 0; i < alpha.length; i++) {
    data[4 * i + 3] = alpha[i];
  }
  ctx.putImageData(pixelData, 0, 0);

  onProgress?.("finalize");
  await yieldToUi();

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("png export failed"));
    }, "image/png");
  });
}
