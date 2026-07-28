// Ghost Mannequin & Product Mockup Modal
// ---------------------------------------
// Bir tıkla Kapüşonlu Sweatshirt / Crewneck / Şapka / Kupa / Tişört / Tote
// gibi hazır e-ticaret mockup şablonlarını canvas'a kilitli arka plan katmanı
// olarak yükler. "My Template" bölümünden kullanıcı kendi mockup görselini
// yükleyip aynı yerden kullanabilir.
//
// Ürün mockup silüetleri hafif inline SVG'lerdir — CDN çağrısı yoktur, dil-nötr
// beyaz zemin üzerinde standardize edilmiştir.

import { useMemo, useRef, useState, type CSSProperties } from "react";
import { X, Upload, Trash2, Shirt } from "lucide-react";

export type GhostPreset = {
  id: string;
  label: string;
  emoji: string;
  /** Kanvas'a kilitli sahne olarak uygulanacak arka plan görseli (data URL). */
  url: string;
  /** Küçük önizleme thumb'ı — üstteki grid için (aynı görsel). */
  thumbUrl: string;
};

export type GhostUploadedTemplate = {
  id: string;
  name: string;
  url: string;
};

type Props = {
  onClose: () => void;
  onPickPreset: (preset: GhostPreset) => void;
  onUploadFile: (file: File) => void;
  onPickUploaded: (t: GhostUploadedTemplate) => void;
  onDeleteUploaded: (id: string) => void;
  uploaded: GhostUploadedTemplate[];
};

/* --------------------------- SVG mockup factory --------------------------- */

// Beyaz-zemin, hafif gri gölgeli minimal mockup SVG'leri. Aynı çerçeve boyutu
// (900×900) ile export edildiği için hepsi kanvasa aynı slot içine oturur.
function svg(body: string): string {
  const doc = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 900" width="900" height="900">
  <defs>
    <linearGradient id="bg" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#f1f5f9"/>
    </linearGradient>
    <radialGradient id="shadow" cx="0.5" cy="0.9" r="0.6">
      <stop offset="0" stop-color="rgba(15,23,42,0.18)"/>
      <stop offset="1" stop-color="rgba(15,23,42,0)"/>
    </radialGradient>
    <linearGradient id="fabric" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="#f8fafc"/>
      <stop offset="1" stop-color="#e2e8f0"/>
    </linearGradient>
  </defs>
  <rect width="900" height="900" fill="url(#bg)"/>
  <ellipse cx="450" cy="820" rx="260" ry="26" fill="url(#shadow)"/>
  ${body}
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(doc)}`;
}

// Kapüşonlu Sweatshirt — Ghost mannequin
const HOODIE = svg(`
  <!-- kapüşon -->
  <path d="M340 230 Q450 150 560 230 Q580 300 540 330 Q450 300 360 330 Q320 300 340 230 Z" fill="url(#fabric)" stroke="#cbd5e1" stroke-width="2"/>
  <ellipse cx="450" cy="290" rx="70" ry="30" fill="#e2e8f0"/>
  <!-- gövde -->
  <path d="M280 340 L620 340 L680 430 L640 470 L640 800 L260 800 L260 470 L220 430 Z" fill="url(#fabric)" stroke="#cbd5e1" stroke-width="2"/>
  <!-- ön cep -->
  <path d="M340 560 L560 560 L520 660 L380 660 Z" fill="none" stroke="#cbd5e1" stroke-width="2"/>
  <!-- ip -->
  <line x1="440" y1="320" x2="440" y2="410" stroke="#94a3b8" stroke-width="3"/>
  <line x1="460" y1="320" x2="460" y2="410" stroke="#94a3b8" stroke-width="3"/>
  <circle cx="440" cy="415" r="5" fill="#94a3b8"/>
  <circle cx="460" cy="415" r="5" fill="#94a3b8"/>
`);

// Crewneck Sweatshirt (kapüşonsuz)
const CREWNECK = svg(`
  <path d="M280 320 L370 260 Q450 280 530 260 L620 320 L680 410 L640 450 L640 800 L260 800 L260 450 L220 410 Z"
        fill="url(#fabric)" stroke="#cbd5e1" stroke-width="2"/>
  <path d="M370 260 Q450 320 530 260" fill="none" stroke="#94a3b8" stroke-width="6"/>
  <path d="M380 275 Q450 310 520 275" fill="none" stroke="#cbd5e1" stroke-width="2"/>
`);

// Klasik Tişört
const TSHIRT = svg(`
  <path d="M290 300 L390 240 Q450 280 510 240 L610 300 L680 380 L620 430 L620 800 L280 800 L280 430 L220 380 Z"
        fill="url(#fabric)" stroke="#cbd5e1" stroke-width="2"/>
  <path d="M390 240 Q450 300 510 240" fill="none" stroke="#94a3b8" stroke-width="4"/>
`);

// Şapka — Baseball cap
const CAP = svg(`
  <!-- kavis -->
  <path d="M240 480 Q450 240 660 480 L660 520 L240 520 Z" fill="url(#fabric)" stroke="#cbd5e1" stroke-width="2"/>
  <!-- siperlik -->
  <path d="M180 520 Q450 620 720 520 L710 560 Q450 640 190 560 Z" fill="#e2e8f0" stroke="#cbd5e1" stroke-width="2"/>
  <!-- düğme -->
  <circle cx="450" cy="310" r="10" fill="#94a3b8"/>
  <!-- dikişler -->
  <path d="M320 480 Q450 320 580 480" fill="none" stroke="#cbd5e1" stroke-width="2" stroke-dasharray="4 4"/>
  <path d="M370 490 Q450 360 530 490" fill="none" stroke="#cbd5e1" stroke-width="2" stroke-dasharray="4 4"/>
`);

// Kupa
const MUG = svg(`
  <rect x="290" y="280" width="280" height="380" rx="24" fill="url(#fabric)" stroke="#cbd5e1" stroke-width="2"/>
  <!-- kulp -->
  <path d="M570 360 Q700 380 700 480 Q700 580 570 600" fill="none" stroke="#cbd5e1" stroke-width="18"/>
  <!-- üst kenar -->
  <ellipse cx="430" cy="285" rx="140" ry="20" fill="#e2e8f0" stroke="#cbd5e1" stroke-width="2"/>
  <!-- ışık şeridi -->
  <rect x="320" y="310" width="18" height="320" rx="9" fill="rgba(255,255,255,0.7)"/>
`);

// Tote çanta
const TOTE = svg(`
  <path d="M260 340 L640 340 L680 800 L220 800 Z" fill="url(#fabric)" stroke="#cbd5e1" stroke-width="2"/>
  <!-- kulplar -->
  <path d="M330 340 Q330 200 430 200 Q530 200 530 340" fill="none" stroke="#94a3b8" stroke-width="10"/>
  <path d="M350 340 Q350 220 430 220 Q510 220 510 340" fill="none" stroke="#cbd5e1" stroke-width="2"/>
`);

export const GHOST_PRESETS: GhostPreset[] = [
  { id: "ghost-hoodie",   label: "Hooded Sweatshirt", emoji: "🧥", url: HOODIE,   thumbUrl: HOODIE   },
  { id: "ghost-crewneck", label: "Crewneck",          emoji: "👕", url: CREWNECK, thumbUrl: CREWNECK },
  { id: "ghost-tshirt",   label: "T-Shirt",           emoji: "👔", url: TSHIRT,   thumbUrl: TSHIRT   },
  { id: "ghost-cap",      label: "Baseball Cap",      emoji: "🧢", url: CAP,      thumbUrl: CAP      },
  { id: "ghost-mug",      label: "Mug",               emoji: "☕", url: MUG,      thumbUrl: MUG      },
  { id: "ghost-tote",     label: "Tote Bag",          emoji: "👜", url: TOTE,     thumbUrl: TOTE     },
];
const PRESETS = GHOST_PRESETS;


/* -------------------------------- Component ------------------------------- */

export function GhostMannequinModal({
  onClose,
  onPickPreset,
  onUploadFile,
  onPickUploaded,
  onDeleteUploaded,
  uploaded,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PRESETS;
    return PRESETS.filter((p) => p.label.toLowerCase().includes(q));
  }, [query]);

  const backdropStyle: CSSProperties = {
    background: "rgba(15,23,42,0.55)",
    backdropFilter: "blur(4px)",
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4"
      style={backdropStyle}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-slate-800 to-slate-950 text-white">
              <Shirt className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[14px] font-semibold text-slate-900">
                Ghost Mannequin & Ürün Mockup
              </div>
              <div className="text-[11px] text-slate-500">
                Sahneyi seç → tasarımını üstüne bırak. Şablon kilitli katman olur.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Kapat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto p-5">
          {/* Search */}
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Şablon ara (hoodie, cap, mug…)"
            className="mb-3 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] text-slate-800 focus:border-[#1d6bff] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1d6bff]/20"
          />

          {/* Preset grid */}
          <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">
            Hazır mockup şablonları
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => { onPickPreset(p); onClose(); }}
                className="group overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#1d6bff] hover:shadow-md"
                title={p.label}
              >
                <div className="aspect-square w-full overflow-hidden bg-slate-50">
                  <img
                    src={p.thumbUrl}
                    alt={p.label}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                    loading="lazy"
                    width={512}
                    height={512}
                  />
                </div>
                <div className="border-t border-slate-100 px-2.5 py-1.5 text-[11.5px] font-semibold text-slate-700">
                  {p.emoji} {p.label}
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full rounded-lg bg-slate-50 p-4 text-center text-[11px] text-slate-500">
                Sonuç yok — farklı bir anahtar kelime dene.
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="my-5 flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">
            <div className="h-px flex-1 bg-slate-200" />
            My Template
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          {/* Upload own */}
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[12.5px] font-semibold text-slate-800">
                  Kendi mockup şablonunu yükle
                </div>
                <div className="mt-0.5 text-[11px] text-slate-500">
                  PNG / JPG, max 8MB. Yüklenen görsel canvas'a kilitli arka plan olur.
                </div>
              </div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#1d6bff] px-3 py-2 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#175bd7]"
              >
                <Upload className="h-3.5 w-3.5" /> Görsel yükle
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) { onUploadFile(f); }
                  e.target.value = "";
                }}
              />
            </div>

            {uploaded.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {uploaded.map((t) => (
                  <div
                    key={t.id}
                    className="group relative overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
                  >
                    <button
                      type="button"
                      onClick={() => { onPickUploaded(t); onClose(); }}
                      className="block w-full text-left"
                      title={t.name}
                    >
                      <div className="aspect-square w-full overflow-hidden bg-slate-100">
                        <img src={t.url} alt={t.name} className="h-full w-full object-cover" />
                      </div>
                      <div className="truncate border-t border-slate-100 px-2 py-1 text-[10.5px] font-medium text-slate-600">
                        {t.name}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteUploaded(t.id)}
                      className="absolute right-1 top-1 rounded-md bg-white/90 p-1 text-slate-500 opacity-0 shadow transition hover:bg-white hover:text-rose-600 group-hover:opacity-100"
                      title="Sil"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
