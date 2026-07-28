import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Zap, Lock, Download } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { detectGeo, formatLocalFromUsd, getLocalCurrency, type GeoRegion } from "@/lib/geo";
import { refreshLiveFxRates } from "@/lib/fx-rates";
import { track } from "@/lib/analytics";




export type PricingRegion = "kz" | "global";
export type PricingMarket = "kz" | "tr" | "global";
export type PricingLang = "tr" | "en" | "es" | "de" | "ru" | "ar";

interface Props {
  defaultRegion?: PricingRegion;
  onBuy: (region: PricingRegion) => void;
  ctaLabel?: string;
  highlight?: boolean;
  /**
   * Which pricing tabs / payment surfaces to expose.
   * - "kz"     → local currency display (₸ KZT) but billed in USD via iyzico
   * - "tr"     → TRY billing via iyzico
   * - "global" → USD/EUR/etc billing via iyzico
   */
  market?: PricingMarket;
  lang?: PricingLang;
}


// Global anchor price; PPP discount kicks in for TR / KZ visitors.
const GLOBAL_PRICE_USD = 14.99;
const PPP_PRICE_USD = 6.99;
const TR_LOCAL_PRICE = "₺249";
const KZ_LOCAL_PRICE = "₸2.990";

type Strings = {
  sectionBadge: string;
  heading: string;
  subheading: string;
  globalTab: string;
  kzTab: string;
  freeTitle: string;
  freeGift: string;
  freeFeatures: string[];
  currentPlan: string;
  mostPopular: string;
  premiumTitle: string;
  kzBadge: string;
  trBadge: string;
  kzPppBadge: string;
  monthSuffix: string;
  monthSuffixUsd: string;
  kzMonthlyHint: string;
  globalMonthlyHint: string;
  creditLine1: string;
  creditLine2: string;
  proFeatures: string[];
  ctaGlobal: string;
  footer: string;
};

const T: Record<PricingLang, Strings> = {
  tr: {
    sectionBadge: "Planlar & Fiyatlar",
    heading: "Bir planı seç ve daha hızlı çalışmaya başla",
    subheading: "Kredi Kartı Gerekmez • Hemen Ücretsiz Deneyin!",
    globalTab: "🌍 Global (USD)",
    kzTab: "🇰🇿 Қазақстан (KZT)",
    freeTitle: "Ücretsiz Deneme",
    freeGift: "Ücretsiz ön izleme ve arka plan temizleme",
    freeFeatures: ["Kayıt olmadan ön izleme", "Güvenli yerel arka plan temizleme", "Ürününü ekranda tutan akış", "Standart çözünürlük", "Final çıktılar krediyle alınır"],
    currentPlan: "Mevcut Plan",
    mostPopular: "En Popüler",
    premiumTitle: "Premium Studio",
    kzBadge: "🇰🇿 Kazakistan'a Özel",
    trBadge: "🇹🇷 Türkiye'ye Özel %53 İndirim",
    kzPppBadge: "🇰🇿 Қазақстанға арнайы 53% жеңілдік",
    monthSuffix: "/ay",
    monthSuffixUsd: "/ay",
    kzMonthlyHint: "100 kredi · aylık yenilenir",
    globalMonthlyHint: "100 kredi · aylık yenilenir",
    creditLine1: "1 Kredi = 1 İşlenmiş Görsel. Gizli ücret veya sürpriz kesinti yok.",
    creditLine2: "",
    proFeatures: ["⚡ Sorunsuz Toplu Yükleme (Tek seferde 50 - 100 fotoğrafa kadar!)", "🛍️ E-Ticaret İçin Kusursuz (Shopify, Amazon, eBay Satıcıları)", "4K HD kalite", "Watermark yok", "10× daha hızlı sunucu", "AI Studio arkaplanlar"],
    ctaGlobal: "Premium'a yükselt",
    footer: "🔒 Güvenli ödeme · Anında aktivasyon · 7 gün iade garantisi",
  },
  en: {
    sectionBadge: "Plans & Pricing",
    heading: "Pick a plan and ship faster",
    subheading: "No Credit Card Required • Try It Free Now!",
    globalTab: "🌍 Global (USD)",
    kzTab: "🇰🇿 Kazakhstan (KZT)",
    freeTitle: "Free Trial",
    freeGift: "Free preview and background removal",
    freeFeatures: ["Preview without sign-up", "Safe local background removal", "Your product stays on screen", "Standard resolution", "Final exports use credits"],
    currentPlan: "Current Plan",
    mostPopular: "Most Popular",
    premiumTitle: "Premium Studio",
    kzBadge: "🇰🇿 Kazakhstan Special",
    trBadge: "🇹🇷 Türkiye 53% off",
    kzPppBadge: "🇰🇿 Kazakhstan special 53% off",
    monthSuffix: "/mo",
    monthSuffixUsd: "/mo",
    kzMonthlyHint: "100 credits · renews monthly",
    globalMonthlyHint: "100 credits · renews monthly",
    creditLine1: "1 Credit = 1 fully processed image. No hidden fees or surprise deductions.",
    creditLine2: "",
    proFeatures: ["⚡ Flawless Bulk Upload (50 - 100 photos seamlessly at once!)", "🛍️ Perfect for E-Commerce (Shopify, Amazon, eBay Sellers)", "4K HD quality", "No watermark", "10× faster servers", "AI Studio backgrounds"],
    ctaGlobal: "Upgrade to Premium",
    footer: "🔒 Secure payment · Instant activation · 7-day refund guarantee",
  },
  es: {
    sectionBadge: "Planes y Precios",
    heading: "Elige un plan y trabaja más rápido",
    subheading: "Sin Tarjeta de Crédito • ¡Pruébalo Gratis Ahora!",
    globalTab: "🌍 Global (USD)",
    kzTab: "🇰🇿 Kazajistán (KZT)",
    freeTitle: "Prueba Gratis",
    freeGift: "Vista previa y eliminación de fondo gratis",
    freeFeatures: ["Vista previa sin registro", "Eliminación local segura", "Tu producto permanece en pantalla", "Resolución estándar", "Las exportaciones finales usan créditos"],
    currentPlan: "Plan Actual",
    mostPopular: "Más Popular",
    premiumTitle: "Premium Studio",
    kzBadge: "🇰🇿 Especial Kazajistán",
    trBadge: "🇹🇷 Turquía 53% off",
    kzPppBadge: "🇰🇿 Kazajistán especial 53% off",
    monthSuffix: "/mes",
    monthSuffixUsd: "/mes",
    kzMonthlyHint: "100 créditos · se renueva mensualmente",
    globalMonthlyHint: "100 créditos · se renueva mensualmente",
    creditLine1: "1 Crédito = 1 imagen procesada. Sin tarifas ocultas ni sorpresas.",
    creditLine2: "",
    proFeatures: ["⚡ Carga masiva impecable (¡50 - 100 fotos a la vez sin problemas!)", "🛍️ Perfecto para E-Commerce (vendedores de Shopify, Amazon, eBay)", "Calidad 4K HD", "Sin marca de agua", "Servidores 10× más rápidos", "Fondos AI Studio"],
    ctaGlobal: "Mejorar a Premium",
    footer: "🔒 Pago seguro · Activación instantánea · 7 días de garantía",
  },
  de: {
    sectionBadge: "Pläne & Preise",
    heading: "Wähle einen Plan und arbeite schneller",
    subheading: "Keine Kreditkarte nötig • Jetzt kostenlos testen!",
    globalTab: "🌍 Global (USD)",
    kzTab: "🇰🇿 Kasachstan (KZT)",
    freeTitle: "Kostenlose Testversion",
    freeGift: "Kostenlose Vorschau und Freistellung",
    freeFeatures: ["Vorschau ohne Anmeldung", "Sichere lokale Freistellung", "Dein Produkt bleibt sichtbar", "Standardauflösung", "Finale Exporte nutzen Credits"],
    currentPlan: "Aktueller Plan",
    mostPopular: "Am Beliebtesten",
    premiumTitle: "Premium Studio",
    kzBadge: "🇰🇿 Kasachstan-Special",
    trBadge: "🇹🇷 Türkei 53% Rabatt",
    kzPppBadge: "🇰🇿 Kasachstan-Special 53% Rabatt",
    monthSuffix: "/Mon.",
    monthSuffixUsd: "/Mon.",
    kzMonthlyHint: "100 Credits · monatliche Erneuerung",
    globalMonthlyHint: "100 Credits · monatliche Erneuerung",
    creditLine1: "1 Credit = 1 fertig bearbeitetes Bild. Keine versteckten Gebühren.",
    creditLine2: "",
    proFeatures: ["⚡ Problemloser Massen-Upload (50 - 100 Fotos auf einmal!)", "🛍️ Perfekt für E-Commerce (Shopify, Amazon, eBay-Händler)", "4K HD-Qualität", "Kein Wasserzeichen", "10× schnellere Server", "AI-Studio-Hintergründe"],
    ctaGlobal: "Auf Premium upgraden",
    footer: "🔒 Sichere Zahlung · Sofort aktiv · 7 Tage Geld-zurück",
  },
  ru: {
    sectionBadge: "Тарифы и Цены",
    heading: "Выберите тариф и работайте быстрее",
    subheading: "Без карты • Попробуйте бесплатно прямо сейчас!",
    globalTab: "🌍 Глобально (USD)",
    kzTab: "🇰🇿 Қазақстан (KZT)",
    freeTitle: "Бесплатно",
    freeGift: "Бесплатный предпросмотр и удаление фона",
    freeFeatures: ["Предпросмотр без регистрации", "Безопасное локальное удаление фона", "Товар остаётся на экране", "Стандартное разрешение", "Финальный экспорт использует кредиты"],
    currentPlan: "Текущий план",
    mostPopular: "Самый популярный",
    premiumTitle: "Premium Studio",
    kzBadge: "🇰🇿 Спецпредложение для Казахстана",
    trBadge: "🇹🇷 Скидка 53% для Турции",
    kzPppBadge: "🇰🇿 Қазақстанға арнайы 53% жеңілдік",
    monthSuffix: "/мес",
    monthSuffixUsd: "/мес",
    kzMonthlyHint: "100 кредитов · ежемесячное продление",
    globalMonthlyHint: "100 кредитов · ежемесячное продление",
    creditLine1: "1 Кредит = 1 полностью обработанное изображение. Без скрытых комиссий.",
    creditLine2: "",
    proFeatures: ["⚡ Бесперебойная массовая загрузка (50–100 фото одновременно!)", "🛍️ Идеально для E-Commerce (Продавцы Shopify, Amazon, eBay)", "Качество 4K HD", "Без водяного знака", "Серверы в 10× быстрее", "AI Studio фоны"],
    ctaGlobal: "Перейти на Premium",
    footer: "🔒 Безопасная оплата · Мгновенная активация · Возврат 7 дней",
  },
  ar: {
    sectionBadge: "الخطط والأسعار",
    heading: "اختر خطة وابدأ العمل بشكل أسرع",
    subheading: "بدون بطاقة ائتمان • جرّبها مجاناً الآن!",
    globalTab: "🌍 عالمي (USD)",
    kzTab: "🇰🇿 كازاخستان (KZT)",
    freeTitle: "تجربة مجانية",
    freeGift: "معاينة مجانية وإزالة خلفية",
    freeFeatures: ["معاينة بدون تسجيل", "إزالة خلفية محلية وآمنة", "يبقى المنتج ظاهراً على الشاشة", "دقة قياسية", "التصدير النهائي يستخدم الأرصدة"],
    currentPlan: "الخطة الحالية",
    mostPopular: "الأكثر شعبية",
    premiumTitle: "Premium Studio",
    kzBadge: "🇰🇿 عرض خاص لكازاخستان",
    trBadge: "🇹🇷 خصم 53% لتركيا",
    kzPppBadge: "🇰🇿 عرض كازاخستان 53%",
    monthSuffix: "/شهر",
    monthSuffixUsd: "/شهر",
    kzMonthlyHint: "100 رصيد · يتجدد شهريًا",
    globalMonthlyHint: "100 رصيد · يتجدد شهريًا",
    creditLine1: "1 رصيد = صورة واحدة معالجة بالكامل. لا رسوم خفية.",
    creditLine2: "",
    proFeatures: ["⚡ تحميل جماعي سلس (50 - 100 صورة دفعة واحدة!)", "🛍️ مثالي للتجارة الإلكترونية (بائعو Shopify و Amazon و eBay)", "جودة 4K HD", "بدون علامة مائية", "خوادم أسرع بـ 10×", "خلفيات AI Studio"],
    ctaGlobal: "الترقية إلى Premium",
    footer: "🔒 دفع آمن · تفعيل فوري · ضمان استرداد 7 أيام",
  },
};

export function PricingSection({ defaultRegion: _defaultRegion = "global", onBuy, ctaLabel, highlight = false, market: _market = "kz", lang = "tr" }: Props) {
  const s = T[lang] ?? T.tr;
  const region: PricingRegion = "global";
  const [geo, setGeo] = useState<GeoRegion>("GLOBAL");
  const [geoReady, setGeoReady] = useState(false);
  const [fxReady, setFxReady] = useState(false);

  useEffect(() => {
    // Live FX rates yüklenene kadar yerel para birimini gösterme — ilk
    // render'da eski/statik kur ile "₺160" gibi yanlış rakam gözükmesini engeller.
    void refreshLiveFxRates().finally(() => setFxReady(true));
    detectGeo().then((g) => {
      setGeo(g.region);
      setGeoReady(true);
    });
  }, []);


  const isCis = geo === "KZ" || geo === "UZ" || geo === "KG" || geo === "RU";
  const isPpp = geo === "TR" || isCis;

  // CIS visitors see local marketplaces (Ozon/Wildberries) instead of Amazon/eBay.
  const localizeMarketplaces = (label: string): string => {
    if (!isCis) return label;
    return label
      .replace(/Shopify,\s*Amazon,\s*eBay/g, "Ozon, Wildberries, Kaspi Mağaza")
      .replace(/Shopify\s+و\s+Amazon\s+و\s+eBay/g, "Ozon و Wildberries");
  };

  const handleBuy = (r: PricingRegion) => {
    void track("click_pro", { region: r, geo, ppp_applied: isPpp });
    onBuy(r);
  };


  return (
    <section
      id="pricing"
      className={`max-w-5xl mx-auto mt-16 sm:mt-24 px-2 scroll-mt-24 rounded-3xl transition-all duration-500 ${
        highlight ? "ring-4 ring-primary/60 shadow-[0_0_40px_hsl(var(--primary)/0.35)]" : "ring-0"
      }`}
    >
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium mb-3">
          {s.sectionBadge}
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{s.heading}</h2>
        <div className="mt-4 flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 ring-1 ring-primary/20 text-primary px-4 py-1.5 text-sm sm:text-base font-bold shadow-sm">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75"></span>
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
            </span>
            <span>{s.subheading}</span>
          </span>
        </div>

      </div>

      <GatewayUpgradeNotice lang={lang} supported={true} />

      <GlobalPackageGrid
        lang={lang}
        proFeatures={s.proFeatures.map(localizeMarketplaces)}
        creditLine1={s.creditLine1}
        creditLine2={s.creditLine2}
        mostPopularLabel={s.mostPopular}
        ctaLabel={ctaLabel ?? s.ctaGlobal}
        onBuy={() => handleBuy(region)}
        geo={geo}
        geoReady={geoReady && fxReady}
      />

      <TrustStrip lang={lang} />


      <p className="text-center text-xs text-muted-foreground mt-5">
        {s.footer}
      </p>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Conversion trust block — sits under the pricing grid.
// Kept minimal on purpose: no-subscription line, payment method wordmarks,
// SSL note and instant-delivery reassurance.
// ─────────────────────────────────────────────────────────────────────────────

const TRUST_COPY: Record<PricingLang, {
  noSub: string;
  ssl: string;
  instant: string;
}> = {
  tr: {
    noSub: "Tek seferlik ödeme. Abonelik yok. Gizli ücret yok.",
    ssl: "256-bit SSL Güvenli Ödeme",
    instant: "Yüksek Çözünürlüklü Anında İndirme. Bekleme yok.",
  },
  en: {
    noSub: "One-time payment. No subscription. No hidden fees.",
    ssl: "256-bit SSL Secure Checkout",
    instant: "Instant High-Resolution Download. No waiting.",
  },
  ru: {
    noSub: "Разовая оплата. Без подписки. Без скрытых комиссий.",
    ssl: "Безопасная оплата 256-bit SSL",
    instant: "Мгновенная загрузка в высоком разрешении. Без ожидания.",
  },
  es: {
    noSub: "Pago único. Sin suscripción. Sin cargos ocultos.",
    ssl: "Pago seguro con SSL de 256 bits",
    instant: "Descarga instantánea en alta resolución. Sin esperas.",
  },
  de: {
    noSub: "Einmalzahlung. Kein Abo. Keine versteckten Gebühren.",
    ssl: "256-Bit SSL sicherer Checkout",
    instant: "Sofortiger Download in hoher Auflösung. Kein Warten.",
  },
  ar: {
    noSub: "دفعة واحدة فقط. بدون اشتراك. بدون رسوم خفية.",
    ssl: "دفع آمن بتشفير SSL 256-bit",
    instant: "تنزيل فوري بدقة عالية. بدون انتظار.",
  },
};

function TrustStrip({ lang }: { lang: PricingLang }) {
  const t = TRUST_COPY[lang] ?? TRUST_COPY.en;
  const isRtl = lang === "ar";
  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="mt-6 flex flex-col items-center gap-3 text-center">
      <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground/90">
        <Lock className="size-3.5 text-primary" aria-hidden />
        <span>{t.noSub}</span>
      </p>

      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {/* Visa */}
        <span className="inline-flex items-center rounded-md bg-white ring-1 ring-black/10 px-2 py-1 shadow-sm" aria-label="Visa">
          <span className="italic font-black text-[12px] tracking-tight" style={{ color: "#1A1F71", fontFamily: "Georgia, serif" }}>VISA</span>
        </span>
        {/* Mastercard */}
        <span className="inline-flex items-center rounded-md bg-white ring-1 ring-black/10 px-2 py-1 shadow-sm" aria-label="Mastercard">
          <svg width="26" height="16" viewBox="0 0 26 16" aria-hidden>
            <circle cx="9" cy="8" r="6" fill="#EB001B" />
            <circle cx="17" cy="8" r="6" fill="#F79E1B" />
            <path d="M13 3.6a6 6 0 0 0 0 8.8 6 6 0 0 0 0-8.8z" fill="#FF5F00" />
          </svg>
        </span>
        {/* Apple Pay */}
        <span className="inline-flex items-center rounded-md bg-white ring-1 ring-black/10 px-2 py-1 shadow-sm" aria-label="Apple Pay">
          <svg width="32" height="14" viewBox="0 0 40 16" fill="#000" aria-hidden>
            <path d="M6.5 2.2c.5-.6.8-1.4.7-2.2-.7 0-1.5.4-2 1-.5.6-.9 1.4-.7 2.2.8 0 1.6-.4 2-1zM7.1 3.3c-1.1-.1-2 .6-2.6.6-.6 0-1.4-.6-2.3-.6-1.2 0-2.3.7-2.9 1.8C-1.9 7.4-.6 11 .6 13c.6 1 1.3 2 2.3 2 .9 0 1.3-.6 2.4-.6s1.4.6 2.4.6c1 0 1.6-1 2.2-2 .7-1.1 1-2.3 1-2.3s-1.9-.7-1.9-2.9c0-1.8 1.5-2.7 1.6-2.7-.9-1.3-2.2-1.5-2.7-1.5z"/>
            <text x="13" y="12" fontFamily="-apple-system, Helvetica, Arial, sans-serif" fontSize="10" fontWeight="600" fill="#000">Pay</text>
          </svg>
        </span>
        {/* Google Pay */}
        <span className="inline-flex items-center rounded-md bg-white ring-1 ring-black/10 px-2 py-1 shadow-sm" aria-label="Google Pay">
          <svg width="42" height="14" viewBox="0 0 52 16" aria-hidden>
            <text x="0" y="12" fontFamily="Arial, sans-serif" fontSize="11" fontWeight="700">
              <tspan fill="#4285F4">G</tspan>
              <tspan fill="#EA4335">o</tspan>
              <tspan fill="#FBBC04">o</tspan>
              <tspan fill="#4285F4">g</tspan>
              <tspan fill="#34A853">l</tspan>
              <tspan fill="#EA4335">e</tspan>
            </text>
            <text x="30" y="12" fontFamily="Arial, sans-serif" fontSize="11" fontWeight="600" fill="#5F6368">Pay</text>
          </svg>
        </span>
      </div>

      <p className="text-[10.5px] text-muted-foreground -mt-1">{t.ssl}</p>

      <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Download className="size-3.5 text-emerald-500" aria-hidden />
        <span>{t.instant}</span>
      </p>
    </div>
  );
}


const GATEWAY_NOTICE: Record<PricingLang, { supported: { title: string; body: string }; unsupported: { title: string; body: string } }> = {
  tr: {
    supported: { title: "🔒 Güvenli Ödeme — Yerel Para Birimi", body: "Kredi Kartı, Banka Kartı, Apple Pay ve Google Pay ile ödeme ekranında gördüğün para birimiyle ödeme yaparsın. Krediler ödeme sonrası anında hesabına tanımlanır." },
    unsupported: { title: "🔒 Yerel Ödeme — Para Birimi Değişmez", body: "Bu para birimi kart altyapısında desteklenmediği için müşteriyi yabancı ödeme ekranına atmıyoruz. Sipariş yerel ödeme kanalıyla tamamlanır." },
  },
  en: {
    supported: { title: "🔒 Secure Checkout — Local Currency", body: "Pay by card, Apple Pay or Google Pay in the same currency shown on the site. Credits are added instantly after checkout." },
    unsupported: { title: "🔒 Local Payment — No Currency Switch", body: "This currency is not supported by the card gateway, so we never send you to a foreign checkout. Your order continues through a local payment channel." },
  },
  ru: {
    supported: { title: "🔒 Безопасная оплата — местная валюта", body: "Оплачивайте картой, Apple Pay или Google Pay в той же валюте, которая показана на сайте. Кредиты зачисляются мгновенно." },
    unsupported: { title: "🔒 Местная оплата — без смены валюты", body: "Эта валюта не поддерживается карточным шлюзом, поэтому мы не отправляем вас на чужую страницу оплаты. Заказ продолжается через местный способ оплаты." },
  },
  es: {
    supported: { title: "🔒 Pago seguro — moneda local", body: "Paga con tarjeta, Apple Pay o Google Pay en la misma moneda que ves en el sitio. Los créditos se acreditan al instante." },
    unsupported: { title: "🔒 Pago local — sin cambio de moneda", body: "Esta moneda no está soportada por la pasarela de tarjeta, así que no te enviamos a un checkout extranjero. El pedido continúa por un canal de pago local." },
  },
  de: {
    supported: { title: "🔒 Sicherer Checkout — lokale Währung", body: "Zahle per Karte, Apple Pay oder Google Pay in derselben Währung, die auf der Website angezeigt wird. Credits werden sofort gutgeschrieben." },
    unsupported: { title: "🔒 Lokale Zahlung — kein Währungswechsel", body: "Diese Währung wird vom Karten-Gateway nicht unterstützt, deshalb leiten wir dich nicht zu einem fremden Checkout weiter. Die Bestellung läuft über einen lokalen Zahlungsweg." },
  },
  ar: {
    supported: { title: "🔒 دفع آمن — العملة المحلية", body: "ادفع بالبطاقة أو Apple Pay أو Google Pay بنفس العملة الظاهرة في الموقع. تُضاف الأرصدة فور إتمام الدفع." },
    unsupported: { title: "🔒 دفع محلي — بدون خصم مفاجئ بالليرة التركية", body: "هذه العملة غير مدعومة في بوابة البطاقات، لذلك لا نرسلك إلى صفحة دفع أجنبية/تركية. يستمر الطلب عبر قناة دفع محلية." },
  },
};

function GatewayUpgradeNotice({ lang, compact = false, supported }: { lang: PricingLang; compact?: boolean; supported: boolean }) {
  const t = (GATEWAY_NOTICE[lang] ?? GATEWAY_NOTICE.en)[supported ? "supported" : "unsupported"];
  const isRtl = lang === "ar";
  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className={`relative rounded-2xl border-2 border-primary/60 bg-gradient-to-br from-primary/15 via-card to-card leading-relaxed shadow-[0_0_0_1px_hsl(var(--primary)/0.35),0_0_24px_hsl(var(--primary)/0.55),0_0_60px_hsl(var(--primary)/0.35)] ring-1 ring-primary/40 ${compact ? "px-4 py-3" : "mb-6 px-5 py-4"}`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-r from-primary/40 via-primary/10 to-primary/40 opacity-60 blur-md -z-10"
      />
      <div className={`font-bold text-foreground mb-1.5 drop-shadow-[0_0_8px_hsl(var(--primary)/0.55)] ${compact ? "text-sm sm:text-base" : "text-base sm:text-lg"}`}>
        {t.title}
      </div>
      <div className={`text-foreground/85 ${compact ? "text-xs sm:text-sm" : "text-sm sm:text-[15px]"}`}>{t.body}</div>
    </div>
  );

}



// ─────────────────────────────────────────────────────────────────────────────
// Global (USD) 3-package grid: Starter / Premium / Business with
// welcome-bonus credits highlighted.
// ─────────────────────────────────────────────────────────────────────────────

type GlobalPkgId = "starter" | "pro" | "premium";

interface GlobalPackage {
  id: GlobalPkgId;
  name: string;          // universal English brand name
  priceUsd: number;      // base USD price — display converted to local via live FX
  credits: number;       // NET total credits (bonus already included)
  bonusIncluded: number; // for the small "+X bonus included" note; no separate counter
  featured?: boolean;
}

// Bonuslar peşinen NET krediye dahil — Starter 70+10=80, Pro 160+15=175, Scale 350+20=370.
const GLOBAL_PACKAGES: GlobalPackage[] = [
  { id: "starter", name: "Starter", priceUsd: 7,  credits: 80,  bonusIncluded: 10 },
  { id: "pro",     name: "Pro",     priceUsd: 14, credits: 175, bonusIncluded: 15, featured: true },
  { id: "premium", name: "Scale",   priceUsd: 24, credits: 370, bonusIncluded: 20 },
];

const KZ_FIXED_DISPLAY_PRICE: Record<GlobalPkgId, string> = {
  starter: "₸3990",
  pro: "₸7990",
  premium: "₸12990",
};

const GLOBAL_LABELS: Record<PricingLang, {
  perMonth: string;
  totalCredits: (n: number) => string;
  bonusBadge: (n: number) => string;
}> = {
  tr: {
    perMonth: "/ay",
    totalCredits: (n) => `${n} Kredi`,
    bonusBadge: (n) => `🎁 +${n} bonus dahil`,
  },
  en: {
    perMonth: "/mo",
    totalCredits: (n) => `${n} Credits`,
    bonusBadge: (n) => `🎁 +${n} bonus included`,
  },
  es: {
    perMonth: "/mes",
    totalCredits: (n) => `${n} Créditos`,
    bonusBadge: (n) => `🎁 +${n} bono incluido`,
  },
  de: {
    perMonth: "/Mon.",
    totalCredits: (n) => `${n} Credits`,
    bonusBadge: (n) => `🎁 +${n} Bonus inklusive`,
  },
  ru: {
    perMonth: "/мес",
    totalCredits: (n) => `${n} кредитов`,
    bonusBadge: (n) => `🎁 +${n} бонус включён`,
  },
  ar: {
    perMonth: "/شهر",
    totalCredits: (n) => `${n} رصيد`,
    bonusBadge: (n) => `🎁 +${n} مكافأة مضمّنة`,
  },
};

// Starter ve Scale kartlarına özel — Pro (featured) zaten `proFeatures` kullanıyor.
const TIER_FEATURES: Record<PricingLang, { starter: string[]; scale: string[] }> = {
  tr: {
    starter: [
      "80 kredi · ~80 profesyonel görsel",
      "4K HD indirme · watermark yok",
      "Kişisel + ticari kullanım lisansı",
      "Standart hız kuyruğu",
      "E-posta destek · 12 ay geçerlilik",
    ],
    scale: [
      "370 kredi (350 + 20 bonus)",
      "Pro'daki tüm özellikler dahil",
      "⚡ VIP Fast Lane · öncelikli sıra",
      "🔌 API erişimi + Toplu Upload (500+)",
      "🏆 WhatsApp öncelikli destek",
    ],
  },
  en: {
    starter: [
      "80 credits · ~80 pro-grade images",
      "4K HD download · no watermark",
      "Personal + commercial license",
      "Standard-speed queue",
      "Email support · 12-month validity",
    ],
    scale: [
      "370 credits (350 + 20 bonus)",
      "Everything in Pro included",
      "⚡ VIP Fast Lane · priority queue",
      "🔌 API access + Bulk Upload (500+)",
      "🏆 WhatsApp priority support",
    ],
  },
  es: {
    starter: [
      "80 créditos · ~80 imágenes pro",
      "Descarga 4K HD · sin marca de agua",
      "Licencia personal + comercial",
      "Cola de velocidad estándar",
      "Soporte por email · válido 12 meses",
    ],
    scale: [
      "370 créditos (350 + 20 bono)",
      "Todo lo de Pro incluido",
      "⚡ VIP Fast Lane · cola prioritaria",
      "🔌 Acceso API + Carga masiva (500+)",
      "🏆 Soporte prioritario por WhatsApp",
    ],
  },
  de: {
    starter: [
      "80 Credits · ~80 Pro-Bilder",
      "4K HD Download · kein Wasserzeichen",
      "Private + kommerzielle Lizenz",
      "Standard-Warteschlange",
      "E-Mail-Support · 12 Monate gültig",
    ],
    scale: [
      "370 Credits (350 + 20 Bonus)",
      "Alle Pro-Funktionen enthalten",
      "⚡ VIP Fast Lane · priorisierte Queue",
      "🔌 API-Zugang + Massen-Upload (500+)",
      "🏆 WhatsApp-Prioritätssupport",
    ],
  },
  ru: {
    starter: [
      "80 кредитов · ~80 pro-изображений",
      "Скачивание 4K HD · без вотермарка",
      "Личная + коммерческая лицензия",
      "Стандартная очередь",
      "Email-поддержка · 12 месяцев",
    ],
    scale: [
      "370 кредитов (350 + 20 бонус)",
      "Всё из Pro включено",
      "⚡ VIP Fast Lane · приоритетная очередь",
      "🔌 API-доступ + Массовая загрузка (500+)",
      "🏆 Приоритетная поддержка в WhatsApp",
    ],
  },
  ar: {
    starter: [
      "80 رصيد · حوالي 80 صورة احترافية",
      "تنزيل 4K HD · بدون علامة مائية",
      "ترخيص شخصي + تجاري",
      "طابور بسرعة قياسية",
      "دعم بالبريد · صلاحية 12 شهرًا",
    ],
    scale: [
      "370 رصيد (350 + 20 مكافأة)",
      "كل ميزات Pro مضمّنة",
      "⚡ VIP Fast Lane · طابور أولوية",
      "🔌 وصول API + تحميل جماعي (500+)",
      "🏆 دعم أولوية عبر WhatsApp",
    ],
  },
};

interface GlobalGridProps {
  lang: PricingLang;
  proFeatures: string[];
  creditLine1: string;
  creditLine2: string;
  mostPopularLabel: string;
  ctaLabel: string;
  onBuy: (pkg: GlobalPackage) => void;
  geo: GeoRegion;
  geoReady: boolean;
}

function GlobalPackageGrid({ lang, proFeatures, creditLine1, creditLine2, mostPopularLabel, ctaLabel, onBuy, geo, geoReady }: GlobalGridProps) {
  const L = GLOBAL_LABELS[lang] ?? GLOBAL_LABELS.en;
  const local = getLocalCurrency(geo);
  const showLocal = geoReady && local.code !== "USD";
  const showKzFixedPrice = geoReady && geo === "KZ";
  return (
    <div className="grid sm:grid-cols-3 gap-4 sm:gap-5 items-stretch mt-5 max-w-4xl mx-auto">

      {GLOBAL_PACKAGES.map((pkg) => {
        const isFeatured = !!pkg.featured;
        return (
          <div
            key={pkg.id}
            className={`relative rounded-2xl p-6 flex flex-col ${
              isFeatured
                ? "border-2 border-primary bg-gradient-to-br from-primary/10 via-card to-card shadow-[0_10px_40px_-12px_hsl(var(--primary)/0.5)]"
                : "border bg-card shadow-sm"
            }`}
          >
            {isFeatured && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-3 py-1 text-xs font-semibold shadow-md">
                  <Sparkles className="size-3" /> {mostPopularLabel}
                </span>
              </div>
            )}

            <div className={`text-sm font-semibold ${isFeatured ? "text-primary" : "text-muted-foreground"}`}>
              {pkg.name}
            </div>

            <div className="mt-2 flex items-baseline gap-1.5 flex-wrap">
              <span className="text-4xl font-bold tracking-tight">
                {showKzFixedPrice ? KZ_FIXED_DISPLAY_PRICE[pkg.id] : showLocal ? formatLocalFromUsd(geo, pkg.priceUsd) : `$${pkg.priceUsd.toFixed(2)}`}
              </span>
              <span className="text-sm text-muted-foreground">
                {showLocal ? local.code : "USD"}
              </span>
            </div>

            {showLocal && !showKzFixedPrice && (
              <div className="text-[11px] text-muted-foreground -mt-1">
                ≈ ${pkg.priceUsd.toFixed(2)} USD
              </div>
            )}

            <div className="mt-3">
              <div className="text-2xl font-extrabold text-foreground">
                {L.totalCredits(pkg.credits)}
              </div>
              {pkg.bonusIncluded > 0 && (
                <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500/20 to-primary/20 border border-amber-500/40 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                  {L.bonusBadge(pkg.bonusIncluded)}
                </div>
              )}
            </div>



            {isFeatured && (
              <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
                <p className="text-[11px] font-medium text-primary/90 leading-snug">{creditLine1}</p>
                {creditLine2 && (
                  <p className="text-[11px] font-medium text-primary/80 leading-snug mt-0.5">{creditLine2}</p>
                )}
              </div>
            )}

            {isFeatured ? (
              <ul className="mt-4 space-y-2 text-sm flex-1">
                {proFeatures.slice(0, 5).map((label) => (
                  <li key={label} className="flex items-center gap-2 font-medium">
                    <Check className="size-4 text-primary shrink-0" />
                    <span>{label}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="mt-4 space-y-2 text-sm flex-1">
                {(TIER_FEATURES[lang] ?? TIER_FEATURES.en)[pkg.id === "starter" ? "starter" : "scale"].map((label) => (
                  <li key={label} className="flex items-start gap-2 text-foreground/85">
                    <Check className="size-4 text-primary shrink-0 mt-0.5" />
                    <span>{label}</span>
                  </li>
                ))}
              </ul>
            )}

            <Button
              className="w-full mt-5"
              size="lg"
              variant={isFeatured ? "default" : "secondary"}
              onClick={() => onBuy(pkg)}
            >
              {ctaLabel}
            </Button>
          </div>
        );
      })}
    </div>
  );
}

