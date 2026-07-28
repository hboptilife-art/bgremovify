import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Eraser, X, Undo2, Brush } from "lucide-react";

interface Props {
  open: boolean;
  /** The current result PNG (with transparency) — we erase unwanted blobs from this. */
  resultDataUrl: string | null;
  onClose: () => void;
  onResult: (newResultDataUrl: string) => void;
  labels?: {
    title: string;
    hint: string;
    close: string;
    undo: string;
    apply: string;
    cancel: string;
    brushSize?: string;
  };
}

const defaultLabels = {
  title: "Silgi",
  hint: "Parmağını/faresini kalıntının üzerinde gezdir — sadece dokunduğun pikseller silinir.",
  close: "Kapat",
  undo: "Geri al",
  apply: "Uygula",
  cancel: "İptal",
  brushSize: "Fırça",
};

async function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function ClickToSelectModal({ open, resultDataUrl, onClose, onResult, labels: labelsOverride }: Props) {
  const labels = { ...defaultLabels, ...labelsOverride };
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const historyRef = useRef<ImageData[]>([]);
  const drawingRef = useRef(false);
  const lastPtRef = useRef<{ x: number; y: number } | null>(null);
  const strokeSnapshotTakenRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [brushSize, setBrushSize] = useState(30);

  useEffect(() => {
    if (!open || !resultDataUrl) return;
    let cancelled = false;
    setReady(false);
    setDirty(false);
    historyRef.current = [];

    (async () => {
      try {
        const img = await loadImg(resultDataUrl);
        if (cancelled) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const MAX = 1600;
        const scale = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
        canvas.width = Math.round(img.naturalWidth * scale);
        canvas.height = Math.round(img.naturalHeight * scale);
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setReady(true);
      } catch (e) {
        console.error("[ClickToErase] image load failed", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, resultDataUrl]);

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const eraseStroke = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / (rect.width || canvas.width);
    const radius = (brushSize / 2) * scale;
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.strokeStyle = "rgba(0,0,0,1)";
    ctx.fillStyle = "rgba(0,0,0,1)";
    ctx.lineWidth = radius * 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(to.x, to.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!ready) return;
    const pt = getPoint(e);
    if (!pt) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    historyRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (historyRef.current.length > 20) historyRef.current.shift();
    strokeSnapshotTakenRef.current = true;
    drawingRef.current = true;
    lastPtRef.current = pt;
    eraseStroke(pt, pt);
    setDirty(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const pt = getPoint(e);
    if (!pt || !lastPtRef.current) return;
    eraseStroke(lastPtRef.current, pt);
    lastPtRef.current = pt;
  };

  const onPointerUp = () => {
    drawingRef.current = false;
    lastPtRef.current = null;
    strokeSnapshotTakenRef.current = false;
  };

  const handleUndo = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const last = historyRef.current.pop();
    if (!last) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    ctx.putImageData(last, 0, 0);
    if (historyRef.current.length === 0) setDirty(false);
  }, []);

  const handleApply = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    onResult(dataUrl);
  }, [onResult]);

  if (!open || !resultDataUrl) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Eraser className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-lg">{labels.title}</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
            <span className="sr-only">{labels.close}</span>
          </Button>
        </div>

        <div className="p-3 text-sm text-muted-foreground border-b border-border">
          {labels.hint}
        </div>

        <div className="flex flex-wrap items-center gap-2 p-2 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2 px-2 min-w-[200px] flex-1">
            <Brush className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground whitespace-nowrap">{labels.brushSize}: {brushSize}px</span>
            <Slider
              value={[brushSize]}
              onValueChange={([v]) => setBrushSize(v)}
              min={6}
              max={120}
              step={2}
              className="flex-1"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-[url('data:image/svg+xml;utf8,<svg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2220%22%20height=%2220%22><rect%20width=%2210%22%20height=%2210%22%20fill=%22%23e5e7eb%22/><rect%20x=%2210%22%20y=%2210%22%20width=%2210%22%20height=%2210%22%20fill=%22%23e5e7eb%22/></svg>')] flex items-center justify-center p-4" style={{ touchAction: "none" }}>
          <canvas
            ref={canvasRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className={`max-w-full max-h-[60vh] object-contain rounded-lg ${ready ? "cursor-crosshair" : "cursor-wait opacity-50"}`}
            style={{ imageRendering: "auto", touchAction: "none" }}
          />
        </div>

        <div className="flex items-center justify-between gap-2 p-3 border-t border-border">
          <Button variant="outline" size="sm" onClick={handleUndo} disabled={historyRef.current.length === 0}>
            <Undo2 className="w-4 h-4" /> {labels.undo}
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>{labels.cancel}</Button>
            <Button onClick={handleApply} disabled={!dirty}>{labels.apply}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
