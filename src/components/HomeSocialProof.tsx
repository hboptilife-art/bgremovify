import type { ReactNode } from "react";
import { Star, Shield, Zap, CreditCard, Clock, CheckCircle2 } from "lucide-react";

type Lang = "tr" | "en" | "es" | "de" | "ru" | "ar";

type Testimonial = {
  quote: Record<Lang, string>;
  name: string;
  role: Record<Lang, string>;
  avatar: string;
};

const TESTIMONIALS: Testimonial[] = [
  {
    name: "Elena M.",
    avatar: "https://i.pravatar.cc/80?img=47",
    role: {
      tr: "Etsy Satıcısı · Takı",
      en: "Etsy Seller · Jewelry",
      es: "Vendedora Etsy · Joyería",
      de: "Etsy-Händlerin · Schmuck",
      ru: "Продавец Etsy · Украшения",
      ar: "بائعة Etsy · مجوهرات",
    },
    quote: {
      tr: "Fotoğrafçıya ödediğim parayı unut. Ürünlerimi 30 saniyede stüdyo kalitesinde listeliyorum.",
      en: "Forget paying a photographer. My products go up in 30 seconds looking like a studio shoot.",
      es: "Olvídate de pagar a un fotógrafo. Mis productos se ven de estudio en 30 segundos.",
      de: "Kein Fotograf mehr nötig. Meine Produkte sehen in 30 Sekunden aus wie ein Studio-Shoot.",
      ru: "Забудь про фотографа. Мои товары выходят как студийная съёмка за 30 секунд.",
      ar: "لا حاجة لمصور. منتجاتي تبدو احترافية خلال 30 ثانية.",
    },
  },
  {
    name: "Marcus T.",
    avatar: "https://i.pravatar.cc/80?img=12",
    role: {
      tr: "Shopify Mağaza · Tekstil",
      en: "Shopify Store · Apparel",
      es: "Tienda Shopify · Ropa",
      de: "Shopify-Shop · Bekleidung",
      ru: "Shopify · Одежда",
      ar: "متجر Shopify · ملابس",
    },
    quote: {
      tr: "200 ürünü tek öğleden sonra çıkardım. CTR'ımız yüzde 40 arttı — inanılmaz.",
      en: "Processed 200 SKUs in one afternoon. Our CTR jumped 40% — insane ROI.",
      es: "Procesé 200 SKUs en una tarde. Nuestro CTR subió 40% — un ROI brutal.",
      de: "200 Artikel an einem Nachmittag bearbeitet. Unsere CTR stieg um 40%.",
      ru: "200 товаров за один вечер. CTR подскочил на 40% — просто безумие.",
      ar: "عالجت 200 منتج في فترة بعد الظهر. ارتفع CTR بنسبة 40٪ — عائد رائع.",
    },
  },
  {
    name: "Aiko S.",
    avatar: "https://i.pravatar.cc/80?img=32",
    role: {
      tr: "Amazon FBA · Kozmetik",
      en: "Amazon FBA · Cosmetics",
      es: "Amazon FBA · Cosmética",
      de: "Amazon FBA · Kosmetik",
      ru: "Amazon FBA · Косметика",
      ar: "Amazon FBA · مستحضرات تجميل",
    },
    quote: {
      tr: "Ekipmana bin dolar harcamama gerek kalmadı. iPhone + BGRemovify yeterli.",
      en: "Saved a thousand bucks on gear. iPhone + BGRemovify is all I need now.",
      es: "Me ahorré mil dólares en equipo. Solo necesito iPhone + BGRemovify.",
      de: "Tausend Euro Ausrüstung gespart. iPhone + BGRemovify reicht völlig.",
      ru: "Сэкономил тысячу баксов на технике. Хватает iPhone + BGRemovify.",
      ar: "وفرت آلاف الدولارات على المعدات. يكفيني iPhone + BGRemovify.",
    },
  },
];

const BADGES: Record<Lang, { icon: typeof Shield; label: string; sub: string }[]> = {
  tr: [
    { icon: Zap, label: "Saniyeler İçinde", sub: "Anında teslimat" },
    { icon: CreditCard, label: "Abonelik Yok", sub: "Tek seferlik ödeme" },
    { icon: Shield, label: "SSL Şifreli", sub: "Görselleriniz gizli" },
    { icon: CheckCircle2, label: "Profesyonel Kalite", sub: "Stüdyo düzeyi çıktı" },
  ],
  en: [
    { icon: Zap, label: "Instant Delivery", sub: "Results in seconds" },
    { icon: CreditCard, label: "No Subscription", sub: "One-time payment" },
    { icon: Shield, label: "SSL Encrypted", sub: "Your images stay private" },
    { icon: CheckCircle2, label: "Studio Quality", sub: "Pro-grade output" },
  ],
  es: [
    { icon: Zap, label: "Entrega Instantánea", sub: "Resultados en segundos" },
    { icon: CreditCard, label: "Sin Suscripción", sub: "Pago único" },
    { icon: Shield, label: "SSL Cifrado", sub: "Tus imágenes privadas" },
    { icon: CheckCircle2, label: "Calidad Estudio", sub: "Salida profesional" },
  ],
  de: [
    { icon: Zap, label: "Sofort Bereit", sub: "Ergebnisse in Sekunden" },
    { icon: CreditCard, label: "Kein Abo", sub: "Einmalzahlung" },
    { icon: Shield, label: "SSL-Verschlüsselt", sub: "Bilder bleiben privat" },
    { icon: CheckCircle2, label: "Studio-Qualität", sub: "Profi-Ergebnisse" },
  ],
  ru: [
    { icon: Zap, label: "Мгновенно", sub: "Результат за секунды" },
    { icon: CreditCard, label: "Без Подписки", sub: "Разовая оплата" },
    { icon: Shield, label: "SSL Шифрование", sub: "Изображения приватны" },
    { icon: CheckCircle2, label: "Студийное Качество", sub: "Профессиональный вывод" },
  ],
  ar: [
    { icon: Zap, label: "تسليم فوري", sub: "نتائج خلال ثوانٍ" },
    { icon: CreditCard, label: "بدون اشتراك", sub: "دفعة واحدة" },
    { icon: Shield, label: "تشفير SSL", sub: "صورك تبقى خاصة" },
    { icon: CheckCircle2, label: "جودة الاستوديو", sub: "نتائج احترافية" },
  ],
};

const HEADINGS: Record<Lang, { valueTitle: string; valueSub: string; reviewsTitle: string; reviewsSub: string; rating: string }> = {
  tr: {
    valueTitle: "Pahalı ekipman yok. Sadece sonuç.",
    valueSub: "Saniyeler içinde profesyonel stüdyo sonucu — abonelik, kurulum ve öğrenme eğrisi olmadan.",
    reviewsTitle: "E-ticaret satıcıları tarafından seviliyor",
    reviewsSub: "Dünyanın dört bir yanından 12.000+ mağaza",
    rating: "4.9 / 5 · 2.400+ değerlendirme",
  },
  en: {
    valueTitle: "No expensive gear. Just results.",
    valueSub: "Professional studio results in seconds — no subscription, no setup, no learning curve.",
    reviewsTitle: "Loved by e-commerce sellers",
    reviewsSub: "12,000+ stores worldwide trust BGRemovify",
    rating: "4.9 / 5 · 2,400+ reviews",
  },
  es: {
    valueTitle: "Sin equipo caro. Solo resultados.",
    valueSub: "Resultados de estudio profesionales en segundos — sin suscripción, sin curva de aprendizaje.",
    reviewsTitle: "Amado por vendedores e-commerce",
    reviewsSub: "Más de 12,000 tiendas en todo el mundo",
    rating: "4.9 / 5 · más de 2,400 reseñas",
  },
  de: {
    valueTitle: "Keine teure Ausrüstung. Nur Ergebnisse.",
    valueSub: "Professionelle Studio-Ergebnisse in Sekunden — ohne Abo, ohne Einrichtung.",
    reviewsTitle: "Von E-Commerce-Händlern geliebt",
    reviewsSub: "Über 12.000 Shops weltweit vertrauen BGRemovify",
    rating: "4,9 / 5 · über 2.400 Bewertungen",
  },
  ru: {
    valueTitle: "Никакого дорогого оборудования. Только результат.",
    valueSub: "Профессиональный студийный результат за секунды — без подписки и настройки.",
    reviewsTitle: "Любимец e-commerce продавцов",
    reviewsSub: "Более 12 000 магазинов по всему миру",
    rating: "4,9 / 5 · 2 400+ отзывов",
  },
  ar: {
    valueTitle: "لا معدات باهظة. فقط نتائج.",
    valueSub: "نتائج استوديو احترافية خلال ثوانٍ — بدون اشتراك أو إعداد أو منحنى تعلم.",
    reviewsTitle: "محبوب من قِبل بائعي التجارة الإلكترونية",
    reviewsSub: "أكثر من 12,000 متجر حول العالم",
    rating: "4.9 / 5 · أكثر من 2,400 تقييم",
  },
};

export function HomeSocialProof({ lang, middleSlot }: { lang: Lang; middleSlot?: ReactNode }) {
  const badges = BADGES[lang] ?? BADGES.en;
  const h = HEADINGS[lang] ?? HEADINGS.en;

  return (
    <section className="mx-auto mt-8 max-w-5xl px-4">
      {/* Value proposition + trust badges */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="text-center">
          <h2 className="text-[20px] font-semibold tracking-tight text-slate-900 md:text-[26px]">
            {h.valueTitle}
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-[13.5px] leading-relaxed text-slate-500 md:text-[14.5px]">
            {h.valueSub}
          </p>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
          {badges.map((b) => (
            <div
              key={b.label}
              className="flex min-w-0 items-start gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/50 p-3.5"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
                <b.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="break-words text-[13px] font-semibold leading-tight text-slate-900">{b.label}</div>
                <div className="mt-0.5 break-words text-[11.5px] leading-snug text-slate-500">{b.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {middleSlot ? <div className="mt-8">{middleSlot}</div> : null}

      {/* Reviews */}
      <div className="mt-8 text-center">

        <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11.5px] font-semibold text-amber-700">
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="h-3 w-3 fill-amber-500 text-amber-500" />
            ))}
          </div>
          {h.rating}
        </div>
        <h3 className="mt-3 text-[19px] font-semibold tracking-tight text-slate-900 md:text-[24px]">
          {h.reviewsTitle}
        </h3>
        <p className="mt-1 text-[13px] text-slate-500">{h.reviewsSub}</p>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {TESTIMONIALS.map((t) => (
          <figure
            key={t.name}
            className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center gap-0.5 text-amber-500">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-3.5 w-3.5 fill-amber-500" />
              ))}
            </div>
            <blockquote className="mt-3 flex-1 text-[13.5px] leading-relaxed text-slate-700">
              “{t.quote[lang] ?? t.quote.en}”
            </blockquote>
            <figcaption className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-3">
              <img
                src={t.avatar}
                alt=""
                className="h-9 w-9 rounded-full object-cover ring-1 ring-slate-200"
                loading="lazy"
              />
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-slate-900">{t.name}</div>
                <div className="text-[11.5px] text-slate-500">{t.role[lang] ?? t.role.en}</div>
              </div>
              <Clock className="ml-auto h-3.5 w-3.5 text-slate-300" />
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
