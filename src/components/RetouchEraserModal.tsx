import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Eraser, X, Undo2, Brush, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  /** The current result image (usually the just-inpainted PNG). */
  imageDataUrl: string | null;
  onClose: () => void;
  onResult: (newDataUrl: string) => void;
  labels?: Partial<RetouchEraserLabels>;
}

export interface RetouchEraserLabels {
  title: string;
  free: string;
  introBefore: string;
  introApply: string;
  introAfter: string;
  brushSize: string;
  undo: string;
  apply: string;
  applying: string;
}

const DEFAULT_LABELS: RetouchEraserLabels = {
  title: "🩹 Rötuş — Kalıntıları Sil",
  free: "ÜCRETSİZ",
  introBefore: "AI silme işleminden sonra arka planda kalan minik kalıntıları, gölgeleri veya minyatür figürleri yeşil rötuş fırçasıyla tamamen boyayarak pürüzsüzce temizleyin.",
  introApply: "",
  introAfter: "",
  brushSize: "Fırça",
  undo: "Geri al",
  apply: "Uygula",
  applying: "Uygulanıyor…",
};

/**
 * Fast client-side "retouch" fill:
 * For every masked pixel, find the nearest UNMASKED pixel via a multi-source
 * BFS starting from all mask-boundary pixels, and copy its color. Then apply
 * a light box-blur inside the mask so the seams don't jump.
 *
 * This is deliberately simple — it's meant to fix tiny leftover artifacts
 * (miniature-person residuals, floating fragments) after a paid AI removal,
 * not to replace the AI itself. Runs in a few hundred ms for typical masks.
 */
function inpaintByNearestNeighbor(
  data: Uint8ClampedArray,
  mask: Uint8Array, // 1 where user painted, else 0
  width: number,
  height: number,
): void {
  const total = width * height;
  const parent = new Int32Array(total);
  parent.fill(-1);

  // Multi-source BFS: seeds are unmasked pixels that touch a masked pixel.
  // Each masked pixel gets `parent` = an unmasked source pixel index.
  const queue = new Int32Array(total);
  let qHead = 0;
  let qTail = 0;

  const visited = new Uint8Array(total);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (mask[i]) continue;
      // Is any 4-neighbor masked?
      const up = y > 0 ? mask[i - width] : 0;
      const down = y < height - 1 ? mask[i + width] : 0;
      const left = x > 0 ? mask[i - 1] : 0;
      const right = x < width - 1 ? mask[i + 1] : 0;
      if (up || down || left || right) {
        parent[i] = i; // self = source
        visited[i] = 1;
        queue[qTail++] = i;
      }
    }
  }

  while (qHead < qTail) {
    const idx = queue[qHead++];
    const x = idx % width;
    const y = (idx / width) | 0;
    const src = parent[idx];
    const neighbors: number[] = [];
    if (x > 0) neighbors.push(idx - 1);
    if (x < width - 1) neighbors.push(idx + 1);
    if (y > 0) neighbors.push(idx - width);
    if (y < height - 1) neighbors.push(idx + width);
    for (const n of neighbors) {
      if (visited[n]) continue;
      if (!mask[n]) continue;
      visited[n] = 1;
      parent[n] = src;
      queue[qTail++] = n;
    }
  }

  // Copy color from each masked pixel's source.
  for (let i = 0; i < total; i++) {
    if (!mask[i]) continue;
    const src = parent[i];
    if (src < 0) continue;
    const di = i * 4;
    const si = src * 4;
    data[di] = data[si];
    data[di + 1] = data[si + 1];
    data[di + 2] = data[si + 2];
    // keep alpha
  }

  // Light 3x3 box blur inside the mask region — smooths hard NN seams.
  const passes = 2;
  const tmp = new Uint8ClampedArray(data.length);
  for (let p = 0; p < passes; p++) {
    tmp.set(data);
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const i = y * width + x;
        if (!mask[i]) continue;
        let r = 0, g = 0, b = 0, c = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const ni = (y + dy) * width + (x + dx);
            const nis = ni * 4;
            r += tmp[nis];
            g += tmp[nis + 1];
            b += tmp[nis + 2];
            c++;
          }
        }
        const di = i * 4;
        data[di] = r / c;
        data[di + 1] = g / c;
        data[di + 2] = b / c;
      }
    }
  }
}

async function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function RetouchEraserModal({ open, imageDataUrl, onClose, onResult, labels: labelsOverride }: Props) {
  const labels = { ...DEFAULT_LABELS, ...labelsOverride };
  const imgCanvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastPtRef = useRef<{ x: number; y: number } | null>(null);
  const historyRef = useRef<ImageData[]>([]);

  const [ready, setReady] = useState(false);
  const [applying, setApplying] = useState(false);
  const [hasMask, setHasMask] = useState(false);
  const [brushSize, setBrushSize] = useState(28);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  // Load image
  useEffect(() => {
    if (!open || !imageDataUrl) return;
    let cancelled = false;
    setReady(false);
    setHasMask(false);
    historyRef.current = [];
    (async () => {
      try {
        const img = await loadImg(imageDataUrl);
        if (cancelled) return;
        const MAX = 1600;
        const scale = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.round(img.naturalWidth * scale);
        const h = Math.round(img.naturalHeight * scale);
        setSize({ w, h });
        for (const c of [imgCanvasRef.current, maskCanvasRef.current, previewCanvasRef.current]) {
          if (!c) continue;
          c.width = w;
          c.height = h;
        }
        const ictx = imgCanvasRef.current?.getContext("2d");
        ictx?.clearRect(0, 0, w, h);
        ictx?.drawImage(img, 0, 0, w, h);
        maskCanvasRef.current?.getContext("2d", { willReadFrequently: true })?.clearRect(0, 0, w, h);
        previewCanvasRef.current?.getContext("2d")?.clearRect(0, 0, w, h);
        setReady(true);
      } catch (e) {
        console.error("[RetouchEraser] load failed", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, imageDataUrl]);

  const renderPreview = useCallback(() => {
    const mask = maskCanvasRef.current;
    const prev = previewCanvasRef.current;
    if (!mask || !prev) return;
    const mctx = mask.getContext("2d");
    const pctx = prev.getContext("2d");
    if (!mctx || !pctx) return;
    const w = mask.width;
    const h = mask.height;
    const md = mctx.getImageData(0, 0, w, h);
    const pd = pctx.createImageData(w, h);
    for (let i = 0; i < md.data.length; i += 4) {
      if (md.data[i + 3] > 0) {
        pd.data[i] = 34;
        pd.data[i + 1] = 197;
        pd.data[i + 2] = 94;
        pd.data[i + 3] = 140;
      }
    }
    pctx.putImageData(pd, 0, 0);
  }, []);

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = maskCanvasRef.current;
    if (!c) return null;
    const rect = c.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * c.width,
      y: ((e.clientY - rect.top) / rect.height) * c.height,
    };
  };

  const drawLine = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const c = maskCanvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const scale = c.width / (c.getBoundingClientRect().width || c.width);
    const radius = (brushSize / 2) * scale;
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = "rgba(255,255,255,1)";
    ctx.lineWidth = radius * 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!ready || applying) return;
    const pt = getPoint(e);
    if (!pt) return;
    const c = maskCanvasRef.current!;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    historyRef.current.push(ctx.getImageData(0, 0, c.width, c.height));
    if (historyRef.current.length > 20) historyRef.current.shift();
    drawingRef.current = true;
    lastPtRef.current = pt;
    drawLine(pt, pt);
    renderPreview();
    setHasMask(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const pt = getPoint(e);
    if (!pt || !lastPtRef.current) return;
    drawLine(lastPtRef.current, pt);
    lastPtRef.current = pt;
    renderPreview();
  };

  const onPointerUp = () => {
    drawingRef.current = false;
    lastPtRef.current = null;
  };

  const handleUndo = () => {
    const c = maskCanvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const last = historyRef.current.pop();
    if (!last) return;
    ctx.putImageData(last, 0, 0);
    renderPreview();
    if (historyRef.current.length === 0) setHasMask(false);
  };

  const handleApply = useCallback(async () => {
    const imgCanvas = imgCanvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!imgCanvas || !maskCanvas || !size) return;
    setApplying(true);
    // Yield so spinner shows.
    await new Promise((r) => setTimeout(r, 30));
    try {
      const w = size.w;
      const h = size.h;
      const ictx = imgCanvas.getContext("2d", { willReadFrequently: true })!;
      const mctx = maskCanvas.getContext("2d", { willReadFrequently: true })!;
      const imgData = ictx.getImageData(0, 0, w, h);
      const maskImg = mctx.getImageData(0, 0, w, h);
      const mask = new Uint8Array(w * h);
      for (let i = 0, j = 0; i < maskImg.data.length; i += 4, j++) {
        if (maskImg.data[i + 3] > 0) mask[j] = 1;
      }
      inpaintByNearestNeighbor(imgData.data, mask, w, h);
      ictx.putImageData(imgData, 0, 0);
      const url = imgCanvas.toDataURL("image/png");
      onResult(url);
    } catch (e) {
      console.error("[RetouchEraser] apply failed", e);
    } finally {
      setApplying(false);
    }
  }, [onResult, size]);

  if (!open || !imageDataUrl) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Eraser className="w-5 h-5 text-emerald-600" />
            <h2 className="font-semibold text-lg">{labels.title}</h2>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-semibold">
              {labels.free}
            </span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} disabled={applying}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-3 text-xs text-muted-foreground border-b border-border">
          {labels.introBefore} <strong>{labels.introApply}</strong>{labels.introAfter}
        </div>

        <div className="flex flex-wrap items-center gap-2 p-2 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2 px-2 min-w-[180px] flex-1">
            <Brush className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground whitespace-nowrap">{labels.brushSize}: {brushSize}px</span>
            <Slider
              value={[brushSize]}
              onValueChange={([v]) => setBrushSize(v)}
              min={6}
              max={80}
              step={2}
              className="flex-1"
              disabled={applying}
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleUndo}
            disabled={applying || historyRef.current.length === 0}
          >
            <Undo2 className="w-4 h-4" /> {labels.undo}
          </Button>
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleApply}
            disabled={applying || !hasMask}
          >
            {applying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> {labels.applying}
              </>
            ) : (
              <>
                <Eraser className="w-4 h-4" /> {labels.apply}
              </>
            )}
          </Button>
        </div>

        <div className="flex-1 overflow-auto bg-[#f3f4f6] flex items-center justify-center p-4">
          <div
            className="relative max-w-full max-h-[65vh]"
            style={{ touchAction: "none" }}
          >
            <canvas ref={imgCanvasRef} className="block max-w-full max-h-[65vh] rounded-lg" />
            <canvas
              ref={previewCanvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
            />
            <canvas
              ref={maskCanvasRef}
              className={`absolute inset-0 w-full h-full ${ready ? "cursor-crosshair" : "cursor-wait"} opacity-0`}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
