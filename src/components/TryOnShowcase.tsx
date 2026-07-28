import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import dressPair from "@/assets/vton-pairs/vton-dress-pair.jpg.asset.json";
import jacketPair from "@/assets/vton-pairs/vton-jacket-pair.jpg.asset.json";
import shirtPair from "@/assets/vton-pairs/vton-tshirt-pair.jpg.asset.json";
import watchPair from "@/assets/vton-pairs/vton-watch-pair.jpg.asset.json";

type Lang = "tr" | "en" | "es" | "de" | "ru" | "ar";

const COPY: Record<Lang, { badge: string; title: string; subtitle: string; cta: string; items: [string, string, string, string] }> = {
  tr: {
    badge: "Örnek Dönüşümler",
    title: "Kıyafet Giydirme Vitrini",
    subtitle: "Ham ürün fotoğrafından modelin üzerinde profesyonel çekime — tek tıkla.",
    cta: "Kendi ürününle dene",
    items: ["Elbise Dönüşümü", "Ceket Stili", "Gömlek Uyumu", "Saat Yakın Çekim"],
  },
  en: {
    badge: "Sample Transformations",
    title: "Try-On Showcase",
    subtitle: "From raw product photo to on-model editorial — one click.",
    cta: "Try with your product",
    items: ["Dress Transformation", "Jacket Style", "Shirt Fit", "Watch Close-up"],
  },
  es: {
    badge: "Ejemplos de Transformación",
    title: "Vitrina Try-On",
    subtitle: "Del producto en bruto a la foto editorial en modelo — un clic.",
    cta: "Prueba con tu producto",
    items: ["Transformación de vestido", "Estilo chaqueta", "Ajuste de camisa", "Reloj en primer plano"],
  },
  de: {
    badge: "Beispielverwandlungen",
    title: "Try-On Showcase",
    subtitle: "Vom Rohprodukt zum redaktionellen Model-Shot — mit einem Klick.",
    cta: "Mit deinem Produkt testen",
    items: ["Kleid-Transformation", "Jacken-Style", "Hemd-Passform", "Uhr Close-up"],
  },
  ru: {
    badge: "Примеры трансформаций",
    title: "Витрина Try-On",
    subtitle: "От фото товара до профессионального снимка на модели — в один клик.",
    cta: "Попробовать со своим товаром",
    items: ["Трансформация платья", "Стиль куртки", "Посадка рубашки", "Часы крупным планом"],
  },
  ar: {
    badge: "نماذج التحول",
    title: "معرض Try-On",
    subtitle: "من صورة منتج خام إلى لقطة احترافية على العارضة — بنقرة واحدة.",
    cta: "جرب مع منتجك",
    items: ["تحول الفستان", "أسلوب الجاكيت", "قصة القميص", "لقطة قريبة للساعة"],
  },
};

export function TryOnShowcase({ lang }: { lang: Lang }) {
  const t = COPY[lang] ?? COPY.en;
  const cards = [
    { src: dressPair.url, label: t.items[0] },
    { src: jacketPair.url, label: t.items[1] },
    { src: shirtPair.url, label: t.items[2] },
    { src: watchPair.url, label: t.items[3] },
  ];

  return (
    <section className="mx-auto mt-16 w-full max-w-6xl px-2 sm:px-4">
      <div className="mb-6 flex flex-col items-center text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-600 shadow-sm">
          <Sparkles className="h-3 w-3 text-emerald-500" />
          {t.badge}
        </span>
        <h2 className="mt-3 text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
          {t.title}
        </h2>
        <p className="mt-2 max-w-xl text-sm text-slate-500">{t.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {cards.map((c, idx) => (
          <figure
            key={c.label}
            className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="relative aspect-[16/9] overflow-hidden bg-slate-50">
              <img
                src={c.src}
                alt={c.label}
                loading="lazy"
                className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
              />
              <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-white/70 mix-blend-overlay" />
              {/* Curved arrow: hanger → model */}
              <svg
                viewBox="0 0 100 60"
                preserveAspectRatio="none"
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 h-full w-full"
              >
                <defs>
                  <marker
                    id={`vton-arrow-${idx}`}
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="5"
                    markerHeight="5"
                    orient="auto-start-reverse"
                  >
                    <path d="M0,0 L10,5 L0,10 z" fill="#10b981" />
                  </marker>
                </defs>
                <path
                  d="M 30 42 Q 50 6 70 34"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="1.1"
                  strokeLinecap="round"
                  strokeDasharray="140"
                  strokeDashoffset="140"
                  markerEnd={`url(#vton-arrow-${idx})`}
                  className="[filter:drop-shadow(0_1px_2px_rgba(0,0,0,0.35))] animate-[vtonDraw_2.6s_ease-in-out_infinite]"
                  style={{ animationDelay: `${idx * 0.35}s` }}
                />
              </svg>
            </div>
            <figcaption className="flex items-center justify-between px-4 py-3">
              <span className="text-sm font-semibold text-slate-800">{c.label}</span>
              <span className="text-[11px] font-medium text-emerald-600">AI Try-On</span>
            </figcaption>
          </figure>
        ))}
      </div>

      <div className="mt-6 flex justify-center">
        <Link
          to="/studio"
          className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
        >
          <Sparkles className="h-4 w-4" />
          {t.cta}
        </Link>
      </div>
    </section>
  );
}
