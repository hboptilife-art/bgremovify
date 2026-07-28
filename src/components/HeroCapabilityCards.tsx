import { Type, Palmtree, Layers3, Palette } from "lucide-react";
import { usePreferredLanguage, type AppLang } from "@/lib/language";
import capBranding from "@/assets/capability/cap-branding.jpg.asset.json";
import perfumeLifestyle from "@/assets/capability/perfume-lifestyle.jpg.asset.json";
import ghostMannequin from "@/assets/capability/ghost-mannequin.jpg.asset.json";
import colorVariants from "@/assets/capability/color-variants.jpg.asset.json";

const STR: Record<string, Record<AppLang, string>> = {
  sectionKicker: {
    tr: "Yetenekler", en: "Capabilities", es: "Capacidades",
    de: "Fähigkeiten", ru: "Возможности", ar: "الإمكانيات",
  },
  sectionTitle: {
    tr: "Tek platformda 4 profesyonel senaryo",
    en: "4 pro scenarios on one platform",
    es: "4 escenarios pro en una sola plataforma",
    de: "4 Profi-Szenarien auf einer Plattform",
    ru: "4 профи-сценария на одной платформе",
    ar: "٤ سيناريوهات احترافية على منصة واحدة",
  },
  c1Title: {
    tr: "Özelleştirme & Marka Baskı",
    en: "Custom Text & Branding",
    es: "Texto y marca personalizada",
    de: "Custom Text & Branding",
    ru: "Кастомный текст и брендинг",
    ar: "نصوص وعلامات مخصصة",
  },
  c1Text: {
    tr: "Şapka, tişört, çanta gibi ürünlere dinamik metin, logo veya etiket ekle. Anında kişiselleştir.",
    en: "Drop dynamic text, logos and labels onto hats, tees or bags. Personalize on the fly.",
    es: "Añade texto, logos y etiquetas a gorros, camisetas o bolsos. Personaliza al instante.",
    de: "Text, Logos und Labels auf Caps, Shirts oder Bags — sofort personalisiert.",
    ru: "Добавляйте текст, лого и лейблы на кепки, футболки и сумки — мгновенно.",
    ar: "أضف نصوصًا وشعارات وملصقات على القبعات والقمصان والحقائب فورًا.",
  },
  c2Title: {
    tr: "Konsept Sahne & Yaz Ortamları",
    en: "Lifestyle & Summer Scenes",
    es: "Escenas de estilo y verano",
    de: "Lifestyle- & Sommer-Szenen",
    ru: "Лайфстайл и летние сцены",
    ar: "مشاهد الحياة والصيف",
  },
  c2Text: {
    tr: "Parfüm, gözlük, kozmetik ürünlerini plaj, sahil ya da mermer podyum sahnelerine taşı.",
    en: "Place fragrance, eyewear or cosmetics into beach, coast or marble podium scenes.",
    es: "Lleva perfumes, gafas o cosmética a playas, costas o pódiums de mármol.",
    de: "Parfum, Brillen, Kosmetik in Strand-, Küsten- oder Marmor-Szenen.",
    ru: "Парфюм, очки, косметика — на пляже, побережье или мраморном подиуме.",
    ar: "ضع العطور والنظارات ومستحضرات التجميل في مشاهد الشاطئ أو منصات الرخام.",
  },
  c3Title: {
    tr: "Ghost Mannequin & Stüdyo Derinlik",
    en: "Ghost Mannequin & Studio Depth",
    es: "Maniquí fantasma y profundidad",
    de: "Ghost Mannequin & Studiotiefe",
    ru: "Ghost Mannequin и студийная глубина",
    ar: "مانيكان شبحي وعمق الاستوديو",
  },
  c3Text: {
    tr: "Kıyafetlere havada duran 3D derinlik, doğal gölge ve stüdyo ışığı katmanla.",
    en: "Give apparel true 3D depth, floating stance and studio-grade shadowing.",
    es: "Da a la ropa profundidad 3D, postura flotante y sombras de estudio.",
    de: "Kleidung mit echter 3D-Tiefe, schwebender Silhouette und Studioschatten.",
    ru: "Одежда с настоящим 3D-объёмом, парящим силуэтом и студийными тенями.",
    ar: "امنح الملابس عمقًا ثلاثي الأبعاد وظلالًا احترافية بجودة الاستوديو.",
  },
  c4Title: {
    tr: "Toplu Renk & Varyant Üretimi",
    en: "Batch & Color Variations",
    es: "Variantes de color por lote",
    de: "Batch- & Farbvarianten",
    ru: "Пакетные цветовые варианты",
    ar: "متغيرات الألوان بالجملة",
  },
  c4Text: {
    tr: "Tek üründen anında farklı renk, konsept ve pazar yeri varyasyonu üret.",
    en: "Spin one product into instant color, concept and marketplace variations.",
    es: "Convierte un producto en variantes instantáneas de color y concepto.",
    de: "Aus einem Produkt sofort Farb- und Konzeptvarianten generieren.",
    ru: "Из одного товара — мгновенные цветовые и концептные варианты.",
    ar: "حوّل منتجًا واحدًا إلى تنوعات فورية بالألوان والمفاهيم.",
  },
};

type Card = {
  key: "c1" | "c2" | "c3" | "c4";
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  image: string;
  imageAlt: string;
};

const CARDS: Card[] = [
  {
    key: "c1",
    icon: Type,
    accent: "from-violet-500 to-fuchsia-500",
    image: capBranding.url,
    imageAlt: "Custom branded cap with embroidered logo",
  },
  {
    key: "c2",
    icon: Palmtree,
    accent: "from-amber-400 to-orange-500",
    image: perfumeLifestyle.url,
    imageAlt: "Luxury perfume on marble podium with palm shadows",
  },
  {
    key: "c3",
    icon: Layers3,
    accent: "from-emerald-400 to-teal-500",
    image: ghostMannequin.url,
    imageAlt: "Ghost mannequin white t-shirt with studio depth",
  },
  {
    key: "c4",
    icon: Palette,
    accent: "from-sky-400 to-indigo-500",
    image: colorVariants.url,
    imageAlt: "Sneaker in four color variations",
  },
];

export function HeroCapabilityCards() {
  const lang = usePreferredLanguage("en");
  const s = (k: keyof typeof STR) => STR[k][lang] ?? STR[k].en;

  return (
    <section className="mx-auto mt-10 w-full max-w-6xl px-1">
      <div className="mb-5 text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-900/5 px-3 py-1 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-slate-600">
          {s("sectionKicker")}
        </div>
        <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
          {s("sectionTitle")}
        </h3>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <article
              key={card.key}
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-xl"
            >
              <div className="relative h-40 overflow-hidden rounded-xl border border-slate-100 bg-slate-100">
                <img
                  src={card.image}
                  alt={card.imageAlt}
                  loading="lazy"
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                />
                <div
                  className={`absolute inset-x-0 bottom-0 h-px bg-gradient-to-r ${card.accent} opacity-70`}
                />
              </div>

              <div className="mt-3 flex items-start gap-2.5">
                <div
                  className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${card.accent} text-white shadow-md`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[13.5px] font-semibold leading-tight text-slate-900">
                    {s(`${card.key}Title` as keyof typeof STR)}
                  </div>
                  <p className="mt-1 text-[12px] leading-snug text-slate-500">
                    {s(`${card.key}Text` as keyof typeof STR)}
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
