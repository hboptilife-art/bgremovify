// Claid-style parameter drawers for Studio tools.
// Self-contained: each panel manages its own local UI; parents pass callbacks
// (onApply) so wiring to backend can happen incrementally without touching UI.

import { useRef, useState } from "react";
import {
  ArrowUpRight,
  Brush,
  Camera,
  Crop,
  Droplets,
  Lock,
  Sun,
  Wand2,
  SlidersHorizontal,
  Info,
} from "lucide-react";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">
      {children}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px]">
      <span className="flex items-center gap-1.5 text-slate-700">
        {label}
        {hint && (
          <span title={hint} className="text-slate-400">
            <Info className="h-3 w-3" />
          </span>
        )}
      </span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-4 w-7 items-center rounded-full transition ${
          checked ? "bg-[#1d6bff]" : "bg-slate-300"
        }`}
      >
        <span
          className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition ${
            checked ? "translate-x-3.5" : "translate-x-0.5"
          }`}
        />
      </button>
    </label>
  );
}

function Chip({
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
      className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition ${
        active
          ? "border-[#1d6bff] bg-[#1d6bff]/[0.08] text-[#1d6bff]"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
      }`}
    >
      {children}
    </button>
  );
}

function ApplyButton({
  onClick,
  busy,
  cost,
  icon: Icon = Wand2,
  label = "Apply operation",
}: {
  onClick: () => void;
  busy?: boolean;
  cost: number;
  icon?: React.ComponentType<{ className?: string }>;
  label?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2.5 text-[12px] font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
    >
      <Icon className="h-3.5 w-3.5" />
      {label} ({cost} {cost === 1 ? "credit" : "credits"})
    </button>
  );
}

/* ─────────────────────────── 1. Upscale ─────────────────────────── */
export function UpscalePanel({
  onApply,
  busy,
}: {
  onApply: (opts: { scale: 2 | 4; model: "prime" | "gentle"; legacy: string | null }) => void;
  busy?: boolean;
}) {
  const [w, setW] = useState<number | "">("");
  const [h, setH] = useState<number | "">("");
  const [linked, setLinked] = useState(true);

  return (
    <div className="space-y-4">
      <div>
        <SectionLabel>Target size</SectionLabel>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            placeholder="W"
            value={w}
            onChange={(e) => setW(e.target.value === "" ? "" : Number(e.target.value))}
            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11.5px] focus:border-[#1d6bff] focus:outline-none focus:ring-2 focus:ring-[#1d6bff]/20"
          />
          <button
            onClick={() => setLinked((v) => !v)}
            className={`shrink-0 rounded-md p-1.5 ${linked ? "bg-[#1d6bff]/10 text-[#1d6bff]" : "text-slate-400"}`}
            title="Lock aspect ratio"
          >
            <Lock className="h-3.5 w-3.5" />
          </button>
          <input
            type="number"
            placeholder="H"
            value={h}
            onChange={(e) => setH(e.target.value === "" ? "" : Number(e.target.value))}
            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11.5px] focus:border-[#1d6bff] focus:outline-none focus:ring-2 focus:ring-[#1d6bff]/20"
          />
        </div>
      </div>

      <p className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-[10.5px] leading-snug text-slate-500">
        Studio Ultra HD — brand text ve logo detaylarını koruyarak yeniden ölçekler.
      </p>

      <ApplyButton
        onClick={() => onApply({ scale: 2, model: "prime", legacy: null })}
        busy={busy}
        cost={2}
        icon={ArrowUpRight}
      />
    </div>
  );
}


/* ─────────────────────── 2. Erase Brush ─────────────────────── */
export function EraseBrushPanel({ onApply, busy }: { onApply: () => void; busy?: boolean }) {
  const [size, setSize] = useState(40);
  const [feather, setFeather] = useState(20);
  const [preserve, setPreserve] = useState(true);
  return (
    <div className="space-y-4">
      <button
        onClick={() => {}}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11.5px] font-semibold text-slate-700 hover:border-slate-300"
      >
        Reset painted area
      </button>
      <div>
        <div className="mb-1.5 flex items-center justify-between text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">
          <span>Brush size</span>
          <span className="text-[11px] text-slate-700 normal-case">{size}px</span>
        </div>
        <input type="range" min={4} max={200} value={size} onChange={(e) => setSize(Number(e.target.value))} className="w-full accent-[#1d6bff]" />
      </div>
      <div>
        <div className="mb-1.5 flex items-center justify-between text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">
          <span>Feathering</span>
          <span className="text-[11px] text-slate-700 normal-case">{feather}%</span>
        </div>
        <input type="range" min={0} max={100} value={feather} onChange={(e) => setFeather(Number(e.target.value))} className="w-full accent-[#1d6bff]" />
      </div>
      <Toggle checked={preserve} onChange={setPreserve} label="Preserve product" hint="Otomatik olarak ana ürünü koru." />
      <ApplyButton onClick={onApply} busy={busy} cost={1} icon={Brush} />
    </div>
  );
}

/* ─────────────────────── 3. AI Edit ─────────────────────── */
export function AIEditPanel({ onApply, busy }: { onApply: (opts: { prompt: string; res: "default" | "2k" | "4k"; count: 1 | 2 | 3 | 4 }) => void; busy?: boolean }) {
  const [prompt, setPrompt] = useState("");
  const [res, setRes] = useState<"default" | "2k" | "4k">("default");
  const [count, setCount] = useState<1 | 2 | 3 | 4>(1);
  return (
    <div className="space-y-4">
      <div>
        <SectionLabel>Describe the change</SectionLabel>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          placeholder="Change the shirt colour to navy blue, keep everything else identical…"
          className="w-full resize-none rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11.5px] leading-snug focus:border-[#1d6bff] focus:outline-none focus:ring-2 focus:ring-[#1d6bff]/20"
        />
      </div>
      <div>
        <SectionLabel>Extra inputs</SectionLabel>
        <button className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-[11px] font-semibold text-slate-500 hover:border-[#1d6bff] hover:text-[#1d6bff]">
          + Add reference image
        </button>
      </div>
      <div>
        <SectionLabel>Resolution</SectionLabel>
        <div className="flex gap-1.5">
          {(["default", "2k", "4k"] as const).map((r) => (
            <Chip key={r} active={res === r} onClick={() => setRes(r)}>
              {r === "default" ? "Default" : r.toUpperCase()}
            </Chip>
          ))}
        </div>
      </div>
      <div>
        <SectionLabel>Variations</SectionLabel>
        <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
          {([1, 2, 3, 4] as const).map((n) => (
            <button
              key={n}
              onClick={() => setCount(n)}
              className={`flex-1 rounded-md px-2 py-1.5 text-[11px] font-semibold transition ${
                count === n ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      <ApplyButton onClick={() => onApply({ prompt, res, count })} busy={busy} cost={count * 2} icon={Wand2} />
    </div>
  );
}

/* ─────────────────────── 4. Shadows ─────────────────────── */
export function ShadowsPanel({ onApply, busy }: { onApply: (opts: { style: "auto" | "front" | "flat"; bg: "transparent" | "color"; color: string }) => void; busy?: boolean }) {
  const [style, setStyle] = useState<"auto" | "front" | "flat">("auto");
  const [bg, setBg] = useState<"transparent" | "color">("transparent");
  const [color, setColor] = useState("#FFFFFF");
  return (
    <div className="space-y-4">
      <div>
        <SectionLabel>Shadow style</SectionLabel>
        <div className="grid grid-cols-3 gap-1.5">
          {(["auto", "front", "flat"] as const).map((s) => (
            <Chip key={s} active={style === s} onClick={() => setStyle(s)}>
              {s[0].toUpperCase() + s.slice(1)}
            </Chip>
          ))}
        </div>
      </div>
      <div>
        <SectionLabel>Background</SectionLabel>
        <div className="flex gap-1.5">
          <Chip active={bg === "transparent"} onClick={() => setBg("transparent")}>Transparent</Chip>
          <Chip active={bg === "color"} onClick={() => setBg("color")}>Color</Chip>
        </div>
        {bg === "color" && (
          <div className="mt-2 flex items-center gap-2">
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-8 w-10 cursor-pointer rounded border border-slate-200" />
            <input value={color} onChange={(e) => setColor(e.target.value)} className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11.5px] font-mono" />
          </div>
        )}
      </div>
      <ApplyButton onClick={() => onApply({ style, bg, color })} busy={busy} cost={1} icon={Sun} />
    </div>
  );
}

/* ─────────────────────── 5. Light fix & colors ─────────────────────── */
export function LightFixPanel({ onApply, busy }: { onApply: () => void; busy?: boolean }) {
  const [hdr, setHdr] = useState(50);
  const [is360, setIs360] = useState(false);
  const [exposure, setExposure] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [sharpness, setSharpness] = useState(0);
  const rows: [string, number, (v: number) => void][] = [
    ["Exposure", exposure, setExposure],
    ["Saturation", saturation, setSaturation],
    ["Contrast", contrast, setContrast],
    ["Sharpness", sharpness, setSharpness],
  ];
  return (
    <div className="space-y-4">
      <div>
        <div className="mb-1.5 flex items-center justify-between text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">
          <span>HDR intensity</span>
          <span className="text-[11px] text-slate-700 normal-case">{hdr}%</span>
        </div>
        <input type="range" min={0} max={100} value={hdr} onChange={(e) => setHdr(Number(e.target.value))} className="w-full accent-[#1d6bff]" />
      </div>
      <Toggle checked={is360} onChange={setIs360} label="360° image" hint="Enable panorama-aware processing." />
      <div className="space-y-3 border-t border-slate-100 pt-3">
        {rows.map(([label, value, setter]) => (
          <div key={label}>
            <div className="mb-1 flex items-center justify-between text-[11px] text-slate-600">
              <span>{label}</span>
              <span className="tabular-nums text-slate-700">{value > 0 ? `+${value}` : value}</span>
            </div>
            <input type="range" min={-100} max={100} value={value} onChange={(e) => setter(Number(e.target.value))} className="w-full accent-[#1d6bff]" />
          </div>
        ))}
      </div>
      <ApplyButton onClick={onApply} busy={busy} cost={1} icon={SlidersHorizontal} />
    </div>
  );
}

/* ─────────────────────── 6. Resize & Expand ─────────────────────── */
export function ResizeExpandPanel({ onApply, busy }: { onApply: (opts: { fit: "crop" | "resize" | "outpaint" | "canvas"; w: number | ""; h: number | ""; unit: "px" | "in" }) => void; busy?: boolean }) {
  const [fit, setFit] = useState<"crop" | "resize" | "outpaint" | "canvas">("crop");
  const [w, setW] = useState<number | "">("");
  const [h, setH] = useState<number | "">("");
  const [unit, setUnit] = useState<"px" | "in">("px");
  const presets = [
    { id: "ig-square", label: "Instagram Post", w: 1080, h: 1080 },
    { id: "ig-story", label: "Instagram Story", w: 1080, h: 1920 },
    { id: "yt-thumb", label: "YouTube Thumb", w: 1280, h: 720 },
    { id: "meta-cover", label: "Meta Cover", w: 1200, h: 630 },
  ];
  return (
    <div className="space-y-4">
      <div>
        <SectionLabel>Fit mode</SectionLabel>
        <div className="grid grid-cols-2 gap-1.5">
          {(["crop", "resize", "outpaint", "canvas"] as const).map((f) => (
            <Chip key={f} active={fit === f} onClick={() => setFit(f)}>
              {f[0].toUpperCase() + f.slice(1)}
            </Chip>
          ))}
        </div>
      </div>
      <div>
        <SectionLabel>Social presets</SectionLabel>
        <div className="grid grid-cols-2 gap-1.5">
          {presets.map((p) => (
            <button
              key={p.id}
              onClick={() => { setW(p.w); setH(p.h); setUnit("px"); }}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-left text-[10.5px] font-medium text-slate-600 hover:border-[#1d6bff] hover:text-[#1d6bff]"
            >
              <div className="truncate">{p.label}</div>
              <div className="text-[9.5px] text-slate-400">{p.w}×{p.h}</div>
            </button>
          ))}
        </div>
      </div>
      <div>
        <SectionLabel>Output size</SectionLabel>
        <div className="flex items-center gap-1.5">
          <input type="number" placeholder="W" value={w} onChange={(e) => setW(e.target.value === "" ? "" : Number(e.target.value))} className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11.5px]" />
          <span className="text-slate-400">×</span>
          <input type="number" placeholder="H" value={h} onChange={(e) => setH(e.target.value === "" ? "" : Number(e.target.value))} className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11.5px]" />
          <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            {(["px", "in"] as const).map((u) => (
              <button key={u} onClick={() => setUnit(u)} className={`rounded-md px-2 py-1 text-[10.5px] font-semibold ${unit === u ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>{u}</button>
            ))}
          </div>
        </div>
      </div>
      <ApplyButton onClick={() => onApply({ fit, w, h, unit })} busy={busy} cost={1} icon={Crop} />
    </div>
  );
}

/* ─────────────────────── 7. Blur background ─────────────────────── */
export function BlurBackgroundPanel({ onApply, busy }: { onApply: (opts: { kind: "general" | "product" | "car" | "car_plate"; strength: "low" | "medium" | "high"; type: "gaussian" | "radial" | "bokeh" }) => void; busy?: boolean }) {
  const [kind, setKind] = useState<"general" | "product" | "car" | "car_plate">("general");
  const [strength, setStrength] = useState<"low" | "medium" | "high">("medium");
  const [type, setType] = useState<"gaussian" | "radial" | "bokeh">("gaussian");
  return (
    <div className="space-y-4">
      <div>
        <SectionLabel>Image type</SectionLabel>
        <div className="grid grid-cols-2 gap-1.5">
          {(["general", "product", "car", "car_plate"] as const).map((k) => (
            <Chip key={k} active={kind === k} onClick={() => setKind(k)}>
              {k === "car_plate" ? "Car plate" : k[0].toUpperCase() + k.slice(1)}
            </Chip>
          ))}
        </div>
      </div>
      <div>
        <SectionLabel>Blur strength</SectionLabel>
        <div className="flex gap-1.5">
          {(["low", "medium", "high"] as const).map((s) => (
            <Chip key={s} active={strength === s} onClick={() => setStrength(s)}>
              {s[0].toUpperCase() + s.slice(1)}
            </Chip>
          ))}
        </div>
      </div>
      <div>
        <SectionLabel>Blur type</SectionLabel>
        <div className="grid grid-cols-3 gap-1.5">
          {(["gaussian", "radial", "bokeh"] as const).map((tp) => (
            <Chip key={tp} active={type === tp} onClick={() => setType(tp)}>
              {tp[0].toUpperCase() + tp.slice(1)}
            </Chip>
          ))}
        </div>
      </div>
      <ApplyButton onClick={() => onApply({ kind, strength, type })} busy={busy} cost={1} icon={Droplets} />
    </div>
  );
}

export function PanelIcon({ tool }: { tool: string }) {
  switch (tool) {
    case "upscale": return <ArrowUpRight className="h-3.5 w-3.5" />;
    case "erase-brush": return <Brush className="h-3.5 w-3.5" />;
    case "ai-edit": return <Wand2 className="h-3.5 w-3.5" />;
    case "shadows": return <Sun className="h-3.5 w-3.5" />;
    case "light-fix": return <SlidersHorizontal className="h-3.5 w-3.5" />;
    case "resize-expand": return <Crop className="h-3.5 w-3.5" />;
    case "blur-bg": return <Droplets className="h-3.5 w-3.5" />;
    default: return <Camera className="h-3.5 w-3.5" />;
  }
}

export const PANEL_TITLES: Record<string, string> = {
  upscale: "Improve quality & Upscale",
  "erase-brush": "Erase brush",
  "ai-edit": "AI Edit",
  shadows: "Add shadows",
  "light-fix": "Fix light & colors",
  "resize-expand": "Resize & Expand",
  "blur-bg": "Blur background",
  "add-text": "Add text & badges",
};

/* ─────────────────────── 8. Add Text & Badges ─────────────────────── */

export type TextPresetSpec = {
  id: string;
  label: string;
  text: string;
  fontSize: number;
  color: string;
  weight: number;
  w: number;
  h: number;
};

export type BadgePresetSpec = {
  id: string;
  label: string;
  text: string;
  fontSize: number;
  textColor: string;
  fill: string;
  stroke?: string;
  weight: number;
  shape: "pill" | "circle" | "rect";
  w: number;
  h: number;
};

export const TEXT_STYLE_PRESETS: TextPresetSpec[] = [
  { id: "headline", label: "Headline", text: "Your bold headline", fontSize: 56, color: "#0f172a", weight: 800, w: 520, h: 96 },
  { id: "subhead", label: "Subhead", text: "A supporting subheadline", fontSize: 26, color: "#334155", weight: 600, w: 440, h: 60 },
  { id: "body", label: "Body copy", text: "Short descriptive copy goes here.", fontSize: 16, color: "#475569", weight: 400, w: 340, h: 64 },
  { id: "quote", label: "Quote", text: "“Loved by 1000+ shoppers.”", fontSize: 22, color: "#111827", weight: 500, w: 380, h: 60 },
  { id: "display", label: "Display", text: "SALE", fontSize: 96, color: "#dc2626", weight: 900, w: 360, h: 140 },
  { id: "elegant", label: "Elegant", text: "Nouveau", fontSize: 44, color: "#0f172a", weight: 300, w: 400, h: 80 },
  { id: "tag", label: "Price tag", text: "$49.90", fontSize: 34, color: "#0f172a", weight: 700, w: 240, h: 70 },
  { id: "eyebrow", label: "Eyebrow", text: "NEW COLLECTION", fontSize: 13, color: "#64748b", weight: 700, w: 260, h: 30 },
];

const POPULAR_TEXT_IDS = ["headline", "display", "elegant", "tag"];

export const MARKETING_BADGE_PRESETS: BadgePresetSpec[] = [
  { id: "shop-now", label: "Shop now", text: "SHOP NOW", fontSize: 22, textColor: "#ffffff", fill: "#0f172a", weight: 800, shape: "pill", w: 220, h: 56 },
  { id: "buy-now", label: "Buy now", text: "BUY NOW →", fontSize: 22, textColor: "#0f172a", fill: "#facc15", weight: 800, shape: "pill", w: 240, h: 56 },
  { id: "off-50", label: "50% OFF", text: "50% OFF", fontSize: 34, textColor: "#ffffff", fill: "#dc2626", weight: 900, shape: "circle", w: 160, h: 160 },
  { id: "off-30", label: "30% OFF", text: "30% OFF", fontSize: 30, textColor: "#ffffff", fill: "#ea580c", weight: 900, shape: "circle", w: 150, h: 150 },
  { id: "off-70", label: "70% OFF", text: "-70%", fontSize: 44, textColor: "#ffffff", fill: "#be123c", weight: 900, shape: "circle", w: 170, h: 170 },
  { id: "5star", label: "5-star rated", text: "★★★★★  1000+ reviews", fontSize: 16, textColor: "#0f172a", fill: "#fef3c7", stroke: "#f59e0b", weight: 700, shape: "pill", w: 300, h: 46 },
  { id: "money-back", label: "Money back", text: "✓ MONEY BACK GUARANTEE", fontSize: 15, textColor: "#065f46", fill: "#d1fae5", stroke: "#10b981", weight: 800, shape: "pill", w: 290, h: 44 },
  { id: "limited", label: "Limited stock", text: "⏳ LIMITED STOCK", fontSize: 16, textColor: "#ffffff", fill: "#b91c1c", weight: 800, shape: "pill", w: 240, h: 44 },
  { id: "stay-fresh", label: "Stay fresh", text: "STAY FRESH", fontSize: 18, textColor: "#065f46", fill: "#a7f3d0", weight: 800, shape: "pill", w: 200, h: 44 },
  { id: "free-ship", label: "Free shipping", text: "🚚 FREE SHIPPING", fontSize: 16, textColor: "#ffffff", fill: "#1d4ed8", weight: 800, shape: "pill", w: 260, h: 44 },
  { id: "new", label: "New arrival", text: "NEW ARRIVAL", fontSize: 18, textColor: "#ffffff", fill: "#0f172a", weight: 800, shape: "pill", w: 220, h: 44 },
  { id: "best", label: "Best seller", text: "★ BEST SELLER", fontSize: 18, textColor: "#78350f", fill: "#fde68a", weight: 800, shape: "pill", w: 230, h: 44 },
  { id: "hot", label: "Hot deal", text: "🔥 HOT DEAL", fontSize: 20, textColor: "#ffffff", fill: "#ea580c", weight: 800, shape: "pill", w: 210, h: 46 },
  { id: "premium", label: "Premium", text: "PREMIUM", fontSize: 20, textColor: "#78350f", fill: "#fcd34d", weight: 800, shape: "pill", w: 190, h: 44 },
  { id: "eco", label: "Eco friendly", text: "🌿 ECO FRIENDLY", fontSize: 15, textColor: "#065f46", fill: "#d1fae5", weight: 800, shape: "pill", w: 240, h: 42 },
  { id: "sale-tr", label: "Özel indirim", text: "ÖZEL İNDİRİM", fontSize: 20, textColor: "#ffffff", fill: "#be185d", weight: 800, shape: "pill", w: 240, h: 46 },
  { id: "cargo-tr", label: "Kargo bedava", text: "KARGO BEDAVA", fontSize: 18, textColor: "#ffffff", fill: "#047857", weight: 800, shape: "pill", w: 240, h: 44 },
  { id: "sale-red", label: "Sale", text: "SALE", fontSize: 44, textColor: "#ffffff", fill: "#dc2626", weight: 900, shape: "rect", w: 200, h: 90 },
];

function BadgePreview({ b }: { b: BadgePresetSpec }) {
  const radius = b.shape === "circle" ? "50%" : b.shape === "pill" ? "999px" : "8px";
  const isCircle = b.shape === "circle";
  return (
    <div
      className="flex items-center justify-center px-2 text-center leading-tight"
      style={{
        background: b.fill,
        color: b.textColor,
        fontWeight: b.weight,
        fontSize: Math.min(isCircle ? 11 : 10.5, b.fontSize / 3 + 6),
        borderRadius: radius,
        border: b.stroke ? `1.5px solid ${b.stroke}` : "none",
        width: isCircle ? 54 : "auto",
        height: isCircle ? 54 : 30,
        minWidth: isCircle ? 54 : 60,
        maxWidth: "100%",
        boxShadow: "0 2px 6px rgba(15,23,42,0.12)",
      }}
    >
      <span className="truncate">{b.text}</span>
    </div>
  );
}

function PopularTextGrid({ onAddText }: { onAddText: (p: TextPresetSpec) => void }) {
  const [showAll, setShowAll] = useState(false);
  const popular = TEXT_STYLE_PRESETS.filter((p) => POPULAR_TEXT_IDS.includes(p.id));
  const rest = TEXT_STYLE_PRESETS.filter((p) => !POPULAR_TEXT_IDS.includes(p.id));
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-4 gap-1.5">
        {popular.map((p) => (
          <button
            key={p.id}
            onClick={() => onAddText(p)}
            title={p.label}
            className="flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg border border-slate-200 bg-white p-1 transition hover:border-[#1d6bff] hover:bg-[#1d6bff]/[0.05]"
          >
            <span
              className="truncate max-w-full leading-none"
              style={{ color: p.color, fontWeight: p.weight, fontSize: Math.min(16, p.fontSize / 4 + 6) }}
            >
              {p.text.length > 8 ? p.text.slice(0, 6) + "…" : p.text}
            </span>
            <span className="text-[8.5px] uppercase tracking-wider text-slate-400">{p.label}</span>
          </button>
        ))}
      </div>
      {!showAll ? (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-slate-500 transition hover:border-[#1d6bff] hover:text-[#1d6bff]"
        >
          See all ({TEXT_STYLE_PRESETS.length})
        </button>
      ) : (
        <div className="space-y-1.5">
          {rest.map((p) => (
            <button
              key={p.id}
              onClick={() => onAddText(p)}
              className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-left transition hover:border-[#1d6bff] hover:bg-[#1d6bff]/[0.05]"
            >
              <span
                className="truncate"
                style={{ color: p.color, fontWeight: p.weight, fontSize: Math.min(15, p.fontSize / 3 + 8) }}
              >
                {p.text}
              </span>
              <span className="shrink-0 text-[9px] uppercase tracking-wider text-slate-400">{p.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const TEXT_COLOR_SWATCHES: { name: string; value: string }[] = [
  { name: "Ink", value: "#0f172a" },
  { name: "Slate", value: "#475569" },
  { name: "White", value: "#ffffff" },
  { name: "Red", value: "#dc2626" },
  { name: "Orange", value: "#ea580c" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Emerald", value: "#059669" },
  { name: "Blue", value: "#1d6bff" },
  { name: "Indigo", value: "#4f46e5" },
  { name: "Pink", value: "#db2777" },
  { name: "Brown", value: "#78350f" },
  { name: "Gold", value: "#b45309" },
];

export type MockupPresetOption = {
  id: string;
  label: string;
  emoji?: string;
  thumbUrl: string;
};

export function TextPresetsPanel({
  onAddText,
  onAddBlank,
  onAddCustomText,
  onAddBadge,
  mockupPresets,
  mockupUploads,
  onPickMockupPreset,
  onUploadMockup,
  onPickMockupUpload,
  onDeleteMockupUpload,
}: {
  onAddText: (p: TextPresetSpec) => void;
  onAddBlank: () => void;
  onAddCustomText: (text: string, color: string) => void;
  onAddBadge: (b: BadgePresetSpec) => void;
  mockupPresets?: MockupPresetOption[];
  mockupUploads?: MockupPresetOption[];
  onPickMockupPreset?: (id: string) => void;
  onUploadMockup?: (file: File) => void;
  onPickMockupUpload?: (id: string) => void;
  onDeleteMockupUpload?: (id: string) => void;
}) {
  const mockupFileRef = useRef<HTMLInputElement>(null);
  const [customText, setCustomText] = useState("Mağazamıza özel metin");
  const [customColor, setCustomColor] = useState(TEXT_COLOR_SWATCHES[0].value);
  const [query, setQuery] = useState("");
  const trimmedCustomText = customText.trim();

  const q = query.trim().toLowerCase();
  const filteredTexts = q
    ? TEXT_STYLE_PRESETS.filter((p) =>
        p.label.toLowerCase().includes(q) || p.text.toLowerCase().includes(q),
      )
    : [];
  const filteredBadges = q
    ? MARKETING_BADGE_PRESETS.filter((b) =>
        b.label.toLowerCase().includes(q) || b.text.toLowerCase().includes(q),
      )
    : [];
  const searching = q.length > 0;

  return (
    <div className="space-y-4">
      {(onUploadMockup || (mockupUploads && mockupUploads.length > 0)) && (
        <div className="rounded-xl border border-dashed border-[#1d6bff]/40 bg-[#1d6bff]/[0.04] p-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <SectionLabel>Custom Template · Kendi Şablonun</SectionLabel>
              <div className="mt-0.5 text-[10.5px] text-slate-500">
                PNG / JPG · max 8MB. Yüklenen görsel canvas'a kilitli arka plan olur.
              </div>
            </div>
            <button
              type="button"
              onClick={() => mockupFileRef.current?.click()}
              className="shrink-0 rounded-lg bg-[#1d6bff] px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-[#175bd7]"
            >
              + Upload
            </button>
          </div>
          {mockupUploads && mockupUploads.length > 0 && (
            <div className="mt-2.5 grid grid-cols-4 gap-1.5">
              {mockupUploads.map((m) => (
                <div key={`own-${m.id}`} className="group relative overflow-hidden rounded-md border border-slate-200 bg-white">
                  <button
                    type="button"
                    onClick={() => onPickMockupUpload?.(m.id)}
                    className="block w-full"
                    title={m.label}
                  >
                    <div className="aspect-square w-full bg-slate-50">
                      <img src={m.thumbUrl} alt={m.label} className="h-full w-full object-cover" loading="lazy" />
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteMockupUpload?.(m.id)}
                    className="absolute right-0.5 top-0.5 rounded bg-white/90 px-1 text-[9px] font-bold text-slate-500 opacity-0 shadow transition hover:text-rose-600 group-hover:opacity-100"
                    title="Sil"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {mockupPresets && mockupPresets.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-2.5">
          <div className="mb-1.5 flex items-center justify-between">
            <SectionLabel>Mockup Scene · Ghost Templates</SectionLabel>
            <button
              type="button"
              onClick={() => mockupFileRef.current?.click()}
              className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600 hover:border-[#1d6bff] hover:text-[#1d6bff]"
            >
              + Upload
            </button>
            <input
              ref={mockupFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onUploadMockup?.(f);
                e.target.value = "";
              }}
            />
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {mockupPresets.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => onPickMockupPreset?.(m.id)}
                title={m.label}
                className="group overflow-hidden rounded-md border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:border-[#1d6bff] hover:shadow-sm"
              >
                <div className="aspect-square w-full bg-slate-50">
                  <img src={m.thumbUrl} alt={m.label} className="h-full w-full object-cover" loading="lazy" />
                </div>
                <div className="truncate border-t border-slate-100 px-1 py-0.5 text-[9px] font-semibold text-slate-600">
                  {m.emoji} {m.label}
                </div>
              </button>
            ))}
          </div>
          {mockupUploads && mockupUploads.length > 0 && (
            <>
              <div className="mt-2 text-[9.5px] font-semibold uppercase tracking-wider text-slate-500">
                My Templates
              </div>
              <div className="mt-1 grid grid-cols-4 gap-1.5">
                {mockupUploads.map((m) => (
                  <div key={m.id} className="group relative overflow-hidden rounded-md border border-slate-200 bg-white">
                    <button
                      type="button"
                      onClick={() => onPickMockupUpload?.(m.id)}
                      className="block w-full"
                      title={m.label}
                    >
                      <div className="aspect-square w-full bg-slate-50">
                        <img src={m.thumbUrl} alt={m.label} className="h-full w-full object-cover" loading="lazy" />
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteMockupUpload?.(m.id)}
                      className="absolute right-0.5 top-0.5 rounded bg-white/90 px-1 text-[9px] font-bold text-slate-500 opacity-0 shadow transition hover:text-rose-600 group-hover:opacity-100"
                      title="Sil"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
          <div className="mt-1.5 text-[9.5px] text-slate-500">
            Şablon seçimi ücretsiz. Sadece final export 1 kredi.
          </div>
        </div>
      )}

      <div className="rounded-xl border border-[#1d6bff]/20 bg-[#1d6bff]/[0.04] p-2.5">
        <SectionLabel>Custom Text / Eigen Text</SectionLabel>
        <textarea
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          rows={3}
          dir="auto"
          placeholder="Kendi metnini yaz: Türkçe, العربية, English, 中文…"
          className="w-full resize-none rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11.5px] leading-snug text-slate-800 focus:border-[#1d6bff] focus:outline-none focus:ring-2 focus:ring-[#1d6bff]/20"
        />
        <div className="mt-2 flex items-center gap-1.5">
          <span className="text-[9.5px] font-semibold uppercase tracking-wider text-slate-500">
            Color
          </span>
          <div className="flex flex-1 flex-wrap gap-1">
            {TEXT_COLOR_SWATCHES.map((c) => {
              const active = customColor.toLowerCase() === c.value.toLowerCase();
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCustomColor(c.value)}
                  title={c.name}
                  aria-label={c.name}
                  className={`h-5 w-5 rounded-full border transition ${
                    active
                      ? "border-[#1d6bff] ring-2 ring-[#1d6bff]/40"
                      : "border-slate-300 hover:border-slate-500"
                  }`}
                  style={{ background: c.value }}
                />
              );
            })}
            <label
              className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border border-dashed border-slate-400 bg-white text-[9px] font-bold text-slate-500 hover:border-[#1d6bff] hover:text-[#1d6bff]"
              title="Custom color"
            >
              +
              <input
                type="color"
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
                className="sr-only"
              />
            </label>
          </div>
        </div>
        <button
          type="button"
          onClick={() => trimmedCustomText && onAddCustomText(trimmedCustomText, customColor)}
          disabled={!trimmedCustomText}
          className="mt-2 flex w-full items-center justify-center rounded-lg bg-[#1d6bff] px-3 py-2 text-[11.5px] font-semibold text-white transition hover:bg-[#175bd7] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Add custom text
        </button>

        {/* One-click quick presets — use typed text if any, otherwise preset default */}
        <div className="mt-2.5">
          <div className="mb-1 text-[9.5px] font-semibold uppercase tracking-wider text-slate-500">
            Tek tıkla · One-click presets
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { id: "qp-headline", label: "Headline", preset: TEXT_STYLE_PRESETS.find((p) => p.id === "headline")! },
              { id: "qp-display", label: "SALE", preset: TEXT_STYLE_PRESETS.find((p) => p.id === "display")! },
              { id: "qp-elegant", label: "Elegant", preset: TEXT_STYLE_PRESETS.find((p) => p.id === "elegant")! },
              { id: "qp-tag", label: "Price tag", preset: TEXT_STYLE_PRESETS.find((p) => p.id === "tag")! },
            ].map((q) => (
              <button
                key={q.id}
                type="button"
                onClick={() => {
                  const text = trimmedCustomText || q.preset.text;
                  onAddText({ ...q.preset, text, color: customColor || q.preset.color });
                }}
                className="flex items-center justify-center rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-[#1d6bff] hover:text-[#1d6bff] hover:shadow-sm"
                style={{ fontWeight: q.preset.weight >= 700 ? 700 : 600 }}
              >
                {q.label}
              </button>
            ))}
            {MARKETING_BADGE_PRESETS.filter((b) => ["off-50", "shop-now", "best", "free-ship"].includes(b.id)).map((b) => (
              <button
                key={`qb-${b.id}`}
                type="button"
                onClick={() => {
                  const text = trimmedCustomText || b.text;
                  onAddBadge({ ...b, text });
                }}
                title={b.label}
                className="flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[10.5px] font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-[#1d6bff] hover:bg-white hover:text-[#1d6bff] hover:shadow-sm"
              >
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ background: b.fill, border: b.stroke ? `1px solid ${b.stroke}` : "none" }}
                />
                {b.label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[9.5px] leading-snug text-slate-500">
            Metin kutusu doluysa o metin kullanılır; boşsa hazır örnek gelir. Ücretsiz — kredi sadece final export'ta.
          </p>
        </div>
      </div>

      <div>
        <SectionLabel>All text · search</SectionLabel>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search styles & badges (sale, headline, kargo…)"
          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11.5px] text-slate-800 focus:border-[#1d6bff] focus:outline-none focus:ring-2 focus:ring-[#1d6bff]/20"
        />
        {searching && (
          <div className="mt-2 space-y-2">
            {filteredTexts.length === 0 && filteredBadges.length === 0 ? (
              <p className="rounded-lg bg-slate-50 px-2 py-2 text-[10.5px] text-slate-500">
                Sonuç yok — farklı bir anahtar kelime dene.
              </p>
            ) : (
              <>
                {filteredTexts.length > 0 && (
                  <div className="space-y-1.5">
                    {filteredTexts.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => onAddText(p)}
                        className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-left transition hover:border-[#1d6bff] hover:bg-[#1d6bff]/[0.05]"
                      >
                        <span
                          className="truncate"
                          style={{ color: p.color, fontWeight: p.weight, fontSize: Math.min(15, p.fontSize / 3 + 8) }}
                        >
                          {p.text}
                        </span>
                        <span className="shrink-0 text-[9px] uppercase tracking-wider text-slate-400">{p.label}</span>
                      </button>
                    ))}
                  </div>
                )}
                {filteredBadges.length > 0 && (
                  <div className="grid grid-cols-2 gap-1.5">
                    {filteredBadges.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => onAddBadge(b)}
                        title={b.label}
                        className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2.5 transition hover:border-[#1d6bff] hover:bg-white"
                      >
                        <BadgePreview b={b} />
                        <span className="text-[9.5px] font-semibold uppercase tracking-wider text-slate-500">{b.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {!searching && (
        <>
          <div>
            <SectionLabel>Text styles</SectionLabel>
            <PopularTextGrid onAddText={onAddText} />
            <button
              onClick={onAddBlank}
              className="mt-2 w-full rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-[11.5px] font-semibold text-slate-600 hover:border-[#1d6bff] hover:text-[#1d6bff]"
            >
              + Blank text layer
            </button>
          </div>

          <div>
            <SectionLabel>Marketing badges</SectionLabel>
            <div className="grid grid-cols-2 gap-1.5">
              {MARKETING_BADGE_PRESETS.map((b) => (
                <button
                  key={b.id}
                  onClick={() => onAddBadge(b)}
                  title={b.label}
                  className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2.5 transition hover:border-[#1d6bff] hover:bg-white"
                >
                  <BadgePreview b={b} />
                  <span className="text-[9.5px] font-semibold uppercase tracking-wider text-slate-500">{b.label}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <p className="rounded-lg bg-slate-50 px-2.5 py-2 text-[10.5px] leading-snug text-slate-500">
        Metin ve rozet eklemek ücretsiz — istediğin kadar dene. Kredi yalnızca final export sırasında düşer.
      </p>
    </div>
  );
}
