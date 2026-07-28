import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Brush,
  Eraser,
  Undo2,
  RotateCcw,
  AlertCircle,
  Loader2,
  ZoomIn,
  ZoomOut,
  Move,
  Wand2,
} from "lucide-react";

export type BrushColor = "red" | "blue" | "magic";

interface SubmitPayload {
  workingImageDataUrl: string;
  maskDataUrl: string;
  width: number;
  height: number;
  centroid: { x: number; y: number } | null;
  maskPixels: number;
  imagePixels: number;
}

export interface SmartSelectResult {
  maskDataUrl: string;
}

export interface BrushMaskEditorLabels {
  submitDefault: string;
  redBrushName: string;
  blueBrushName: string;
  magicBrushName?: string;
  smartTitle: string;
  smartButton: string;
  paint: string;
  eraser: string;
  pan: string;
  panTitle: string;
  zoomOut: string;
  zoomIn: string;
  reset: string;
  brushSize: string;
  undo: string;
  clear: string;
  working: string;
  preparing: string;
  smartWorking: string;
  loadZero: string;
  loadHeic: string;
  loadFail: string;
  smartHelpTitle: string;
  smartHelpBefore: string;
  smartHelpAfter: string;
  smartHelpFix: string;
  panHelpTitle: string;
  panHelp: string;
  activeBrush: string;
  mobileTip: string;
  spillTip: string;
  redTip?: string;
  blueTip?: string;
  magicTip?: string;
}

const DEFAULT_LABELS: BrushMaskEditorLabels = {
  submitDefault: "Sil",
  redBrushName: "Kırmızı (Komple Sil)",
  blueBrushName: "Mavi (AI Estetik)",
  magicBrushName: "Mor (AI Magic Fill)",
  smartTitle: "Silmek istediğin nesneye/kişiye TEK DOKUN — AI sınırını otomatik boyasın",
  smartButton: "🎯 Tek Dokun",
  paint: "Boya",
  eraser: "Silgi",
  pan: "Kaydır",
  panTitle: "Fotoğrafı kaydır (iki parmakla da yapılabilir)",
  zoomOut: "Uzaklaş",
  zoomIn: "Yakınlaş",
  reset: "Sıfırla",
  brushSize: "Fırça",
  undo: "Geri al",
  clear: "Temizle",
  working: "İşleniyor…",
  preparing: "Fotoğraf hazırlanıyor…",
  smartWorking: "AI nesnenin sınırlarını çiziyor…",
  loadZero: "Resim çözümlenemedi (boyut 0).",
  loadHeic: "iPhone HEIC formatı desteklenmiyor. iPhone'da: Ayarlar → Kamera → Formatlar → 'En Uyumlu' (JPEG) seç.",
  loadFail: "Bu resim dosyası açılamadı. JPG / PNG / WEBP formatında olduğundan emin ol.",
  smartHelpTitle: "Tek Dokun Modu:",
  smartHelpBefore: "Silmek istediğin kişi/nesneye tek dokun yeter — AI sınırını otomatik algılayıp",
  smartHelpAfter: "boyayacak.",
  smartHelpFix: "Fazlalık çıkarsa Silgi ile düzelt.",
  panHelpTitle: "Kaydır:",
  panHelp: "Fotoğrafı sürükle. Mobilde iki parmakla zoom/pan da yapabilirsin.",
  activeBrush: "Aktif fırça:",
  mobileTip: "Mobilde iki parmakla yakınlaştır → daha rahat boya.",
  spillTip: "Yüze/saça taşarsan Silgi ile düzelt.",
};

interface Props {
  imageDataUrl: string;
  brushColor: BrushColor;
  onSubmit: (mask: SubmitPayload) => void;
  busy?: boolean;
  submitLabel?: string;
  /** Optional: enables the "🎯 Tek Dokun" auto-mask flow (SAM). */
  smartSelectFn?: (payload: {
    imageDataUrl: string;
    x: number;
    y: number;
  }) => Promise<SmartSelectResult | null>;
  labels?: Partial<BrushMaskEditorLabels>;
}

const TINT = {
  red: { r: 239, g: 68, b: 68 },
  blue: { r: 59, g: 130, b: 246 },
  magic: { r: 168, g: 85, b: 247 },
} as const;

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;

type Tool = "paint" | "erase" | "pan" | "smart";

export function BrushMaskEditor({
  imageDataUrl,
  brushColor,
  onSubmit,
  busy,
  submitLabel,
  smartSelectFn,
  labels: labelsOverride,
}: Props) {
  const labels = { ...DEFAULT_LABELS, ...labelsOverride };
  const resolvedSubmitLabel = submitLabel ?? labels.submitDefault;
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const imgCanvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const [brushSize, setBrushSize] = useState(40);
  const [tool, setTool] = useState<Tool>("paint");
  const [hasMask, setHasMask] = useState(false);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState<string>("");
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const [smartBusy, setSmartBusy] = useState(false);
  const historyRef = useRef<ImageData[]>([]);
  const drawingRef = useRef(false);
  const lastPtRef = useRef<{ x: number; y: number } | null>(null);

  const [bitmap, setBitmap] = useState<HTMLImageElement | null>(null);

  // Zoom & pan
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchRef = useRef<{
    startDist: number;
    startZoom: number;
    startPan: { x: number; y: number };
    startMid: { x: number; y: number };
  } | null>(null);
  const panDragRef = useRef<{
    startClient: { x: number; y: number };
    startPan: { x: number; y: number };
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadState("loading");
    setLoadError("");
    setBitmap(null);
    setImgSize(null);
    setZoom(1);
    setPan({ x: 0, y: 0 });

    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      if (cancelled) return;
      if (!img.naturalWidth || !img.naturalHeight) {
        setLoadError(labels.loadZero);
        setLoadState("error");
        return;
      }
      const MAX = 1600;
      const scale = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);
      setImgSize({ w, h });
      setBitmap(img);
      setLoadState("ready");
    };
    img.onerror = () => {
      if (cancelled) return;
      const isHeic = /^data:image\/(heic|heif)/i.test(imageDataUrl);
      setLoadError(
        isHeic
          ? labels.loadHeic
          : labels.loadFail,
      );
      setLoadState("error");
    };
    img.src = imageDataUrl;
    return () => {
      cancelled = true;
    };
  }, [imageDataUrl, labels.loadFail, labels.loadHeic, labels.loadZero]);

  useEffect(() => {
    if (loadState !== "ready" || !bitmap || !imgSize) return;
    const { w, h } = imgSize;
    for (const c of [imgCanvasRef.current, maskCanvasRef.current, previewCanvasRef.current]) {
      if (!c) continue;
      c.width = w;
      c.height = h;
    }
    const ictx = imgCanvasRef.current?.getContext("2d");
    if (ictx) {
      ictx.clearRect(0, 0, w, h);
      ictx.drawImage(bitmap, 0, 0, w, h);
    }
    const mctx = maskCanvasRef.current?.getContext("2d", { willReadFrequently: true });
    mctx?.clearRect(0, 0, w, h);
    const pctx = previewCanvasRef.current?.getContext("2d");
    pctx?.clearRect(0, 0, w, h);
    historyRef.current = [];
    setHasMask(false);
  }, [loadState, bitmap, imgSize]);

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
    const tint = TINT[brushColor];
    for (let i = 0; i < md.data.length; i += 4) {
      if (md.data[i + 3] > 0) {
        pd.data[i] = tint.r;
        pd.data[i + 1] = tint.g;
        pd.data[i + 2] = tint.b;
        pd.data[i + 3] = 140;
      }
    }
    pctx.putImageData(pd, 0, 0);
  }, [brushColor]);

  useEffect(() => {
    if (loadState === "ready") renderPreview();
  }, [brushColor, loadState, renderPreview]);

  const pushHistory = () => {
    const c = maskCanvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    historyRef.current.push(ctx.getImageData(0, 0, c.width, c.height));
    if (historyRef.current.length > 30) historyRef.current.shift();
  };

  const getImagePoint = (clientX: number, clientY: number) => {
    const c = maskCanvasRef.current;
    if (!c) return null;
    const rect = c.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * c.width,
      y: ((clientY - rect.top) / rect.height) * c.height,
    };
  };

  const drawLine = (from: { x: number; y: number }, to: { x: number; y: number }, erase: boolean) => {
    const ctx = maskCanvasRef.current?.getContext("2d");
    if (!ctx) return;
    const c = maskCanvasRef.current!;
    const scale = c.width / (c.getBoundingClientRect().width || c.width);
    const radius = (brushSize / 2) * scale;
    ctx.globalCompositeOperation = erase ? "destination-out" : "source-over";
    ctx.strokeStyle = "rgba(255,255,255,1)";
    ctx.lineWidth = radius * 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.globalCompositeOperation = "source-over";
  };

  // Pinch helpers
  const midpoint = (pts: { x: number; y: number }[]) => ({
    x: (pts[0].x + pts[1].x) / 2,
    y: (pts[0].y + pts[1].y) / 2,
  });
  const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(a.x - b.x, a.y - b.y);

  const containerLocal = (clientX: number, clientY: number) => {
    const c = containerRef.current;
    if (!c) return { x: clientX, y: clientY };
    const r = c.getBoundingClientRect();
    return { x: clientX - r.left, y: clientY - r.top };
  };

  const runSmartSelect = useCallback(
    async (imgPt: { x: number; y: number }) => {
      if (!smartSelectFn) return;
      const imgCanvas = imgCanvasRef.current;
      const maskCanvas = maskCanvasRef.current;
      if (!imgCanvas || !maskCanvas) return;
      setSmartBusy(true);
      try {
        const workingUrl = imgCanvas.toDataURL("image/png");
        const res = await smartSelectFn({
          imageDataUrl: workingUrl,
          x: Math.round(imgPt.x),
          y: Math.round(imgPt.y),
        });
        if (!res?.maskDataUrl) return;
        // Composite returned mask onto our mask canvas as white.
        const maskImg = new Image();
        maskImg.onload = () => {
          pushHistory();
          const mctx = maskCanvas.getContext("2d", { willReadFrequently: true });
          if (!mctx) return;
          const tmp = document.createElement("canvas");
          tmp.width = maskCanvas.width;
          tmp.height = maskCanvas.height;
          const tctx = tmp.getContext("2d", { willReadFrequently: true });
          if (!tctx) return;
          tctx.drawImage(maskImg, 0, 0, tmp.width, tmp.height);
          const md = tctx.getImageData(0, 0, tmp.width, tmp.height);
          const existing = mctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
          for (let i = 0; i < md.data.length; i += 4) {
            const lum = (md.data[i] + md.data[i + 1] + md.data[i + 2]) / 3;
            const strong = lum > 128 || md.data[i + 3] > 128;
            if (strong) {
              existing.data[i] = 255;
              existing.data[i + 1] = 255;
              existing.data[i + 2] = 255;
              existing.data[i + 3] = 255;
            }
          }
          mctx.putImageData(existing, 0, 0);
          renderPreview();
          setHasMask(true);
        };
        maskImg.src = res.maskDataUrl;
      } finally {
        setSmartBusy(false);
      }
    },
    [smartSelectFn, renderPreview],
  );

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (busy || smartBusy) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    // Two-finger → pinch/pan gesture, cancels any in-progress drawing.
    if (pointersRef.current.size === 2) {
      drawingRef.current = false;
      const pts = Array.from(pointersRef.current.values()).map((p) =>
        containerLocal(p.x, p.y),
      );
      pinchRef.current = {
        startDist: distance(pts[0], pts[1]),
        startZoom: zoom,
        startPan: pan,
        startMid: midpoint(pts),
      };
      return;
    }

    // Single pointer:
    if (tool === "pan" || (tool !== "smart" && zoom > 1 && e.pointerType === "mouse" && e.button === 1)) {
      panDragRef.current = {
        startClient: { x: e.clientX, y: e.clientY },
        startPan: pan,
      };
      return;
    }

    if (tool === "smart" && smartSelectFn) {
      const pt = getImagePoint(e.clientX, e.clientY);
      if (pt) runSmartSelect(pt);
      return;
    }

    const pt = getImagePoint(e.clientX, e.clientY);
    if (!pt) return;
    pushHistory();
    drawingRef.current = true;
    lastPtRef.current = pt;
    drawLine(pt, pt, tool === "erase");
    renderPreview();
    setHasMask(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size === 2 && pinchRef.current) {
      const pts = Array.from(pointersRef.current.values()).map((p) =>
        containerLocal(p.x, p.y),
      );
      const dist = distance(pts[0], pts[1]);
      const mid = midpoint(pts);
      const { startDist, startZoom, startPan, startMid } = pinchRef.current;
      const factor = dist / (startDist || 1);
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, startZoom * factor));
      // Keep pinch midpoint stable in image space, plus follow finger drag.
      const imgPtAtStart = {
        x: (startMid.x - startPan.x) / startZoom,
        y: (startMid.y - startPan.y) / startZoom,
      };
      const newPan = {
        x: mid.x - imgPtAtStart.x * newZoom,
        y: mid.y - imgPtAtStart.y * newZoom,
      };
      setZoom(newZoom);
      setPan(newPan);
      return;
    }

    if (panDragRef.current) {
      setPan({
        x: panDragRef.current.startPan.x + (e.clientX - panDragRef.current.startClient.x),
        y: panDragRef.current.startPan.y + (e.clientY - panDragRef.current.startClient.y),
      });
      return;
    }

    if (!drawingRef.current) return;
    const pt = getImagePoint(e.clientX, e.clientY);
    if (!pt || !lastPtRef.current) return;
    drawLine(lastPtRef.current, pt, tool === "erase");
    lastPtRef.current = pt;
    renderPreview();
  };

  const onPointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    if (pointersRef.current.size === 0) {
      panDragRef.current = null;
      drawingRef.current = false;
      lastPtRef.current = null;
    }
  };

  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!e.ctrlKey && !e.metaKey && Math.abs(e.deltaY) < 30) return;
    e.preventDefault();
    const local = containerLocal(e.clientX, e.clientY);
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * factor));
    const imgPt = { x: (local.x - pan.x) / zoom, y: (local.y - pan.y) / zoom };
    setPan({ x: local.x - imgPt.x * newZoom, y: local.y - imgPt.y * newZoom });
    setZoom(newZoom);
  };

  const handleZoom = (delta: number) => {
    const c = containerRef.current;
    if (!c) return;
    const r = c.getBoundingClientRect();
    const mid = { x: r.width / 2, y: r.height / 2 };
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * (delta > 0 ? 1.3 : 1 / 1.3)));
    const imgPt = { x: (mid.x - pan.x) / zoom, y: (mid.y - pan.y) / zoom };
    setPan({ x: mid.x - imgPt.x * newZoom, y: mid.y - imgPt.y * newZoom });
    setZoom(newZoom);
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
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
    if (historyRef.current.length === 0) {
      const d = ctx.getImageData(0, 0, c.width, c.height);
      let any = false;
      for (let i = 3; i < d.data.length; i += 4) {
        if (d.data[i] > 0) { any = true; break; }
      }
      setHasMask(any);
    }
  };

  const handleClear = () => {
    const c = maskCanvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    ctx?.clearRect(0, 0, c.width, c.height);
    historyRef.current = [];
    renderPreview();
    setHasMask(false);
  };

  const handleSubmit = () => {
    const mask = maskCanvasRef.current;
    const imageCanvas = imgCanvasRef.current;
    if (!mask || !imageCanvas) return;
    const out = document.createElement("canvas");
    out.width = mask.width;
    out.height = mask.height;
    const octx = out.getContext("2d");
    if (!octx) return;
    octx.fillStyle = "#000";
    octx.fillRect(0, 0, out.width, out.height);
    const src = mask.getContext("2d")!.getImageData(0, 0, mask.width, mask.height);
    const dst = octx.getImageData(0, 0, out.width, out.height);

    let sumX = 0, sumY = 0, count = 0;
    const w = out.width;
    for (let i = 0; i < src.data.length; i += 4) {
      if (src.data[i + 3] > 0) {
        dst.data[i] = 255;
        dst.data[i + 1] = 255;
        dst.data[i + 2] = 255;
        dst.data[i + 3] = 255;
        const px = (i / 4) % w;
        const py = Math.floor(i / 4 / w);
        sumX += px;
        sumY += py;
        count++;
      }
    }
    octx.putImageData(dst, 0, 0);

    const centroid = count > 0
      ? { x: Math.round(sumX / count), y: Math.round(sumY / count) }
      : null;

    onSubmit({
      workingImageDataUrl: imageCanvas.toDataURL("image/png"),
      maskDataUrl: out.toDataURL("image/png"),
      width: out.width,
      height: out.height,
      centroid,
      maskPixels: count,
      imagePixels: out.width * out.height,
    });
  };

  const tint = TINT[brushColor];
  const tintLabel =
    brushColor === "red"
      ? labels.redBrushName
      : brushColor === "magic"
        ? (labels.magicBrushName ?? labels.redBrushName)
        : labels.blueBrushName;
  const anyBusy = busy || smartBusy;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-2">
        {smartSelectFn && (
          <Button
            size="sm"
            variant={tool === "smart" ? "default" : "outline"}
            onClick={() => setTool("smart")}
            disabled={anyBusy}
            title={labels.smartTitle}
            className={tool === "smart" ? "bg-fuchsia-600 hover:bg-fuchsia-700 text-white" : ""}
          >
            <Wand2 className="w-4 h-4" /> {labels.smartButton}
          </Button>
        )}
        <Button
          size="sm"
          variant={tool === "paint" ? "default" : "outline"}
          onClick={() => setTool("paint")}
          disabled={anyBusy}
        >
          <Brush className="w-4 h-4" /> {labels.paint}
        </Button>
        <Button
          size="sm"
          variant={tool === "erase" ? "default" : "outline"}
          onClick={() => setTool("erase")}
          disabled={anyBusy}
        >
          <Eraser className="w-4 h-4" /> {labels.eraser}
        </Button>
        <Button
          size="sm"
          variant={tool === "pan" ? "default" : "outline"}
          onClick={() => setTool("pan")}
          disabled={anyBusy}
          title={labels.panTitle}
        >
          <Move className="w-4 h-4" /> {labels.pan}
        </Button>

        <div className="flex items-center gap-1 border-l border-border pl-2 ml-1">
          <Button size="icon" variant="outline" onClick={() => handleZoom(-1)} disabled={anyBusy || zoom <= MIN_ZOOM + 0.01} title={labels.zoomOut}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-xs text-muted-foreground tabular-nums w-10 text-center">{zoom.toFixed(1)}x</span>
          <Button size="icon" variant="outline" onClick={() => handleZoom(1)} disabled={anyBusy || zoom >= MAX_ZOOM - 0.01} title={labels.zoomIn}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          {zoom > 1.01 && (
            <Button size="sm" variant="ghost" onClick={resetView} disabled={anyBusy} className="text-xs">
              {labels.reset}
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 px-3 min-w-[160px]">
          <span className="text-xs text-muted-foreground whitespace-nowrap">{labels.brushSize}: {brushSize}px</span>
          <Slider
            value={[brushSize]}
            onValueChange={([v]) => setBrushSize(v)}
            min={8}
            max={120}
            step={2}
            className="flex-1"
            disabled={anyBusy || tool === "smart" || tool === "pan"}
          />
        </div>
        <div className="flex-1" />
        <Button size="sm" variant="outline" onClick={handleUndo} disabled={anyBusy || historyRef.current.length === 0}>
          <Undo2 className="w-4 h-4" /> {labels.undo}
        </Button>
        <Button size="sm" variant="outline" onClick={handleClear} disabled={anyBusy || !hasMask}>
          <RotateCcw className="w-4 h-4" /> {labels.clear}
        </Button>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={anyBusy || !hasMask}
          style={{
            backgroundColor: `rgb(${tint.r}, ${tint.g}, ${tint.b})`,
            color: "white",
          }}
        >
          {busy ? labels.working : resolvedSubmitLabel}
        </Button>
      </div>

      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-lg border border-border bg-[#f3f4f6] min-h-[280px]"
        style={{ touchAction: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onPointerLeave={onPointerEnd}
        onWheel={onWheel}
      >
        {loadState === "loading" && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 text-muted-foreground bg-[#f3f4f6]">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-sm">{labels.preparing}</span>
          </div>
        )}
        {loadState === "error" && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 p-6 text-center bg-rose-50">
            <AlertCircle className="w-8 h-8 text-rose-600" />
            <p className="text-sm font-medium text-rose-800 max-w-sm">{loadError}</p>
          </div>
        )}
        {smartBusy && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 bg-black/40 backdrop-blur-sm text-white">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-sm font-medium">{labels.smartWorking}</span>
          </div>
        )}
        <div
          ref={stageRef}
          className="relative w-full origin-top-left will-change-transform"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
          }}
        >
          <canvas ref={imgCanvasRef} className="block w-full h-auto pointer-events-none select-none" />
          <canvas
            ref={previewCanvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
          />
          <canvas
            ref={maskCanvasRef}
            className={`absolute inset-0 w-full h-full opacity-0 ${
              tool === "pan" ? "cursor-grab" : tool === "smart" ? "cursor-pointer" : "cursor-crosshair"
            }`}
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        {tool === "smart" ? (
          <>
            🎯 <strong className="text-fuchsia-700">{labels.smartHelpTitle}</strong> {labels.smartHelpBefore}{" "}
            <strong style={{ color: `rgb(${tint.r}, ${tint.g}, ${tint.b})` }}>{tintLabel.toLowerCase()}</strong>{" "}
            {labels.smartHelpAfter} {labels.smartHelpFix}
          </>
        ) : tool === "pan" ? (
          <>✋ <strong>{labels.panHelpTitle}</strong> {labels.panHelp}</>
        ) : (
          <>
            💡 {labels.activeBrush} <strong style={{ color: `rgb(${tint.r}, ${tint.g}, ${tint.b})` }}>{tintLabel}</strong>.{" "}
            {brushColor === "red"
              ? (labels.redTip ?? labels.mobileTip)
              : brushColor === "magic"
                ? (labels.magicTip ?? labels.mobileTip)
                : (labels.blueTip ?? labels.mobileTip)}
            {brushColor === "red" ? <> {labels.spillTip}</> : null}
          </>
        )}
      </p>
    </div>
  );
}
