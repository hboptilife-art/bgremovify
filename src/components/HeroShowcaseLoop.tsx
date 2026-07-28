import { useEffect, useState } from "react";
import { usePreferredLanguage, type AppLang } from "@/lib/language";
import watchAsset from "@/assets/showcase/watch.jpg.asset.json";
import perfumeAsset from "@/assets/showcase/perfume.jpg.asset.json";
import sneakerAsset from "@/assets/showcase/sneaker.jpg.asset.json";
import handbagAsset from "@/assets/showcase/handbag.jpg.asset.json";
import cosmeticAsset from "@/assets/showcase/cosmetic.jpg.asset.json";
import sunglassesAsset from "@/assets/showcase/sunglasses.jpg.asset.json";
import dressPair from "@/assets/vton-pairs/vton-dress-pair.jpg.asset.json";
import jacketPair from "@/assets/vton-pairs/vton-jacket-pair.jpg.asset.json";
import shirtPair from "@/assets/vton-pairs/vton-tshirt-pair.jpg.asset.json";
import watchPair from "@/assets/vton-pairs/vton-watch-pair.jpg.asset.json";

const STR: Record<string, Record<AppLang, string>> = {
  raw:       { tr:"Ham",             en:"Raw",             es:"Original",     de:"Roh",            ru:"Оригинал",   ar:"خام" },
  onModel:   { tr:"Model üzerinde",  en:"On model",        es:"En modelo",    de:"Am Model",       ru:"На модели",  ar:"على العارض" },
  studio:    { tr:"Stüdyo",          en:"Studio",          es:"Estudio",      de:"Studio",         ru:"Студия",     ar:"استوديو" },
  title:     { tr:"Ham → Stüdyo · Anında",  en:"Raw → Studio · Instantly", es:"De crudo a estudio · al instante", de:"Roh → Studio · sofort", ru:"Ориг. → Студия · мгновенно", ar:"خام → استوديو · فوراً" },
  catWatch:      { tr:"Lüks Saat",   en:"Luxury Watch",  es:"Reloj de lujo", de:"Luxusuhr",   ru:"Люкс часы", ar:"ساعة فاخرة" },
  catFragrance:  { tr:"Parfüm",      en:"Fragrance",     es:"Fragancia",     de:"Duft",       ru:"Парфюм",    ar:"عطر" },
  catSneakers:   { tr:"Sneaker",     en:"Sneakers",      es:"Zapatillas",    de:"Sneaker",    ru:"Кроссовки", ar:"سنيكрз" },
  catHandbags:   { tr:"Çanta",       en:"Handbag",       es:"Bolso",         de:"Handtasche", ru:"Сумка",     ar:"حقيبة" },
  catCosmetics:  { tr:"Kozmetik",    en:"Cosmetics",     es:"Cosméticos",    de:"Kosmetik",   ru:"Косметика", ar:"مستحضرات" },
  catEyewear:    { tr:"Gözlük",      en:"Eyewear",       es:"Gafas",         de:"Brille",     ru:"Очки",      ar:"نظارات" },
  catDress:      { tr:"Elbise",      en:"Dress",         es:"Vestido",       de:"Kleid",      ru:"Платье",    ar:"فستان" },
  catJacket:     { tr:"Ceket",       en:"Jacket",        es:"Chaqueta",      de:"Jacke",      ru:"Куртка",    ar:"سترة" },
  catShirt:      { tr:"Tişört",      en:"T-Shirt",       es:"Camiseta",      de:"T-Shirt",    ru:"Футболка",  ar:"قميص" },
};

type Kind = "cutout" | "vton";

type Slide = {
  id: string;
  kind: Kind;
  rawSrc?: string;
  processedBg?: string;
  pairSrc?: string;
  labelKey: keyof typeof STR;
};

const SLIDES: Slide[] = [
  { id: "dress",  kind: "vton",   pairSrc: dressPair.url,  labelKey: "catDress" },
  { id: "watch",  kind: "cutout", rawSrc: watchAsset.url,
    processedBg: "radial-gradient(ellipse at 50% 30%, #ffffff 0%, #f2ede4 55%, #d9cfbd 100%)", labelKey: "catWatch" },
  { id: "jacket", kind: "vton",   pairSrc: jacketPair.url, labelKey: "catJacket" },
  { id: "perfume",kind: "cutout", rawSrc: perfumeAsset.url,
    processedBg: "radial-gradient(ellipse at 50% 40%, #fde2e4 0%, #f5c6d0 45%, #d9a6b8 100%)", labelKey: "catFragrance" },
  { id: "shirt",  kind: "vton",   pairSrc: shirtPair.url,  labelKey: "catShirt" },
  { id: "sneaker",kind: "cutout", rawSrc: sneakerAsset.url,
    processedBg: "linear-gradient(180deg, #f8fafc 0%, #e7edf5 60%, #cfd8e6 100%)", labelKey: "catSneakers" },
  { id: "watchM", kind: "vton",   pairSrc: watchPair.url,  labelKey: "catWatch" },
  { id: "handbag",kind: "cutout", rawSrc: handbagAsset.url,
    processedBg: "radial-gradient(ellipse at 50% 30%, #fff6ea 0%, #f2dcbd 55%, #d9b98a 100%)", labelKey: "catHandbags" },
  { id: "cosm",   kind: "cutout", rawSrc: cosmeticAsset.url,
    processedBg: "radial-gradient(ellipse at 50% 35%, #eaf7f1 0%, #c9ecd8 55%, #a3d9bd 100%)", labelKey: "catCosmetics" },
  { id: "sun",    kind: "cutout", rawSrc: sunglassesAsset.url,
    processedBg: "radial-gradient(ellipse at 50% 30%, #fbf4e8 0%, #f0e0c2 55%, #d9c399 100%)", labelKey: "catEyewear" },
];

// Cinematic timing
const HOLD_RAW_MS   = 900;
const SWEEP_MS      = 1500;
const HOLD_FULL_MS  = 2200;
type Phase = "raw" | "sweep" | "full";

export function HeroShowcaseLoop() {
  const lang = usePreferredLanguage("en");
  const s = (k: keyof typeof STR) => STR[k][lang] ?? STR[k].en;

  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("raw");
  const slide = SLIDES[idx];

  useEffect(() => {
    let ms = HOLD_RAW_MS;
    let next: Phase = "sweep";
    if (phase === "sweep") { ms = SWEEP_MS; next = "full"; }
    else if (phase === "full") { ms = HOLD_FULL_MS; next = "raw"; }
    const t = window.setTimeout(() => {
      if (phase === "full") setIdx((i) => (i + 1) % SLIDES.length);
      setPhase(next);
    }, ms);
    return () => window.clearTimeout(t);
  }, [phase, idx]);

  // Center-out wipe: inset from both sides. 50% = fully closed, 0% = fully open.
  const insetPct = phase === "raw" ? 50 : 0;
  const isVton = slide.kind === "vton";
  const rightBadge = isVton ? s("onModel") : s("studio");

  // Pair images are 1280×720 (16:9) with raw|model side-by-side.
  // Each half is 8:9. Container aspect matches half aspect → zero cropping.
  // For VTON: single <img> at 200% container width (natural aspect preserved).
  //   RAW layer: translateX(0)   → left half fills frame exactly
  //   PROCESSED: translateX(-50%) → right half fills frame exactly
  const rawLayer = isVton ? (
    <div className="absolute inset-0 overflow-hidden bg-white">
      <img
        src={slide.pairSrc}
        alt=""
        className="absolute top-0 left-0 h-full max-w-none"
        style={{ width: "200%" }}
        draggable={false}
      />
    </div>
  ) : (
    <div className="absolute inset-0 bg-white">
      <img
        src={slide.rawSrc}
        alt=""
        loading="lazy"
        className="absolute inset-0 h-full w-full object-contain p-8 md:p-14"
        draggable={false}
      />
    </div>
  );

  const processedLayer = isVton ? (
    <div className="absolute inset-0 overflow-hidden bg-white">
      <img
        src={slide.pairSrc}
        alt=""
        className="absolute top-0 left-0 h-full max-w-none"
        style={{ width: "200%", transform: "translateX(-50%)" }}
        draggable={false}
      />
    </div>
  ) : (
    <div className="absolute inset-0" style={{ background: slide.processedBg }}>
      <img
        src={slide.rawSrc}
        alt=""
        className="absolute inset-0 h-full w-full object-contain p-8 md:p-14"
        style={{ mixBlendMode: "multiply" }}
        draggable={false}
      />
    </div>
  );

  return (
    <div className="relative mx-auto w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white p-3 shadow-2xl shadow-slate-900/10 md:p-5">

      {/* Top meta bar */}
      <div className="mb-2 flex items-center justify-between px-1 md:mb-3">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          {s("title")}
        </span>
        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
          {s(slide.labelKey)}
        </span>
      </div>

      {/* Giant cinema panel — dominates the viewport */}
      <div className="relative aspect-[8/9] w-full overflow-hidden rounded-2xl bg-white">
        {rawLayer}

        {/* PROCESSED revealed from CENTER outward via clip-path inset */}
        <div
          className="absolute inset-0"
          style={{
            clipPath: `inset(0 ${insetPct}% 0 ${insetPct}%)`,
            transition:
              phase === "sweep"
                ? `clip-path ${SWEEP_MS}ms cubic-bezier(0.7,0,0.2,1)`
                : "none",
            willChange: "clip-path",
          }}
        >
          {processedLayer}
        </div>

        {/* Twin laser lines opening outward from center */}
        {[/* left */ "left", /* right */ "right"].map((side) => (
          <div
            key={side}
            className="pointer-events-none absolute inset-y-0"
            style={{
              [side]: `${50 - insetPct}%`,
              transform: side === "left" ? "translateX(-50%)" : "translateX(50%)",
              width: "3px",
              transition:
                phase === "sweep"
                  ? `${side} ${SWEEP_MS}ms cubic-bezier(0.7,0,0.2,1)`
                  : "none",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0) 0%, #ffffff 50%, rgba(255,255,255,0) 100%)",
              boxShadow:
                "0 0 24px rgba(125,211,252,0.95), 0 0 60px rgba(29,107,255,0.7), 0 0 120px rgba(29,107,255,0.4)",
              opacity: phase === "full" ? 0 : 1,
            } as React.CSSProperties}
          />
        ))}
        {/* Center burst halo during sweep */}
        <div
          className="pointer-events-none absolute inset-y-0 left-1/2"
          style={{
            transform: "translateX(-50%)",
            width: "260px",
            opacity: phase === "sweep" ? 0.85 : 0,
            transition: "opacity 400ms ease",
            background:
              "radial-gradient(ellipse at center, rgba(125,211,252,0.55) 0%, rgba(29,107,255,0.25) 40%, rgba(29,107,255,0) 75%)",
            mixBlendMode: "screen",
            filter: "blur(2px)",
          }}
        />

        {/* Labels */}
        <span
          className="absolute left-3 top-3 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/95 backdrop-blur transition-opacity duration-300"
          style={{ opacity: phase === "full" ? 0 : 1 }}
        >
          {s("raw")}
        </span>
        <span
          className="absolute right-3 top-3 rounded-md bg-emerald-500/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur transition-opacity duration-300"
          style={{ opacity: phase === "raw" ? 0 : 1 }}
        >
          {rightBadge}
        </span>

        {/* Scan lines */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, rgba(0,0,0,0.9) 0 1px, transparent 1px 3px)",
          }}
        />
      </div>

      {/* Thumbnail strip — small product frames under main show */}
      <div className="mt-3 flex items-center justify-center gap-2 overflow-x-auto pb-1">
        {SLIDES.map((sl, i) => {
          const thumb = sl.kind === "vton" ? sl.pairSrc : sl.rawSrc;
          const isActive = i === idx;
          return (
            <button
              key={sl.id}
              type="button"
              onClick={() => { setIdx(i); setPhase("raw"); }}
              className={`relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border transition-all ${
                isActive
                  ? "border-slate-900 shadow-md ring-2 ring-slate-900/10 scale-105"
                  : "border-slate-200 opacity-60 hover:opacity-100"
              }`}
              aria-label={s(sl.labelKey)}
            >
              {sl.kind === "vton" ? (
                <img
                  src={thumb}
                  alt=""
                  className="absolute top-0 left-0 h-full max-w-none"
                  style={{ width: "200%", transform: "translateX(-50%)" }}
                  draggable={false}
                />
              ) : (
                <img
                  src={thumb}
                  alt=""
                  className="absolute inset-0 h-full w-full object-contain"
                  draggable={false}
                />
              )}

            </button>
          );
        })}
      </div>
    </div>
  );
}
