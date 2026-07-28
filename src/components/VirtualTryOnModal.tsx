import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search, Sparkles, Upload, RotateCcw, Wand2 } from "lucide-react";
import { listGallery, type GalleryCategory, type GalleryItem } from "@/lib/gallery.functions";
import { BeforeAfterReveal } from "@/components/BeforeAfterReveal";
import { useT } from "@/i18n/useT";


export type WearableAnchor =
  | "hat" | "glasses" | "earring" | "necklace" | "watch"
  | "ring" | "top" | "bottom" | "shoes" | "bag" | "generic";

export type TryOnRequest = {
  sceneUrl: string;
  scenePrompt: string | null;
  productDataUrl: string;
  wearableAnchor?: WearableAnchor;
};

type Overlay = {
  x: number; y: number; w: number; rot: number; op: number;
  skewX?: number; skewY?: number; bend?: number;
  flipH?: boolean; flipV?: boolean;
};

type PresetMeta = { emoji: string; overlay: Overlay; hint: string };
export const WEARABLE_PRESETS: Record<WearableAnchor, PresetMeta> = {
  hat:      { emoji: "🧢", overlay: { x: 50, y: 18, w: 40, rot: 0, op: 1 }, hint: "on top of the model's head, matching head tilt and hair volume" },
  glasses:  { emoji: "🕶️", overlay: { x: 50, y: 27, w: 30, rot: 0, op: 1 }, hint: "resting on the bridge of the nose, aligned with the eyes and ears" },
  earring:  { emoji: "💎", overlay: { x: 50, y: 30, w: 12, rot: 0, op: 1 }, hint: "hanging from the earlobe with natural drape" },
  necklace: { emoji: "📿", overlay: { x: 50, y: 40, w: 32, rot: 0, op: 1 }, hint: "resting on the collarbone / upper chest with correct curvature" },
  watch:    { emoji: "⌚", overlay: { x: 50, y: 62, w: 24, rot: 0, op: 1 }, hint: "wrapped around the wrist, band following wrist curvature" },
  ring:     { emoji: "💍", overlay: { x: 52, y: 62, w: 14, rot: 0, op: 1 }, hint: "worn on the finger with correct scale" },
  top:      { emoji: "👕", overlay: { x: 50, y: 55, w: 58, rot: 0, op: 1 }, hint: "worn on the torso, shoulder seams aligned, natural fabric drape" },
  bottom:   { emoji: "👖", overlay: { x: 50, y: 74, w: 48, rot: 0, op: 1 }, hint: "worn on hips/legs, waistband aligned, natural fabric drape" },
  shoes:    { emoji: "👟", overlay: { x: 50, y: 92, w: 38, rot: 0, op: 1 }, hint: "worn on the feet, correct perspective, floor contact shadow" },
  bag:      { emoji: "👜", overlay: { x: 62, y: 60, w: 32, rot: 0, op: 1 }, hint: "held in hand or on shoulder, strap correctly draped" },
  generic:  { emoji: "✨", overlay: { x: 50, y: 55, w: 42, rot: 0, op: 1 }, hint: "composed naturally into the scene with correct scale and lighting" },
};

const ANCHOR_LABEL_KEYS: Record<WearableAnchor, string> = {
  hat: "vton.anchorHat", glasses: "vton.anchorGlasses", earring: "vton.anchorEarring",
  necklace: "vton.anchorNecklace", watch: "vton.anchorWatch", ring: "vton.anchorRing",
  top: "vton.anchorTop", bottom: "vton.anchorBottom", shoes: "vton.anchorShoes",
  bag: "vton.anchorBag", generic: "vton.anchorGeneric",
};


type Step = "pick-product" | "pick-scene" | "preview" | "result";

/**
 * Preview-First Virtual Try-On:
 * 1) Upload product.
 * 2) Search & pick a template scene (900+ items).
 * 3) FREE preview — draggable/resizable overlay, 0 credits.
 * 4) Create — burns credits, calls Gemini 3 Pro Image, shows Before/After reveal.
 */
export function VirtualTryOnModal({
  onClose,
  onGenerate,
  onAddToCanvas,
  busy,
}: {
  onClose: () => void;
  onGenerate: (req: TryOnRequest) => Promise<string | null>;
  onAddToCanvas?: (dataUrl: string) => void;
  busy: boolean;
}) {
  const { t } = useT();
  const [step, setStep] = useState<Step>("pick-product");
  const [productUrl, setProductUrl] = useState<string | null>(null);
  const [scene, setScene] = useState<{
    item: GalleryItem;
    category: GalleryCategory | null;
  } | null>(null);
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<string | "all">("all");
  const [result, setResult] = useState<string | null>(null);
  const [anchor, setAnchor] = useState<WearableAnchor>("generic");
  const [overlay, setOverlay] = useState<Overlay>(WEARABLE_PRESETS.generic.overlay);
  const fileRef = useRef<HTMLInputElement>(null);

  const applyPreset = (a: WearableAnchor) => {
    setAnchor(a);
    setOverlay(WEARABLE_PRESETS[a].overlay);
  };


  const galleryQ = useQuery({
    queryKey: ["gallery"],
    queryFn: () => listGallery(),
    staleTime: 5 * 60 * 1000,
  });

  const catsById = useMemo(() => {
    const m = new Map<string, GalleryCategory>();
    for (const c of galleryQ.data?.categories ?? []) m.set(c.id, c);
    return m;
  }, [galleryQ.data]);

  const flatItems = useMemo(() => {
    const groups = galleryQ.data?.itemsByCategory ?? {};
    return Object.values(groups).flat();
  }, [galleryQ.data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return flatItems
      .filter((it) => activeCat === "all" || it.category_id === activeCat)
      .filter((it) => {
        if (!q) return true;
        const cat = catsById.get(it.category_id);
        return (
          (cat?.label ?? "").toLowerCase().includes(q) ||
          (cat?.unsplash_query ?? "").toLowerCase().includes(q) ||
          (cat?.background_prompt ?? "").toLowerCase().includes(q)
        );
      })
      .slice(0, 200);
  }, [flatItems, query, activeCat, catsById]);

  const [cleaningBg, setCleaningBg] = useState(false);

  const onPickProduct = (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const raw = String(reader.result);
      setProductUrl(raw);
      setStep("pick-scene");
      // Auto background removal — non-blocking, keeps original on failure.
      // Use only the stable RMBG cutout path; do not auto-fallback to flat-fill
      // or extra subject isolation because those paths can damage accessories.
      setCleaningBg(true);
      try {
        const { removeBackground } = await import("@/lib/remove-bg");
        const bgRemoved = await removeBackground(raw);
        const cleaned: string = await new Promise((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(String(r.result));
          r.onerror = () => reject(r.error);
          r.readAsDataURL(bgRemoved);
        });
        setProductUrl(cleaned);
      } catch (err) {
        console.warn("[VTON] auto bg removal failed, using original", err);
      } finally {
        setCleaningBg(false);
      }
    };
    reader.readAsDataURL(f);
  };

  const pickScene = (item: GalleryItem) => {
    setScene({ item, category: catsById.get(item.category_id) ?? null });
    setStep("preview");
  };

  const runCreate = async () => {
    if (!scene || !productUrl) return;
    const out = await onGenerate({
      sceneUrl: scene.item.image_url,
      scenePrompt: scene.category?.background_prompt ?? scene.category?.label ?? null,
      productDataUrl: productUrl,
      wearableAnchor: anchor,
    });
    if (out) {
      setResult(out);
      setStep("result");
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-sm">
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-br from-emerald-50 via-white to-white px-5 py-3">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
              <Sparkles className="h-3.5 w-3.5" /> {t("vton.badge")}
            </div>
            <h3 className="mt-0.5 text-[16px] font-semibold text-slate-900">
              {step === "pick-product" && t("vton.titleProduct")}
              {step === "pick-scene" && t("vton.titleScene")}
              {step === "preview" && t("vton.titlePreview")}
              {step === "result" && t("vton.titleResult")}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-white/80 p-1.5 text-slate-500 shadow hover:bg-white hover:text-slate-800"
            aria-label={t("vton.close")}
          >
            ✕
          </button>
        </div>

        <Stepper step={step} />


        <div className="flex-1 overflow-y-auto">
          {step === "pick-product" && (
            <div className="p-8 text-center">
              <button
                onClick={() => fileRef.current?.click()}
                className="mx-auto flex h-60 w-full max-w-md flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-slate-500 transition hover:border-emerald-400 hover:bg-emerald-50/40"
              >
                <Upload className="h-6 w-6" />
                <div className="text-[13px] font-semibold text-slate-700">
                  {t("vton.uploadClick")}
                </div>
                <div className="text-[11.5px] text-slate-400">
                  {t("vton.uploadHint")}
                </div>

              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onPickProduct(e.target.files)}
              />
            </div>
          )}

          {step === "pick-scene" && (
            <div className="p-4">
              <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t("vton.searchPlaceholder").replace("{count}", String(flatItems.length))}
                    className="h-10 w-full rounded-full border border-slate-200 bg-slate-50 pl-9 pr-3 text-[13px] text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>
              <div className="mb-3 flex gap-1 overflow-x-auto pb-1">
                <CatChip active={activeCat === "all"} onClick={() => setActiveCat("all")}>
                  {t("vton.allCategories")}
                </CatChip>

                {(galleryQ.data?.categories ?? []).slice(0, 20).map((c) => (
                  <CatChip
                    key={c.id}
                    active={activeCat === c.id}
                    onClick={() => setActiveCat(c.id)}
                  >
                    {c.emoji} {c.label}
                  </CatChip>
                ))}
              </div>
              {galleryQ.isLoading ? (
                <div className="flex h-40 items-center justify-center text-slate-400">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                  {filtered.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => pickScene(item)}
                      className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100 transition hover:border-emerald-400"
                    >
                      <img
                        src={item.thumb_url ?? item.image_url}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover transition group-hover:scale-105"
                      />
                    </button>
                  ))}
                  {filtered.length === 0 && (
                    <div className="col-span-full py-8 text-center text-[12.5px] text-slate-400">
                      {t("vton.noMatch").replace("{query}", query)}
                    </div>
                  )}

                </div>
              )}
            </div>
          )}

          {step === "preview" && productUrl && scene && (
            <PreviewStage
              sceneUrl={scene.item.image_url}
              productUrl={productUrl}
              overlay={overlay}
              onOverlayChange={setOverlay}
              categoryLabel={scene.category?.label ?? t("vton.customScene")}
              anchor={anchor}
              onAnchorChange={applyPreset}
            />
          )}


          {step === "result" && productUrl && result && (
            <div className="p-5">
              <BeforeAfterReveal
                beforeSrc={productUrl}
                afterSrc={result}
                beforeLabel={t("vton.rawProduct")}
                afterLabel="Neural Core™"

                aspectClass="aspect-[4/5]"
                onDownload={() => {
                  const a = document.createElement("a");
                  a.href = result;
                  a.download = `tryon-${Date.now()}.png`;
                  a.click();
                }}
                onSendToStudio={onAddToCanvas ? () => onAddToCanvas(result) : undefined}
                onRetry={() => {
                  setResult(null);
                  setStep("pick-scene");
                }}
              />
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3">
          <div className="text-[11.5px] text-slate-500">
            {cleaningBg && (
              <span className="mr-2 inline-flex items-center gap-1 text-emerald-600">
                <Loader2 className="h-3 w-3 animate-spin" /> {t("vton.cleaningBg")}
              </span>
            )}
            {step === "preview" && t("vton.footerPreview")}
            {step === "pick-scene" && t("vton.footerScene")}
            {step === "pick-product" && t("vton.footerProduct")}
            {step === "result" && t("vton.footerResult")}
          </div>
          <div className="flex gap-2">
            {step === "preview" && (
              <>
                <button
                  onClick={() => setStep("pick-scene")}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-[12.5px] font-semibold text-slate-600 hover:border-slate-300"
                >
                  {t("vton.changeScene")}
                </button>
                <button
                  onClick={runCreate}
                  disabled={busy || cleaningBg}
                  className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-[12.5px] font-semibold text-white shadow shadow-emerald-500/25 hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                >
                  {busy || cleaningBg ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> {cleaningBg ? t("vton.cleaning") : t("vton.composing")}
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" /> {t("vton.create")}
                    </>
                  )}
                </button>
              </>
            )}
            {step === "pick-scene" && (
              <button
                onClick={() => setStep("pick-product")}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-[12.5px] font-semibold text-slate-600 hover:border-slate-300"
              >
                {t("vton.changeProduct")}
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

function CatChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap rounded-full border px-3 py-1 text-[11.5px] font-semibold transition ${
        active
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
      }`}
    >
      {children}
    </button>
  );
}

function Stepper({ step }: { step: Step }) {
  const { t } = useT();
  const order: Step[] = ["pick-product", "pick-scene", "preview", "result"];
  const labels: Record<Step, string> = {
    "pick-product": t("vton.stepProduct"),
    "pick-scene": t("vton.stepTemplate"),
    preview: t("vton.stepPreview"),
    result: t("vton.stepReveal"),
  };

  const idx = order.indexOf(step);
  return (
    <div className="flex items-center gap-1 border-b border-slate-100 bg-white px-5 py-2">
      {order.map((s, i) => (
        <div key={s} className="flex items-center gap-1">
          <div
            className={`grid h-5 w-5 place-items-center rounded-full text-[10.5px] font-semibold ${
              i <= idx ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500"
            }`}
          >
            {i + 1}
          </div>
          <span
            className={`text-[11.5px] font-medium ${
              i === idx ? "text-slate-900" : "text-slate-400"
            }`}
          >
            {labels[s]}
          </span>
          {i < order.length - 1 && <span className="mx-2 text-slate-300">›</span>}
        </div>
      ))}
    </div>
  );
}

/* --- Preview stage: Smart-Fit + draggable / resizable / rotatable overlay --- */

function PreviewStage({
  sceneUrl,
  productUrl,
  overlay,
  onOverlayChange,
  categoryLabel,
  anchor,
  onAnchorChange,
}: {
  sceneUrl: string;
  productUrl: string;
  overlay: Overlay;
  onOverlayChange: (v: Overlay) => void;
  categoryLabel: string;
  anchor: WearableAnchor;
  onAnchorChange: (a: WearableAnchor) => void;
}) {
  const { t } = useT();
  const stageRef = useRef<HTMLDivElement>(null);

  const dragRef = useRef<null | {
    kind: "move" | "resize" | "rotate";
    startX: number; startY: number; init: Overlay;
    centerX?: number; centerY?: number;
  }>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current;
      const el = stageRef.current;
      if (!d || !el) return;
      const rect = el.getBoundingClientRect();
      if (d.kind === "move") {
        const dxPct = ((e.clientX - d.startX) / rect.width) * 100;
        const dyPct = ((e.clientY - d.startY) / rect.height) * 100;
        onOverlayChange({
          ...d.init,
          x: clamp(d.init.x + dxPct, 3, 97),
          y: clamp(d.init.y + dyPct, 3, 97),
        });
      } else if (d.kind === "resize") {
        const dxPct = ((e.clientX - d.startX) / rect.width) * 100;
        onOverlayChange({ ...d.init, w: clamp(d.init.w + dxPct, 8, 95) });
      } else if (d.kind === "rotate" && d.centerX !== undefined && d.centerY !== undefined) {
        const ang = (Math.atan2(e.clientY - d.centerY, e.clientX - d.centerX) * 180) / Math.PI;
        const startAng = (Math.atan2(d.startY - d.centerY, d.startX - d.centerX) * 180) / Math.PI;
        onOverlayChange({ ...d.init, rot: ((d.init.rot + (ang - startAng)) + 540) % 360 - 180 });
      }
    };
    const onUp = () => { dragRef.current = null; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [onOverlayChange]);

  const startDrag =
    (kind: "move" | "resize" | "rotate") =>
    (e: React.MouseEvent) => {
      e.preventDefault();
      const rect = stageRef.current?.getBoundingClientRect();
      const centerX = rect ? rect.left + (overlay.x / 100) * rect.width : undefined;
      const centerY = rect ? rect.top + (overlay.y / 100) * rect.height : undefined;
      dragRef.current = { kind, startX: e.clientX, startY: e.clientY, init: overlay, centerX, centerY };
    };

  return (
    <div className="p-4">
      {/* Wearable smart-fit chips */}
      <div className="mb-3">
        <div className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          <Wand2 className="h-3 w-3" /> {t("vton.smartFit")}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(WEARABLE_PRESETS) as WearableAnchor[]).map((k) => {
            const p = WEARABLE_PRESETS[k];
            const active = anchor === k;
            return (
              <button
                key={k}
                onClick={() => onAnchorChange(k)}
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11.5px] font-semibold transition ${
                  active
                    ? "border-emerald-600 bg-emerald-600 text-white shadow"
                    : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-700"
                }`}
              >
                <span>{p.emoji}</span> {t(ANCHOR_LABEL_KEYS[k])}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-2 flex items-center justify-between">
        <div className="text-[12px] font-semibold text-slate-700">
          {t("vton.scene")} · <span className="font-normal text-slate-500">{categoryLabel}</span>
        </div>
        <button
          onClick={() => onOverlayChange(WEARABLE_PRESETS[anchor].overlay)}
          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10.5px] font-semibold text-slate-600 hover:border-emerald-400 hover:text-emerald-700"
          title={t("vton.resetFit")}
        >
          <RotateCcw className="h-3 w-3" /> {t("vton.resetFit")}
        </button>
      </div>


      {/* 3D Wrap · Bend · Skew · Flip — sticky inside the modal so it never disappears while previewing */}
      <div className="sticky top-0 z-20 mx-auto mb-3 max-w-lg rounded-xl border-2 border-emerald-300 bg-emerald-50/95 p-3 shadow-lg backdrop-blur">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
            <Wand2 className="h-3 w-3" /> {t("vton.vtoControlsTitle")}
          </div>
          <button
            onClick={() => onOverlayChange({ ...overlay, skewX: 0, skewY: 0, bend: 0, flipH: false, flipV: false })}
            className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-emerald-700 hover:border-emerald-400"
          >
            {t("vton.resetWarp")}
          </button>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <FineSlider
            label={t("vton.wrapBend")}
            min={-60} max={60} value={Math.round(overlay.bend ?? 0)}
            onChange={(v) => onOverlayChange({ ...overlay, bend: v })}
            suffix="°"
          />
          <FineSlider
            label={t("vton.skewX")}
            min={-45} max={45} value={Math.round(overlay.skewX ?? 0)}
            onChange={(v) => onOverlayChange({ ...overlay, skewX: v })}
            suffix="°"
          />
          <FineSlider
            label={t("vton.skewY")}
            min={-45} max={45} value={Math.round(overlay.skewY ?? 0)}
            onChange={(v) => onOverlayChange({ ...overlay, skewY: v })}
            suffix="°"
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <FlipToggle
            active={Boolean(overlay.flipH)}
            onClick={() => onOverlayChange({ ...overlay, flipH: !overlay.flipH })}
            label={t("vton.flipH")}
          />
          <FlipToggle
            active={Boolean(overlay.flipV)}
            onClick={() => onOverlayChange({ ...overlay, flipV: !overlay.flipV })}
            label={t("vton.flipV")}
          />
        </div>

      </div>

      <div
        ref={stageRef}
        className="relative mx-auto aspect-[4/5] w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-slate-100"
      >
        <img src={sceneUrl} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} />

        {/* Product overlay */}
        <div
          className="absolute cursor-move touch-none"
          style={{
            left: `${overlay.x}%`,
            top: `${overlay.y}%`,
            width: `${overlay.w}%`,
            opacity: overlay.op,
            transform: `translate(-50%, -50%) rotate(${overlay.rot}deg) skew(${overlay.skewX ?? 0}deg, ${overlay.skewY ?? 0}deg) scale(${overlay.flipH ? -1 : 1}, ${overlay.flipV ? -1 : 1})${overlay.bend && Math.abs(overlay.bend) > 0.5 ? ` perspective(900px) rotateX(${overlay.bend}deg)` : ""}`,
            transformStyle: "preserve-3d",
          }}
          onMouseDown={startDrag("move")}
        >
          <img
            src={productUrl}
            alt=""
            className="w-full select-none drop-shadow-2xl"
            draggable={false}
          />
          {/* resize handle */}
          <div
            onMouseDown={(e) => { e.stopPropagation(); startDrag("resize")(e); }}
            className="absolute -bottom-2 -right-2 h-4 w-4 cursor-nwse-resize rounded-full border-2 border-emerald-500 bg-white shadow"
            title="Drag to resize"
          />
          {/* rotate handle */}
          <div
            onMouseDown={(e) => { e.stopPropagation(); startDrag("rotate")(e); }}
            className="absolute -top-6 left-1/2 -translate-x-1/2 flex h-5 w-5 cursor-grab items-center justify-center rounded-full border-2 border-emerald-500 bg-white text-emerald-600 shadow"
            title="Drag to rotate"
          >
            <RotateCcw className="h-2.5 w-2.5" />
          </div>
        </div>
      </div>

      {/* Fine controls — Size / Rotate / Opacity */}
      <div className="mx-auto mt-2 grid max-w-lg gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-3">
        <FineSlider
          label={t("vton.size")}
          min={8} max={95} value={overlay.w}
          onChange={(v) => onOverlayChange({ ...overlay, w: v })}
          suffix="%"
        />
        <FineSlider
          label={t("vton.rotate")}
          min={-180} max={180} value={Math.round(overlay.rot)}
          onChange={(v) => onOverlayChange({ ...overlay, rot: v })}
          suffix="°"
        />
        <FineSlider
          label={t("vton.opacity")}
          min={20} max={100} value={Math.round(overlay.op * 100)}
          onChange={(v) => onOverlayChange({ ...overlay, op: v / 100 })}
          suffix="%"
        />
      </div>

      {/* Fine controls */}
      <p className="mt-2 text-center text-[11.5px] text-slate-500">
        {t("vton.controlsHint")}
      </p>

    </div>
  );
}

function FlipToggle({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
        active
          ? "border-emerald-600 bg-emerald-600 text-white"
          : "border-emerald-200 bg-white text-emerald-700 hover:border-emerald-400"
      }`}
    >
      ↔ {label}
    </button>
  );
}

function FineSlider({
  label, min, max, value, onChange, suffix,
}: { label: string; min: number; max: number; value: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <label className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-[10.5px] font-semibold uppercase tracking-widest text-slate-500">
        <span>{label}</span>
        <span className="text-slate-700">{value}{suffix ?? ""}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-emerald-600"
      />
    </label>
  );
}


function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
