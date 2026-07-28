import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Brush, Loader2, MousePointerClick, RefreshCw, Trash2, Undo2, Wand2 } from "lucide-react";


/**
 * SmartClickSelect — Meta SAM tabanlı "tıkla-seç" arayüzü.
 * Kullanıcı fotoğrafa tıklar; her tıklama Replicate SAM'e gider ve dönen
 * maske birikimli olarak (mavi vurgulu) katmana eklenir. Çoklu seçim: tık tık tık.
 * Kullanıcı "Sil" butonuna basınca birleşik maske parent'a gönderilir.
 */

export interface SmartClickSelectLabels {
  hint: string;
  tapPrompt: string;
  working: string;
  queueing: string;
  processing: string;
  warming: string;
  undo: string;
  clear: string;
  invert: string;
  submit: string;
  emptySubmit: string;
  loadFail: string;
  segmentFail: string;
  segmentNoObject: string;
  segmentBusy: string;
  aiModeLabel?: string;
  brushModeLabel?: string;
  brushBoxTitle?: string;
  brushHint?: string;
  brushSize?: string;
}



const DEFAULT_LABELS: SmartClickSelectLabels = {
  hint: "Tıkla, Seç ve Uçur!",
  tapPrompt: "İster tek nesne, ister 4-5 farklı kişi/obje — ardı ardına tıklayın; sistem hepsini otomatik algılar ve tek hamlede kusursuzca yok eder. Hızlı, pratik, çoklu temizlikler için idealdir.",
  working: "İşleniyor…",
  queueing: "Sıra bekleniyor…",
  processing: "İşleniyor…",
  warming: "Hazırlanıyor — yüksek kaliteli sonuç için birkaç saniye…",
  undo: "Son seçimi geri al",
  clear: "Temizle",
  invert: "Maskeyi ters çevir",
  submit: "Sil",
  emptySubmit: "Önce bir nesneye tıkla",
  loadFail: "Fotoğraf yüklenemedi.",
  segmentFail: "Seçim yapılamadı, tekrar dene.",
  segmentNoObject: "Bu noktada nesne bulunamadı.",
  segmentBusy: "Servis meşgul, birazdan tekrar dene.",
  aiModeLabel: "Akıllı Seçim",
  brushModeLabel: "Manuel Fırça",
  brushBoxTitle: "Profesyonel Rötuş & Doku Tamiri",
  brushHint: "Zorlu sahneler, el/parmak yansımaları veya karmaşık detaylar için fırçayı elinize alın. Kalınlığı ayarlayıp silmek istediğiniz alanı serbestçe boyayın; arka plandaki taşları, çiçekleri ve dokuları kusursuzca yeniden örüyoruz.",
  brushSize: "Fırça",
};


interface SubmitPayload {
  workingImageDataUrl: string;
  maskDataUrl: string;
  width: number;
  height: number;
  centroid: { x: number; y: number } | null;
  maskPixels: number;
  imagePixels: number;
  source: "ai" | "brush";
}

interface Props {
  imageDataUrl: string;
  onSubmit: (payload: SubmitPayload) => void;
  busy?: boolean;
  submitLabel?: string;
  tint?: { r: number; g: number; b: number };
  accent?: "red" | "blue" | "magic";
  segmentFn: (payload: {
    imageDataUrl: string;
    x: number;
    y: number;
  }) => Promise<{ ok: true; maskDataUrl: string } | { ok: false; reason: string }>;
  onSegmentError?: (reason: string) => void;
  labels?: Partial<SmartClickSelectLabels>;
  busyStage?: "queueing" | "processing" | "warming" | null;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image_load_failed"));
    img.src = src;
  });
}

function toPixelValue(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getRenderedImageBox(canvas: HTMLCanvasElement, naturalWidth: number, naturalHeight: number) {
  const rect = canvas.getBoundingClientRect();
  const style = window.getComputedStyle(canvas);

  const borderLeft = toPixelValue(style.borderLeftWidth);
  const borderRight = toPixelValue(style.borderRightWidth);
  const borderTop = toPixelValue(style.borderTopWidth);
  const borderBottom = toPixelValue(style.borderBottomWidth);
  const paddingLeft = toPixelValue(style.paddingLeft);
  const paddingRight = toPixelValue(style.paddingRight);
  const paddingTop = toPixelValue(style.paddingTop);
  const paddingBottom = toPixelValue(style.paddingBottom);

  const contentLeft = rect.left + borderLeft + paddingLeft;
  const contentTop = rect.top + borderTop + paddingTop;
  const contentWidth = Math.max(1, rect.width - borderLeft - borderRight - paddingLeft - paddingRight);
  const contentHeight = Math.max(1, rect.height - borderTop - borderBottom - paddingTop - paddingBottom);

  // Map against the ACTUAL rendered image area inside the canvas element.
  // This handles responsive width, max-height clamps, padding/borders and
  // object-contain letterboxing without inverting the display/source ratio.
  const sourceAspect = naturalWidth / naturalHeight;
  const boxAspect = contentWidth / contentHeight;
  let renderedWidth = contentWidth;
  let renderedHeight = contentHeight;
  let offsetX = 0;
  let offsetY = 0;

  if (boxAspect > sourceAspect) {
    renderedWidth = contentHeight * sourceAspect;
    offsetX = (contentWidth - renderedWidth) / 2;
  } else if (boxAspect < sourceAspect) {
    renderedHeight = contentWidth / sourceAspect;
    offsetY = (contentHeight - renderedHeight) / 2;
  }

  return {
    element: rect,
    content: {
      left: contentLeft,
      top: contentTop,
      width: contentWidth,
      height: contentHeight,
    },
    image: {
      left: contentLeft + offsetX,
      top: contentTop + offsetY,
      width: renderedWidth,
      height: renderedHeight,
      offsetX,
      offsetY,
    },
  };
}

export function SmartClickSelect({
  imageDataUrl,
  onSubmit,
  busy = false,
  submitLabel,
  tint = { r: 59, g: 130, b: 246 },
  accent = "blue",
  segmentFn,
  onSegmentError,
  labels: labelsOverride,
  busyStage = null,
}: Props) {
  const labels = useMemo(() => ({ ...DEFAULT_LABELS, ...labelsOverride }), [labelsOverride]);
  const displayRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const historyRef = useRef<ImageData[]>([]);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [ready, setReady] = useState(false);
  const [segmenting, setSegmenting] = useState(false);
  const [segmentStartedAt, setSegmentStartedAt] = useState<number | null>(null);
  const [segmentElapsed, setSegmentElapsed] = useState(0);
  const [maskCount, setMaskCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"ai" | "brush">("ai");
  const [brushRadius, setBrushRadius] = useState(28);
  const paintingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // 🔥 Warmup: SAM konteynerini uyandır ve modal açık kaldıkça sıcak tut.
  // sam-pointprompt düşük trafikli olduğu için scale-to-zero cezası ~80s.
  // Mount'ta 2 paralel ping + her 25s'de yenileme (Replicate idle timeout'un altında).
  // DB'ye yazmayan hafif warmupSamModel çağrısı kullanılıyor.
  const warmupFiredRef = useRef(false);
  useEffect(() => {
    if (warmupFiredRef.current) return;
    warmupFiredRef.current = true;

    let cancelled = false;
    const pingSam = async () => {
      if (cancelled) return;
      try {
        const { warmupSamModel } = await import("@/lib/segment-click.functions");
        void warmupSamModel().catch(() => {});
      } catch {
        /* noop */
      }
    };

    // İlk anda çift ping — biri konteyneri uyandırsın, ikincisi replica'yı tutsun.
    void pingSam();
    void pingSam();
    const keepWarm = window.setInterval(pingSam, 25_000);

    (async () => {
      try {
        const { warmupInpaintModels } = await import("@/lib/inpaint.functions");
        void warmupInpaintModels({ data: { engines: ["bria"] } }).catch(() => {});
      } catch {
        /* noop */
      }
    })();

    return () => {
      cancelled = true;
      window.clearInterval(keepWarm);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);




  // Segmenting sırasında her saniye elapsed sayacını güncelle → stage'i türet.
  useEffect(() => {
    if (!segmenting || segmentStartedAt == null) {
      setSegmentElapsed(0);
      return;
    }
    const id = window.setInterval(() => {
      setSegmentElapsed(Date.now() - segmentStartedAt);
    }, 500);
    return () => window.clearInterval(id);
  }, [segmenting, segmentStartedAt]);

  const segmentingStage: "queueing" | "processing" | "warming" =
    segmentElapsed < 3000 ? "queueing" : segmentElapsed < 15000 ? "processing" : "warming";

  const redraw = useCallback(() => {
    const disp = displayRef.current;
    const img = imgRef.current;
    const mc = maskCanvasRef.current;
    if (!disp || !img || !mc) return;
    const ctx = disp.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, disp.width, disp.height);
    ctx.drawImage(img, 0, 0, disp.width, disp.height);

    // Tinted overlay: draw mask into tmp canvas → colorize → blit at 45% alpha
    const tmp = document.createElement("canvas");
    tmp.width = disp.width;
    tmp.height = disp.height;
    const tctx = tmp.getContext("2d");
    if (!tctx) return;
    tctx.drawImage(mc, 0, 0);
    tctx.globalCompositeOperation = "source-in";
    tctx.fillStyle = `rgb(${tint.r}, ${tint.g}, ${tint.b})`;
    tctx.fillRect(0, 0, tmp.width, tmp.height);
    ctx.globalAlpha = 0.5;
    ctx.drawImage(tmp, 0, 0);
    ctx.globalAlpha = 1;
  }, [tint.r, tint.g, tint.b]);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setError(null);
    historyRef.current = [];
    setMaskCount(0);
    (async () => {
      try {
        const img = await loadImage(imageDataUrl);
        if (cancelled) return;
        imgRef.current = img;
        const disp = displayRef.current;
        if (!disp) return;
        const MAX = 1600;
        const scale = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
        disp.width = Math.round(img.naturalWidth * scale);
        disp.height = Math.round(img.naturalHeight * scale);
        const mc = document.createElement("canvas");
        mc.width = disp.width;
        mc.height = disp.height;
        maskCanvasRef.current = mc;
        setReady(true);
        redraw();
      } catch (e) {
        console.error("[SmartClickSelect] load failed", e);
        setError(labels.loadFail);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [imageDataUrl, labels.loadFail, redraw]);

  // ---- Manual brush painting (bypasses AI entirely) ----
  const paintAt = useCallback(
    (clientX: number, clientY: number) => {
      const disp = displayRef.current;
      const nat = imgRef.current;
      const mc = maskCanvasRef.current;
      if (!disp || !nat || !mc) return;
      const box = getRenderedImageBox(disp, nat.naturalWidth, nat.naturalHeight);
      const relX = clientX - box.image.left;
      const relY = clientY - box.image.top;
      if (relX < 0 || relY < 0 || relX > box.image.width || relY > box.image.height) return;
      const canvasX = (relX / box.image.width) * mc.width;
      const canvasY = (relY / box.image.height) * mc.height;
      const mctx = mc.getContext("2d");
      if (!mctx) return;
      // Scale brush radius from screen px into canvas px to feel consistent.
      const scale = mc.width / box.image.width;
      const r = Math.max(2, brushRadius * scale);
      mctx.fillStyle = "rgba(255,255,255,1)";
      mctx.beginPath();
      mctx.arc(canvasX, canvasY, r, 0, Math.PI * 2);
      mctx.fill();
      const last = lastPointRef.current;
      if (last) {
        mctx.lineWidth = r * 2;
        mctx.lineCap = "round";
        mctx.strokeStyle = "rgba(255,255,255,1)";
        mctx.beginPath();
        mctx.moveTo(last.x, last.y);
        mctx.lineTo(canvasX, canvasY);
        mctx.stroke();
      }
      lastPointRef.current = { x: canvasX, y: canvasY };
      redraw();
    },
    [brushRadius, redraw],
  );

  const beginBrush = (clientX: number, clientY: number) => {
    if (!ready || busy || segmenting) return;
    const mc = maskCanvasRef.current;
    if (!mc) return;
    const mctx = mc.getContext("2d");
    if (!mctx) return;
    // Snapshot for undo per stroke
    historyRef.current.push(mctx.getImageData(0, 0, mc.width, mc.height));
    if (historyRef.current.length > 15) historyRef.current.shift();
    paintingRef.current = true;
    lastPointRef.current = null;
    paintAt(clientX, clientY);
  };

  const endBrush = () => {
    if (!paintingRef.current) return;
    paintingRef.current = false;
    lastPointRef.current = null;
    setMaskCount((c) => c + 1);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (mode !== "brush") return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    beginBrush(e.clientX, e.clientY);
  };
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (mode !== "brush" || !paintingRef.current) return;
    paintAt(e.clientX, e.clientY);
  };
  const handlePointerUp = () => {
    if (mode !== "brush") return;
    endBrush();
  };

  const handleClick = async (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (mode !== "ai") return;
    if (!ready || segmenting || busy) return;

    const disp = displayRef.current;
    if (!disp) return;
    const nat = imgRef.current;
    if (!nat) return;

    const box = getRenderedImageBox(disp, nat.naturalWidth, nat.naturalHeight);
    const clickX = e.clientX - box.image.left;
    const clickY = e.clientY - box.image.top;

    if (clickX < 0 || clickY < 0 || clickX > box.image.width || clickY > box.image.height) {
      console.log("[SmartClickSelect] click ignored outside rendered image", {
        clientX: e.clientX,
        clientY: e.clientY,
        naturalWidth: nat.naturalWidth,
        naturalHeight: nat.naturalHeight,
        renderedImageBox: box.image,
        contentBox: box.content,
      });
      return;
    }

    const rawTargetX = (clickX / box.image.width) * nat.naturalWidth;
    const rawTargetY = (clickY / box.image.height) * nat.naturalHeight;
    const naturalX = Math.max(0, Math.min(nat.naturalWidth - 1, Math.round(rawTargetX)));
    const naturalY = Math.max(0, Math.min(nat.naturalHeight - 1, Math.round(rawTargetY)));
    const inBounds =
      naturalX >= 0 && naturalX < nat.naturalWidth && naturalY >= 0 && naturalY < nat.naturalHeight;

    console.log("[SmartClickSelect] SAM coordinate payload", {
      Target_X: naturalX,
      Target_Y: naturalY,
      naturalWidth: nat.naturalWidth,
      naturalHeight: nat.naturalHeight,
      inBounds,
      click: {
        clientX: e.clientX,
        clientY: e.clientY,
        relativeX: Number(clickX.toFixed(2)),
        relativeY: Number(clickY.toFixed(2)),
      },
      ratio: {
        x: Number((nat.naturalWidth / box.image.width).toFixed(6)),
        y: Number((nat.naturalHeight / box.image.height).toFixed(6)),
      },
      elementBox: {
        left: Number(box.element.left.toFixed(2)),
        top: Number(box.element.top.toFixed(2)),
        width: Number(box.element.width.toFixed(2)),
        height: Number(box.element.height.toFixed(2)),
      },
      renderedImageBox: {
        left: Number(box.image.left.toFixed(2)),
        top: Number(box.image.top.toFixed(2)),
        width: Number(box.image.width.toFixed(2)),
        height: Number(box.image.height.toFixed(2)),
        offsetX: Number(box.image.offsetX.toFixed(2)),
        offsetY: Number(box.image.offsetY.toFixed(2)),
      },
    });

    if (!inBounds) return;

    setSegmenting(true);
    setSegmentStartedAt(Date.now());
    setError(null);
    try {
      const res = await segmentFn({ imageDataUrl, x: naturalX, y: naturalY });
      if (!res.ok) {
        const msg =
          res.reason === "provider_no_output"
            ? labels.segmentNoObject
            : res.reason === "provider_unavailable"
              ? labels.segmentBusy
              : labels.segmentFail;
        setError(msg);
        onSegmentError?.(res.reason);
        return;
      }
      const maskImg = await loadImage(res.maskDataUrl);
      const mc = maskCanvasRef.current;
      if (!mc) return;
      const mctx = mc.getContext("2d", { willReadFrequently: true });
      if (!mctx) return;

      // --- Polarity inspection: rasterize incoming mask into a tmp canvas
      // and measure white-coverage. SAM sometimes returns a "background"
      // mask (near full canvas) that, combined with a `lighter` composite,
      // paints the entire image purple.
      const tmp = document.createElement("canvas");
      tmp.width = mc.width;
      tmp.height = mc.height;
      const tctx = tmp.getContext("2d", { willReadFrequently: true });
      if (!tctx) return;
      tctx.drawImage(maskImg, 0, 0, tmp.width, tmp.height);
      const raw = tctx.getImageData(0, 0, tmp.width, tmp.height);
      const rd = raw.data;
      const total = tmp.width * tmp.height;
      const THRESH = 128;
      let whiteCount = 0;
      let minX = tmp.width, minY = tmp.height, maxX = 0, maxY = 0;
      let sumX = 0, sumY = 0;
      for (let i = 0; i < rd.length; i += 4) {
        const a = rd[i + 3];
        const lum = (rd[i] + rd[i + 1] + rd[i + 2]) / 3;
        if (a > 32 && lum > THRESH) {
          whiteCount++;
          const px = (i / 4) % tmp.width;
          const py = Math.floor(i / 4 / tmp.width);
          if (px < minX) minX = px;
          if (py < minY) minY = py;
          if (px > maxX) maxX = px;
          if (py > maxY) maxY = py;
          sumX += px;
          sumY += py;
        }
      }
      const coverage = whiteCount / total;
      const AUTO_INVERT_THRESHOLD = 0.6;
      const shouldInvert = coverage > AUTO_INVERT_THRESHOLD;
      // Scale image coordinates to the mask canvas so we can compare
      // where the user clicked vs where the returned mask actually lives.
      const scaleX = tmp.width / nat.naturalWidth;
      const scaleY = tmp.height / nat.naturalHeight;
      const clickMaskX = Math.round(naturalX * scaleX);
      const clickMaskY = Math.round(naturalY * scaleY);
      const centroidX = whiteCount > 0 ? Math.round(sumX / whiteCount) : -1;
      const centroidY = whiteCount > 0 ? Math.round(sumY / whiteCount) : -1;
      const clickInsideMaskBBox =
        whiteCount > 0 &&
        clickMaskX >= minX && clickMaskX <= maxX &&
        clickMaskY >= minY && clickMaskY <= maxY;
      // Sample the mask pixel directly under the click to confirm the model
      // actually painted the point the user tapped.
      let clickPixelIsWhite = false;
      if (whiteCount > 0 && clickMaskX >= 0 && clickMaskY >= 0 && clickMaskX < tmp.width && clickMaskY < tmp.height) {
        const idx = (clickMaskY * tmp.width + clickMaskX) * 4;
        const a = rd[idx + 3];
        const lum = (rd[idx] + rd[idx + 1] + rd[idx + 2]) / 3;
        clickPixelIsWhite = a > 32 && lum > THRESH;
      }
      console.log("[SmartClickSelect] mask polarity", {
        width: tmp.width,
        height: tmp.height,
        coverage: Number(coverage.toFixed(4)),
        autoInverted: shouldInvert,
        clickAt: { x: clickMaskX, y: clickMaskY },
        maskBBox: whiteCount > 0 ? { minX, minY, maxX, maxY } : null,
        maskCentroid: whiteCount > 0 ? { x: centroidX, y: centroidY } : null,
        clickInsideMaskBBox,
        clickPixelIsWhite,
        distanceClickToCentroid:
          whiteCount > 0
            ? Math.round(Math.hypot(clickMaskX - centroidX, clickMaskY - centroidY))
            : -1,
      });

      // Snapshot BEFORE merge for undo
      const prev = mctx.getImageData(0, 0, mc.width, mc.height);
      historyRef.current.push(prev);
      if (historyRef.current.length > 15) historyRef.current.shift();

      // Bulletproof pixel-level UNION: read existing mask, OR in new
      // foreground bits directly. Guarantees multi-select accumulation
      // regardless of composite-op state or alpha-premultiplication quirks.
      const merged = mctx.createImageData(mc.width, mc.height);
      const md = merged.data;
      const pd = prev.data;
      let mergedWhite = 0;
      for (let i = 0; i < rd.length; i += 4) {
        // Existing pixel already in accumulated mask?
        const prevIsWhite = pd[i + 3] > 32 && (pd[i] + pd[i + 1] + pd[i + 2]) / 3 > THRESH;
        // New pixel from this SAM response?
        const a = rd[i + 3];
        const lum = (rd[i] + rd[i + 1] + rd[i + 2]) / 3;
        let newIsForeground = a > 32 && lum > THRESH;
        if (shouldInvert) newIsForeground = !newIsForeground;
        if (prevIsWhite || newIsForeground) {
          md[i] = 255; md[i + 1] = 255; md[i + 2] = 255; md[i + 3] = 255;
          mergedWhite++;
        } else {
          md[i + 3] = 0;
        }
      }
      mctx.putImageData(merged, 0, 0);
      console.log("[SmartClickSelect] mask accumulated", {
        clickIndex: maskCount + 1,
        mergedWhitePixels: mergedWhite,
        newWhitePixels: whiteCount,
      });
      setMaskCount((c) => c + 1);
      redraw();
    } catch (err) {
      console.error("[SmartClickSelect] segment error", err);
      setError(labels.segmentFail);
    } finally {
      setSegmenting(false);
      setSegmentStartedAt(null);
    }
  };

  const handleUndo = () => {
    const mc = maskCanvasRef.current;
    if (!mc) return;
    const last = historyRef.current.pop();
    const mctx = mc.getContext("2d");
    if (!mctx) return;
    if (last) mctx.putImageData(last, 0, 0);
    else mctx.clearRect(0, 0, mc.width, mc.height);
    setMaskCount((c) => Math.max(0, c - 1));
    redraw();
  };

  const handleClear = () => {
    const mc = maskCanvasRef.current;
    if (!mc) return;
    const mctx = mc.getContext("2d");
    if (!mctx) return;
    mctx.clearRect(0, 0, mc.width, mc.height);
    historyRef.current = [];
    setMaskCount(0);
    redraw();
  };

  const handleInvert = () => {
    const mc = maskCanvasRef.current;
    if (!mc) return;
    const mctx = mc.getContext("2d", { willReadFrequently: true });
    if (!mctx) return;
    const w = mc.width;
    const h = mc.height;
    const snapshot = mctx.getImageData(0, 0, w, h);
    historyRef.current.push(snapshot);
    if (historyRef.current.length > 15) historyRef.current.shift();

    // Invert: pixels that were "inside" mask become empty; empty pixels become
    // white (opaque). Threshold matches submit-time normalization.
    const img = mctx.createImageData(w, h);
    const src = snapshot.data;
    const dst = img.data;
    for (let i = 0; i < src.length; i += 4) {
      const a = src[i + 3];
      const inMask = a > 32 && (src[i] + src[i + 1] + src[i + 2]) / 3 > 32;
      if (inMask) {
        dst[i] = 0; dst[i + 1] = 0; dst[i + 2] = 0; dst[i + 3] = 0;
      } else {
        dst[i] = 255; dst[i + 1] = 255; dst[i + 2] = 255; dst[i + 3] = 255;
      }
    }
    mctx.putImageData(img, 0, 0);
    setMaskCount((c) => Math.max(1, c));
    redraw();
  };

  const handleSubmit = () => {
    const mc = maskCanvasRef.current;
    const img = imgRef.current;
    if (!mc || !img || maskCount === 0) return;

    // Build a normalized black/white mask at the ORIGINAL image dimensions.
    // Critical for Replicate inpaint models: image + mask must be exact same
    // pixel size. The UI canvas is intentionally downscaled for speed, so we
    // nearest-neighbor upscale the binary mask back to naturalWidth/Height here.
    const sourceW = mc.width;
    const sourceH = mc.height;
    const w = Math.max(1, Math.round(img.naturalWidth || sourceW));
    const h = Math.max(1, Math.round(img.naturalHeight || sourceH));
    const mctx = mc.getContext("2d");
    if (!mctx) return;
    const src = mctx.getImageData(0, 0, sourceW, sourceH).data;
    const out = document.createElement("canvas");
    out.width = w;
    out.height = h;
    const octx = out.getContext("2d");
    if (!octx) return;
    const outImg = octx.createImageData(w, h);
    const outData = outImg.data;
    let sumX = 0;
    let sumY = 0;
    let count = 0;
    for (let y = 0; y < h; y += 1) {
      const sy = Math.min(sourceH - 1, Math.floor((y * sourceH) / h));
      for (let x = 0; x < w; x += 1) {
        const sx = Math.min(sourceW - 1, Math.floor((x * sourceW) / w));
        const srcIdx = (sy * sourceW + sx) * 4;
        const dstIdx = (y * w + x) * 4;
        const a = src[srcIdx + 3];
        const bright = a > 32 && (src[srcIdx] + src[srcIdx + 1] + src[srcIdx + 2]) / 3 > 32;
        if (bright) {
          outData[dstIdx] = 255;
          outData[dstIdx + 1] = 255;
          outData[dstIdx + 2] = 255;
          outData[dstIdx + 3] = 255;
          sumX += x;
          sumY += y;
          count++;
        } else {
          outData[dstIdx + 3] = 255; // black opaque
        }
      }
    }
    octx.putImageData(outImg, 0, 0);
    const centroid = count > 0 ? { x: Math.round(sumX / count), y: Math.round(sumY / count) } : null;
    console.log("[SmartClickSelect] submit mask normalized", {
      from: { width: sourceW, height: sourceH },
      to: { width: w, height: h },
      whitePixels: count,
      imagePixels: w * h,
    });

    onSubmit({
      workingImageDataUrl: imageDataUrl,
      maskDataUrl: out.toDataURL("image/png"),
      width: w,
      height: h,
      centroid,
      maskPixels: count,
      imagePixels: w * h,
      source: mode === "brush" ? "brush" : "ai",
    });
  };

  return (
    <div className="space-y-3">
      {/* Hybrid Workspace: prominent twin toggle between AI Smart Select and Manual Brush */}
      <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-neutral-100 border border-neutral-200">
        <button
          type="button"
          onClick={() => setMode("ai")}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-semibold transition ${
            mode === "ai"
              ? "bg-white text-blue-700 shadow-sm ring-1 ring-blue-200"
              : "text-neutral-500 hover:text-neutral-800"
          }`}
        >
          <Wand2 className="w-4 h-4" />
          {labels.aiModeLabel ?? "Smart Select"}
        </button>
        <button
          type="button"
          onClick={() => setMode("brush")}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-semibold transition ${
            mode === "brush"
              ? "bg-white text-rose-700 shadow-sm ring-1 ring-rose-200"
              : "text-neutral-500 hover:text-neutral-800"
          }`}
        >
          <Brush className="w-4 h-4" />
          {labels.brushModeLabel ?? "Manual Brush"}
        </button>
      </div>

      {mode === "ai" ? (
        <div className="rounded-xl border-2 border-blue-200 bg-blue-50/70 p-3 flex items-start gap-2">
          <MousePointerClick className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
          <div className="text-xs text-blue-900">
            <p className="font-semibold">{labels.hint}</p>
            <p className="text-blue-800/80 mt-0.5">{labels.tapPrompt}</p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border-2 border-rose-200 bg-rose-50/70 p-3 space-y-2">
          <div className="flex items-start gap-2">
            <Brush className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
            <div className="text-xs text-rose-900 flex-1">
              <p className="font-semibold">{labels.brushBoxTitle ?? labels.brushModeLabel ?? "Manual Brush"}</p>
              <p className="text-rose-800/80 mt-0.5">
                {labels.brushHint ?? "Paint over the area you want to erase."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-rose-900">
            <span className="font-medium">{labels.brushSize ?? "Brush"}</span>
            <input
              type="range"
              min={6}
              max={80}
              step={2}
              value={brushRadius}
              onChange={(e) => setBrushRadius(Number(e.target.value))}
              className="flex-1 accent-rose-600"
            />
            <span className="tabular-nums w-8 text-right">{brushRadius}px</span>
          </div>
        </div>
      )}



      <div className="relative rounded-lg overflow-hidden bg-neutral-100 border border-border">
        <canvas
          ref={displayRef}
          onClick={handleClick}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className={`w-full h-auto block max-h-[70vh] object-contain ${
            ready && !segmenting && !busy ? "cursor-crosshair" : "cursor-wait"
          }`}
          style={{ touchAction: mode === "brush" ? "none" : "manipulation" }}
        />

        {(segmenting || !ready || busy) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/25 text-white text-sm">
            <div className="flex items-center gap-2 bg-black/60 rounded-full px-4 py-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>
                {busy
                  ? busyStage === "queueing"
                    ? labels.queueing
                    : busyStage === "processing"
                      ? labels.processing
                      : busyStage === "warming"
                        ? labels.warming
                        : labels.working
                  : segmenting
                    ? segmentingStage === "queueing"
                      ? labels.queueing
                      : segmentingStage === "processing"
                        ? labels.processing
                        : labels.warming
                    : labels.working}
                {segmenting && segmentElapsed >= 3000 ? ` (${Math.floor(segmentElapsed / 1000)}s)` : ""}
              </span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleUndo}
          disabled={maskCount === 0 || segmenting || busy}
        >
          <Undo2 className="w-4 h-4" /> {labels.undo}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClear}
          disabled={maskCount === 0 || segmenting || busy}
        >
          <Trash2 className="w-4 h-4" /> {labels.clear}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleInvert}
          disabled={maskCount === 0 || segmenting || busy}
          title={labels.invert}
        >
          <RefreshCw className="w-4 h-4" /> {labels.invert}
        </Button>
        <div className="flex-1" />
        <Button
          type="button"
          size="lg"
          onClick={handleSubmit}
          disabled={maskCount === 0 || segmenting || busy}
          className={
            "min-w-[160px] text-white " +
            (accent === "red"
              ? "bg-red-600 hover:bg-red-700 focus-visible:ring-red-500"
              : accent === "magic"
                ? "bg-purple-600 hover:bg-purple-700 focus-visible:ring-purple-500"
                : "bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-500")
          }
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {maskCount === 0 ? labels.emptySubmit : (submitLabel ?? labels.submit)}
        </Button>
      </div>
    </div>
  );
}
