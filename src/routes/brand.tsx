import { createFileRoute, Link } from "@tanstack/react-router";
import { usePreferredLanguage } from "@/lib/language";

type Lang = "tr" | "en" | "es" | "de" | "ru" | "ar";

export const Route = createFileRoute("/brand")({
  head: () => ({
    meta: [
      { title: "Brand Kit — BgRemovify" },
      { name: "description", content: "BgRemovify logo, colors, typography and usage guidelines for press and partners." },
      { property: "og:title", content: "Brand Kit — BgRemovify" },
      { property: "og:description", content: "Download the BgRemovify logo and review brand guidelines." },
    ],
  }),
  component: BrandPage,
});

const COPY: Record<Lang, {
  heading: string; intro: string;
  logoTitle: string; logoSub: string; download: string;
  colorsTitle: string; colorsSub: string;
  fontsTitle: string; fontsSub: string;
  rulesTitle: string; rules: string[];
  contactTitle: string; contactBody: string;
}> = {
  tr: {
    heading: "Marka Kiti",
    intro: "Basın, ortak ve içerik üreticileri için BgRemovify marka varlıkları. İndir, kurallara uy, sor sor.",
    logoTitle: "Logo",
    logoSub: "Açık ve koyu zeminde kullanılabilir. Yeniden çizme, oranlarını bozma.",
    download: "PNG indir",
    colorsTitle: "Renkler",
    colorsSub: "Birincil mor markamızın kalbi. CTA ve önemli vurgu için kullan.",
    fontsTitle: "Tipografi",
    fontsSub: "Başlık ve metin için sistem sans (Inter). Açık, modern, okunabilir.",
    rulesTitle: "Kullanım kuralları",
    rules: [
      "Logo'yu döndürme, eğme veya renkini değiştirme.",
      "Etrafında en az logo yüksekliğinin yarısı kadar boşluk bırak.",
      "Karmaşık arka planlarda logo containerı kullan.",
      "Yanıltıcı şekilde resmi ortak gibi sunma.",
    ],
    contactTitle: "Basın & İşbirliği",
    contactBody: "Görüşme, içerik veya entegrasyon için bize ulaş.",
  },
  en: {
    heading: "Brand Kit",
    intro: "BgRemovify brand assets for press, partners, and creators. Download, follow the rules, ask anything.",
    logoTitle: "Logo",
    logoSub: "Works on light and dark surfaces. Don't redraw or distort.",
    download: "Download PNG",
    colorsTitle: "Colors",
    colorsSub: "Primary purple is the heart of our brand — use it for CTAs and key accents.",
    fontsTitle: "Typography",
    fontsSub: "System sans (Inter) for headings and body — clean, modern, readable.",
    rulesTitle: "Usage rules",
    rules: [
      "Don't rotate, skew, or recolor the logo.",
      "Keep clear space of at least half the logo height around it.",
      "Use a logo container on busy backgrounds.",
      "Don't imply official partnership where none exists.",
    ],
    contactTitle: "Press & partnerships",
    contactBody: "Reach out for interviews, content, or integrations.",
  },
  es: {
    heading: "Kit de Marca",
    intro: "Activos de marca BgRemovify para prensa, socios y creadores. Descarga, sigue las reglas, pregúntanos.",
    logoTitle: "Logo",
    logoSub: "Funciona sobre fondos claros y oscuros. No redibujes ni distorsiones.",
    download: "Descargar PNG",
    colorsTitle: "Colores",
    colorsSub: "El morado principal es el corazón de la marca — úsalo para CTA y acentos clave.",
    fontsTitle: "Tipografía",
    fontsSub: "Sans del sistema (Inter) para títulos y cuerpo — limpio, moderno, legible.",
    rulesTitle: "Reglas de uso",
    rules: [
      "No rotes, inclines ni cambies el color del logo.",
      "Mantén un espacio libre de al menos la mitad del alto del logo.",
      "Usa un contenedor en fondos complejos.",
      "No insinúes una asociación oficial inexistente.",
    ],
    contactTitle: "Prensa y partners",
    contactBody: "Contáctanos para entrevistas, contenido o integraciones.",
  },
  de: {
    heading: "Markenkit",
    intro: "BgRemovify-Markenassets für Presse, Partner und Creators. Download, Regeln beachten, Fragen stellen.",
    logoTitle: "Logo",
    logoSub: "Funktioniert auf hellen und dunklen Flächen. Nicht neu zeichnen oder verzerren.",
    download: "PNG herunterladen",
    colorsTitle: "Farben",
    colorsSub: "Das Primär-Violett ist das Herz der Marke — für CTAs und wichtige Akzente.",
    fontsTitle: "Typografie",
    fontsSub: "System-Sans (Inter) für Überschriften und Text — klar, modern, lesbar.",
    rulesTitle: "Nutzungsregeln",
    rules: [
      "Logo nicht drehen, neigen oder umfärben.",
      "Mindestens halbe Logohöhe Freiraum rundherum.",
      "Auf unruhigem Hintergrund Logo-Container verwenden.",
      "Keine offizielle Partnerschaft suggerieren, die es nicht gibt.",
    ],
    contactTitle: "Presse & Partnerschaften",
    contactBody: "Schreib uns für Interviews, Inhalte oder Integrationen.",
  },
  ru: {
    heading: "Бренд-кит",
    intro: "Активы бренда BgRemovify для прессы, партнёров и авторов. Скачайте, соблюдайте правила, спрашивайте.",
    logoTitle: "Логотип",
    logoSub: "Работает на светлых и тёмных фонах. Не перерисовывайте и не искажайте.",
    download: "Скачать PNG",
    colorsTitle: "Цвета",
    colorsSub: "Основной фиолетовый — сердце бренда. Используйте для CTA и важных акцентов.",
    fontsTitle: "Типографика",
    fontsSub: "Системный sans (Inter) для заголовков и текста — чисто, современно, читаемо.",
    rulesTitle: "Правила использования",
    rules: [
      "Не вращайте, не наклоняйте и не перекрашивайте логотип.",
      "Сохраняйте отступ не менее половины высоты логотипа.",
      "На сложном фоне используйте контейнер.",
      "Не намекайте на официальное партнёрство, которого нет.",
    ],
    contactTitle: "Пресса и партнёрства",
    contactBody: "Свяжитесь с нами для интервью, контента или интеграций.",
  },
  ar: {
    heading: "حزمة العلامة",
    intro: "أصول علامة BgRemovify للصحافة والشركاء والمبدعين. حمّل، التزم بالقواعد، اسأل عن أي شيء.",
    logoTitle: "الشعار",
    logoSub: "يعمل على الخلفيات الفاتحة والداكنة. لا تعد رسمه ولا تشوّهه.",
    download: "تنزيل PNG",
    colorsTitle: "الألوان",
    colorsSub: "البنفسجي الأساسي هو قلب علامتنا — استخدمه لأزرار الإجراء واللمسات المهمة.",
    fontsTitle: "الخط",
    fontsSub: "Sans النظام (Inter) للعناوين والنصوص — نظيف، حديث، مقروء.",
    rulesTitle: "قواعد الاستخدام",
    rules: [
      "لا تُدوِّر الشعار أو تُميله أو تُغيّر لونه.",
      "اترك مساحة فارغة بمقدار نصف ارتفاع الشعار على الأقل حوله.",
      "استخدم حاوية للشعار على الخلفيات المزدحمة.",
      "لا توحِ بشراكة رسمية غير موجودة.",
    ],
    contactTitle: "الصحافة والشراكات",
    contactBody: "تواصل معنا للمقابلات أو المحتوى أو التكاملات.",
  },
};

const COLORS: { name: string; hex: string; usage: string }[] = [
  { name: "Primary", hex: "#7C3AED", usage: "CTA · Brand" },
  { name: "Primary Dark", hex: "#5B21B6", usage: "Hover · Accent" },
  { name: "Background", hex: "#FFFFFF", usage: "Surface" },
  { name: "Foreground", hex: "#0A0A0A", usage: "Body text" },
  { name: "Muted", hex: "#F4F4F5", usage: "Card · Section" },
];

function BrandPage() {
  const lang = usePreferredLanguage("en") as Lang;
  const c = COPY[lang];
  const isRtl = lang === "ar";

  return (
    <article dir={isRtl ? "rtl" : "ltr"} className="container mx-auto max-w-4xl px-6 py-16">
      <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
        {isRtl ? "→ العودة للرئيسية" : "← Back to home"}
      </Link>
      <h1 className="text-4xl font-bold tracking-tight mt-4 mb-3">{c.heading}</h1>
      <p className="text-muted-foreground mb-12 leading-relaxed">{c.intro}</p>

      {/* Logo */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-2">{c.logoTitle}</h2>
        <p className="text-sm text-muted-foreground mb-4">{c.logoSub}</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border bg-white p-10 flex items-center justify-center">
            <img src="/favicon.png" alt="BgRemovify logo" className="size-20" />
          </div>
          <div className="rounded-2xl border bg-zinc-900 p-10 flex items-center justify-center">
            <img src="/favicon.png" alt="BgRemovify logo on dark" className="size-20" />
          </div>
        </div>
        <a
          href="/favicon.png"
          download
          className="mt-4 inline-flex rounded-xl border bg-background hover:bg-accent px-4 py-2 text-sm font-medium transition-colors"
        >
          {c.download}
        </a>
      </section>

      {/* Colors */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-2">{c.colorsTitle}</h2>
        <p className="text-sm text-muted-foreground mb-4">{c.colorsSub}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {COLORS.map((col) => (
            <div key={col.hex} className="rounded-2xl border overflow-hidden bg-card">
              <div className="h-20" style={{ background: col.hex }} />
              <div className="p-3">
                <p className="font-medium text-sm">{col.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{col.hex}</p>
                <p className="text-xs text-muted-foreground mt-1">{col.usage}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Typography */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-2">{c.fontsTitle}</h2>
        <p className="text-sm text-muted-foreground mb-4">{c.fontsSub}</p>
        <div className="rounded-2xl border bg-card p-6 space-y-3">
          <p className="text-4xl font-bold tracking-tight">BgRemovify</p>
          <p className="text-lg">The quick brown fox jumps over the lazy dog.</p>
          <p className="text-sm text-muted-foreground font-mono">Inter · 400 / 500 / 700</p>
        </div>
      </section>

      {/* Rules */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">{c.rulesTitle}</h2>
        <ul className="space-y-2">
          {c.rules.map((r, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="text-primary mt-1">•</span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Contact */}
      <section className="rounded-2xl border bg-card p-6">
        <h2 className="text-xl font-semibold mb-2">{c.contactTitle}</h2>
        <p className="text-sm text-muted-foreground mb-4">{c.contactBody}</p>
        <div className="flex flex-wrap gap-3">
          <a
            href="mailto:press@bgremovify.com"
            className="rounded-xl border bg-background hover:bg-accent px-4 py-2 text-sm font-medium transition-colors"
          >
            press@bgremovify.com
          </a>
        </div>
      </section>
    </article>
  );
}
