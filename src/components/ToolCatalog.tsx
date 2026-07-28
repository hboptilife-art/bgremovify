import { Link } from "@tanstack/react-router";
import {
  Scissors,
  Camera,
  Sparkles,
  Users,
  Expand,
  Wand2,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";

type Lang = "tr" | "en" | "es" | "de" | "ru" | "ar";

type Tool = {
  id: string;
  icon: LucideIcon;
  to: string;
  search?: Record<string, string>;
  gradient: string;
  iconBg: string;
  accent: string;
  badge?: Partial<Record<Lang, string>>;
};

type LabelSet = {
  quickStart: string;
  quickStartSub: string;
  newTools: string;
  newToolsSub: string;
  newBadge: string;
  open: string;
  tools: Record<string, { title: string; desc: string }>;
};

const LABELS: Record<Lang, LabelSet> = {
  tr: {
    quickStart: "Hızlı Başlangıç",
    quickStartSub: "En çok kullanılan araçlarla saniyeler içinde başla.",
    newTools: "Yeni Nesil Araçlar",
    newToolsSub: "AI destekli görsel düzenleme — moda, genişletme ve akıllı rötuş.",
    newBadge: "YENİ",
    open: "Aç",
    tools: {
      "remove-bg": { title: "Arka Planı Kaldır", desc: "Ürün ve model fotoğraflarında saniyeler içinde stüdyo temizliği." },
      "ai-photoshoot": { title: "AI Fotoğraf Çekimi", desc: "Ürününü hazır sahnelere yerleştir — mankensiz e-ticaret çekimi." },
      "enhance-quality": { title: "Kaliteyi Yükselt", desc: "Bulanık ve düşük çözünürlüklü kareleri 4K stüdyo kalitesine çıkar." },
      "ai-models": { title: "AI Moda Modelleri", desc: "Kıyafetlerini gerçekçi mankenlere kusursuzca giydir." },
      "expand-image": { title: "Görseli Genişlet", desc: "Kadrajı bozmadan tuvali büyüt — Instagram ve pazaryeri boyutları hazır." },
      "ai-edit": { title: "AI Düzenleme", desc: "Nesne sil, rötuş yap, arka planı tazele — hepsi tek fırçada." },
    },
  },
  en: {
    quickStart: "Quick Start",
    quickStartSub: "Get moving in seconds with our most-used tools.",
    newTools: "New Tools",
    newToolsSub: "AI-powered image editing — fashion, expand, and smart retouch.",
    newBadge: "NEW",
    open: "Open",
    tools: {
      "remove-bg": { title: "Remove Background", desc: "Studio-clean cutouts for product and model shots in seconds." },
      "ai-photoshoot": { title: "AI Photoshoot", desc: "Drop your product into ready-made scenes — no studio required." },
      "enhance-quality": { title: "Enhance Quality", desc: "Turn blurry, low-res shots into crisp 4K studio-grade images." },
      "ai-models": { title: "AI Fashion Models", desc: "Dress your garments on lifelike models with perfect draping." },
      "expand-image": { title: "Expand Image", desc: "Widen the canvas without cropping — ready for Instagram & marketplaces." },
      "ai-edit": { title: "AI Edit", desc: "Remove objects, retouch, refresh backgrounds — all in one brush." },
    },
  },
  es: {
    quickStart: "Inicio rápido",
    quickStartSub: "Empieza en segundos con nuestras herramientas más usadas.",
    newTools: "Nuevas herramientas",
    newToolsSub: "Edición con IA — moda, expandir y retoque inteligente.",
    newBadge: "NUEVO",
    open: "Abrir",
    tools: {
      "remove-bg": { title: "Quitar fondo", desc: "Recortes de estudio para producto y modelo en segundos." },
      "ai-photoshoot": { title: "Sesión con IA", desc: "Coloca tu producto en escenas listas — sin estudio." },
      "enhance-quality": { title: "Mejorar calidad", desc: "Convierte fotos borrosas en imágenes 4K de estudio." },
      "ai-models": { title: "Modelos de moda IA", desc: "Viste tus prendas en modelos realistas con caída perfecta." },
      "expand-image": { title: "Expandir imagen", desc: "Amplía el lienzo sin recortar — listo para redes y marketplaces." },
      "ai-edit": { title: "Edición IA", desc: "Elimina objetos, retoca y refresca fondos con un solo pincel." },
    },
  },
  de: {
    quickStart: "Schnellstart",
    quickStartSub: "Starte in Sekunden mit unseren meistgenutzten Tools.",
    newTools: "Neue Tools",
    newToolsSub: "KI-gestützte Bildbearbeitung — Mode, Erweitern und smartes Retusch.",
    newBadge: "NEU",
    open: "Öffnen",
    tools: {
      "remove-bg": { title: "Hintergrund entfernen", desc: "Studio-saubere Freisteller für Produkt- und Modelfotos in Sekunden." },
      "ai-photoshoot": { title: "KI-Fotoshooting", desc: "Setze dein Produkt in fertige Szenen — ganz ohne Studio." },
      "enhance-quality": { title: "Qualität steigern", desc: "Verwandle unscharfe Bilder in gestochen scharfe 4K-Aufnahmen." },
      "ai-models": { title: "KI-Fashion-Models", desc: "Ziehe deine Kleidung realistischen Models perfekt an." },
      "expand-image": { title: "Bild erweitern", desc: "Erweitere die Leinwand ohne Zuschnitt — für Instagram & Marktplätze." },
      "ai-edit": { title: "KI-Bearbeitung", desc: "Objekte entfernen, retuschieren, Hintergründe erneuern — in einem Pinsel." },
    },
  },
  ru: {
    quickStart: "Быстрый старт",
    quickStartSub: "Начните за секунды с самыми популярными инструментами.",
    newTools: "Новые инструменты",
    newToolsSub: "AI-редактирование — мода, расширение и умная ретушь.",
    newBadge: "НОВОЕ",
    open: "Открыть",
    tools: {
      "remove-bg": { title: "Удалить фон", desc: "Студийные вырезы для товара и модели за секунды." },
      "ai-photoshoot": { title: "AI-фотосессия", desc: "Поместите товар в готовые сцены — без студии." },
      "enhance-quality": { title: "Улучшить качество", desc: "Превратите размытые фото в чёткие 4K-снимки студийного класса." },
      "ai-models": { title: "AI-модели", desc: "Оденьте одежду на реалистичных моделей с идеальной посадкой." },
      "expand-image": { title: "Расширить изображение", desc: "Увеличьте холст без обрезки — готово для соцсетей и маркетплейсов." },
      "ai-edit": { title: "AI-редактор", desc: "Удаляйте объекты, ретушируйте и обновляйте фон одной кистью." },
    },
  },
  ar: {
    quickStart: "بدء سريع",
    quickStartSub: "ابدأ خلال ثوانٍ بأكثر الأدوات استخدامًا.",
    newTools: "أدوات جديدة",
    newToolsSub: "تحرير بالذكاء الاصطناعي — أزياء وتوسيع ولمسات ذكية.",
    newBadge: "جديد",
    open: "فتح",
    tools: {
      "remove-bg": { title: "إزالة الخلفية", desc: "قصاصات بجودة استوديو للمنتجات والموديلات خلال ثوانٍ." },
      "ai-photoshoot": { title: "جلسة تصوير AI", desc: "ضع منتجك في مشاهد جاهزة — بدون استوديو." },
      "enhance-quality": { title: "تحسين الجودة", desc: "حوّل الصور الضبابية إلى صور 4K بجودة استوديو." },
      "ai-models": { title: "عارضات أزياء AI", desc: "ألبس ملابسك على عارضين واقعيين بتفصيل مثالي." },
      "expand-image": { title: "توسيع الصورة", desc: "وسّع اللوحة دون قص — جاهز لإنستغرام والأسواق." },
      "ai-edit": { title: "تحرير AI", desc: "احذف العناصر، ارتش، وجدّد الخلفيات بفرشاة واحدة." },
    },
  },
};

const QUICK_START: Tool[] = [
  {
    id: "remove-bg",
    icon: Scissors,
    to: "/studio",
    search: { tool: "bg-remove" },
    gradient: "from-rose-50 to-white",
    iconBg: "bg-gradient-to-br from-rose-500 to-pink-500",
    accent: "text-rose-600",
  },
  {
    id: "ai-photoshoot",
    icon: Camera,
    to: "/studio",
    search: { tool: "ai-photoshoot" },
    gradient: "from-indigo-50 to-white",
    iconBg: "bg-gradient-to-br from-indigo-500 to-violet-500",
    accent: "text-indigo-600",
  },
  {
    id: "enhance-quality",
    icon: Sparkles,
    to: "/studio",
    search: { tool: "upscale" },
    gradient: "from-amber-50 to-white",
    iconBg: "bg-gradient-to-br from-amber-500 to-orange-500",
    accent: "text-amber-600",
  },
];

const NEW_TOOLS: Tool[] = [
  {
    id: "ai-models",
    icon: Users,
    to: "/studio",
    search: { tool: "virtual-tryon" },
    gradient: "from-fuchsia-50 to-white",
    iconBg: "bg-gradient-to-br from-fuchsia-500 to-purple-500",
    accent: "text-fuchsia-600",
    badge: { tr: "YENİ", en: "NEW", es: "NUEVO", de: "NEU", ru: "НОВОЕ", ar: "جديد" },
  },
  {
    id: "expand-image",
    icon: Expand,
    to: "/studio",
    search: { tool: "resize-expand" },
    gradient: "from-emerald-50 to-white",
    iconBg: "bg-gradient-to-br from-emerald-500 to-teal-500",
    accent: "text-emerald-600",
    badge: { tr: "YENİ", en: "NEW", es: "NUEVO", de: "NEU", ru: "НОВОЕ", ar: "جديد" },
  },
  {
    id: "ai-edit",
    icon: Wand2,
    to: "/studio",
    search: { tool: "ai-edit" },
    gradient: "from-sky-50 to-white",
    iconBg: "bg-gradient-to-br from-sky-500 to-blue-500",
    accent: "text-sky-600",
    badge: { tr: "YENİ", en: "NEW", es: "NUEVO", de: "NEU", ru: "НОВОЕ", ar: "جديد" },
  },
];


export function ToolCatalog({ lang }: { lang: Lang }) {
  const l = LABELS[lang] ?? LABELS.en;

  return (
    <div className="mt-14 max-w-6xl mx-auto space-y-12">
      <PricingPill lang={lang} />
      <ToolStrip
        title={l.quickStart}
        subtitle={l.quickStartSub}
        tools={QUICK_START}
        labels={l}
        lang={lang}
      />
      <ToolStrip
        title={l.newTools}
        subtitle={l.newToolsSub}
        tools={NEW_TOOLS}
        labels={l}
        lang={lang}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Minimalist pricing pill — 3 pack fiyatları + ücretsiz deneme CTA'sı.
// Sadelik korunacak: tek satır kart, araç gridlerinin hemen üstünde.
// ─────────────────────────────────────────────────────────────────────────────
const PRICING_COPY: Record<Lang, {
  starter: string;
  pro: string;
  premium: string;
  popular: string;
  freeTitle: string;
  freeDesc: string;
  freeCta: string;
  seeAll: string;
  credits: (n: number) => string;
}> = {
  tr: { starter: "Giriş", pro: "Pro", premium: "Premium", popular: "En popüler", freeTitle: "Ücretsiz Ön İzleme", freeDesc: "Kart yok — görselini yükle, sonucu güvenle dene.", freeCta: "Ücretsiz test", seeAll: "Tüm paketler", credits: (n) => `${n} kredi` },
  en: { starter: "Starter", pro: "Pro", premium: "Premium", popular: "Most popular", freeTitle: "Free Preview", freeDesc: "No card — upload your image and test safely.", freeCta: "Try free", seeAll: "All plans", credits: (n) => `${n} credits` },
  es: { starter: "Inicio", pro: "Pro", premium: "Premium", popular: "Más popular", freeTitle: "Vista previa gratis", freeDesc: "Sin tarjeta — sube tu imagen y prueba con seguridad.", freeCta: "Probar gratis", seeAll: "Ver planes", credits: (n) => `${n} créditos` },
  de: { starter: "Starter", pro: "Pro", premium: "Premium", popular: "Beliebt", freeTitle: "Kostenlose Vorschau", freeDesc: "Keine Karte — Bild hochladen und sicher testen.", freeCta: "Gratis testen", seeAll: "Alle Pakete", credits: (n) => `${n} Credits` },
  ru: { starter: "Старт", pro: "Про", premium: "Премиум", popular: "Популярный", freeTitle: "Бесплатный предпросмотр", freeDesc: "Без карты — загрузите изображение и проверьте результат.", freeCta: "Бесплатно", seeAll: "Все пакеты", credits: (n) => `${n} кредитов` },
  ar: { starter: "بداية", pro: "برو", premium: "مميز", popular: "الأكثر شيوعًا", freeTitle: "معاينة مجانية", freeDesc: "بدون بطاقة — ارفع صورتك وجرّب بأمان.", freeCta: "جرّب مجانًا", seeAll: "كل الباقات", credits: (n) => `${n} رصيد` },
};

const PACKS: Array<{ id: "starter" | "pro" | "premium"; price: string; credits: number; featured?: boolean }> = [
  { id: "starter", price: "$7",  credits: 80 },
  { id: "pro",     price: "$14", credits: 175, featured: true },
  { id: "premium", price: "$24", credits: 370 },
];

function PricingPill({ lang }: { lang: Lang }) {
  const t = PRICING_COPY[lang] ?? PRICING_COPY.en;
  const isRtl = lang === "ar";
  return (
    <section
      dir={isRtl ? "rtl" : "ltr"}
      className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {PACKS.map((p) => (
            <Link
              key={p.id}
              to="/pricing"
              search={{ lang } as never}
              className={`group relative inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-semibold transition ${
                p.featured
                  ? "bg-slate-900 text-white shadow-sm hover:bg-slate-800"
                  : "bg-slate-50 text-slate-800 ring-1 ring-slate-200 hover:bg-slate-100"
              }`}
            >
              {p.featured && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-900 shadow-sm">
                  {t.popular}
                </span>
              )}
              <span className="tabular-nums">{p.price}</span>
              <span className={`text-[11px] font-medium ${p.featured ? "text-white/80" : "text-slate-500"}`}>
                · {t[p.id]} · {t.credits(p.credits)}
              </span>
            </Link>
          ))}
          <Link
            to="/pricing"
            search={{ lang } as never}
            className="ml-1 inline-flex items-center gap-1 text-[12px] font-medium text-slate-500 hover:text-slate-900"
          >
            {t.seeAll} <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <Link
          to="/auth"
          search={{ mode: "signup" } as never}
          className="group inline-flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white px-3.5 py-2.5 text-left transition hover:border-emerald-300 hover:shadow-sm"
        >
          <div>
            <div className="text-[12px] font-bold text-emerald-700">{t.freeTitle}</div>
            <div className="text-[11px] text-slate-500">{t.freeDesc}</div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm group-hover:bg-emerald-700">
            {t.freeCta} <ArrowRight className="h-3 w-3" />
          </span>
        </Link>
      </div>
    </section>
  );
}



function ToolStrip({
  title,
  subtitle,
  tools,
  labels,
  lang,
}: {
  title: string;
  subtitle: string;
  tools: Tool[];
  labels: LabelSet;
  lang: Lang;
}) {
  return (
    <section>
      <div className="mb-5 px-1 text-left">
        <h3 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => {
          const meta = labels.tools[tool.id];
          const Icon = tool.icon;
          const badge = tool.badge?.[lang];
          return (
            <Link
              key={tool.id}
              to={tool.to}
              search={{ lang, ...(tool.search ?? {}) } as never}
              className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br ${tool.gradient} p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_16px_40px_-18px_rgba(15,23,42,0.25)]`}
            >
              {badge && (
                <span className="absolute right-3 top-3 rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-bold tracking-wider text-white shadow-sm">
                  {badge}
                </span>
              )}

              <div>
                <div
                  className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-md ${tool.iconBg}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <h4 className="text-[15px] font-semibold text-slate-900">{meta.title}</h4>
                <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500">{meta.desc}</p>
              </div>

              <div
                className={`mt-5 inline-flex items-center gap-1.5 text-[13px] font-semibold ${tool.accent}`}
              >
                {labels.open}
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
