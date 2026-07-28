import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PricingSection } from "@/components/PricingSection";
import { TopNav } from "@/components/TopNav";
import { AdSlot } from "@/components/AdSlot";
import { HomeSocialProof } from "@/components/HomeSocialProof";
import { LanguageSelector } from "@/components/LanguageSelector";
import { usePreferredLanguage, type AppLang } from "@/lib/language";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — BgRemovify" },
      {
        name: "description",
        content:
          "Pay-as-you-go AI credits. No subscription, instant delivery. Choose the pack that fits your workflow.",
      },
      { property: "og:title", content: "Pricing — BgRemovify" },
      {
        property: "og:description",
        content: "Pay-as-you-go AI credits. No subscription. Instant delivery.",
      },
    ],
  }),
  component: PricingPage,
});

const HEADING_COPY: Record<AppLang, { brand: string; title: string; subtitle: string }> = {
  tr: {
    brand: "BgRemovify · Fiyatlandırma",
    title: "Sade ve dürüst fiyatlandırma",
    subtitle: "Abonelik yok. Bir kez öde, istediğin zaman kullan. Anında teslim.",
  },
  en: {
    brand: "BgRemovify · Pricing",
    title: "Simple, honest pricing",
    subtitle: "No subscription. Pay once, use anytime. Instant delivery.",
  },
  de: {
    brand: "BgRemovify · Preise",
    title: "Einfache, ehrliche Preise",
    subtitle: "Kein Abo. Einmal zahlen, jederzeit nutzen. Sofort verfügbar.",
  },
  es: {
    brand: "BgRemovify · Precios",
    title: "Precios simples y honestos",
    subtitle: "Sin suscripción. Paga una vez, úsalo cuando quieras. Entrega instantánea.",
  },
  ru: {
    brand: "BgRemovify · Тарифы",
    title: "Простые и честные тарифы",
    subtitle: "Без подписки. Оплатите один раз, используйте когда угодно. Мгновенная активация.",
  },
  ar: {
    brand: "BgRemovify · الأسعار",
    title: "أسعار بسيطة وشفافة",
    subtitle: "بدون اشتراك. ادفع مرة واحدة واستخدم متى شئت. تسليم فوري.",
  },
};

function PricingPage() {
  const navigate = useNavigate();
  const lang = usePreferredLanguage();
  const copy = HEADING_COPY[lang] ?? HEADING_COPY.en;
  const isRtl = lang === "ar";

  return (
    <div className="min-h-screen bg-[#f7f8fb]" dir={isRtl ? "rtl" : "ltr"}>
      <TopNav rightSlot={<LanguageSelector />} />

      <header className="sticky top-14 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="text-[14px] font-semibold tracking-tight text-slate-900">
            {copy.brand}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 md:py-12">
        <div className="mb-6">
          <AdSlot label="Sponsored · 728×90 / Responsive" height="h-20 sm:h-24" />
        </div>

        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            {copy.title}
          </h1>
          <p className="mt-3 text-[15px] text-slate-500">
            {copy.subtitle}
          </p>
        </div>

        <PricingSection
          lang={lang}
          onBuy={() => navigate({ to: "/" })}
        />

        <div className="mt-10">
          <HomeSocialProof lang={lang} />
        </div>

        <div className="mt-10">
          <AdSlot label="Sponsored · Responsive" height="h-24" />
        </div>
      </main>
    </div>
  );
}
