// iyzico tek seferlik kredi paketleri.
// Server + client'ta ortak kullanılır — sadece meta bilgi, secret içermez.
//
// ENFLASYON KALKANI (yalnız TR):
//   - `amountUsd` bu paketin USD taban değeridir (döviz sabitleyici).
//   - Gerçek çekim tutarı: max(amountTry_floor, round(amountUsd * live USD→TRY)).
//   - `amountTry` alt taban görevi görür; kur düşse bile bu tutarın altına inmeyiz.
//   - Global pazarlar bu mantığa DAHİL DEĞİL — kendi akışlarında kalır.

export type IyzicoPlanKey = "starter" | "pro" | "premium";
// KZT/UZS iyzico Multi-Currency panelinde döviz kuru olarak tanımlı değil (5171).
// Bu iki para birimi sadece DisplayCurrency olarak kalır; ödeme USD üzerinden çekilir.
export type IyzicoCurrency = "TRY" | "USD" | "EUR" | "GBP" | "NOK" | "CHF";
export type DisplayCurrency = IyzicoCurrency | "KZT" | "UZS" | "KGS" | "RUB" | "AZN" | "CAD" | "AED" | "SAR";


export type IyzicoPlan = {
  id: string;
  key: IyzicoPlanKey;
  /** Canonical Turkish label — used for server-side receipts / logs only. */
  label: string;
  credits: number;
  /** TRY alt tabanı — kur çok düşerse bile bu tutarın altına inilmez. */
  amountTry: number;
  /** USD taban değeri — TR dinamik fiyat bu değerden hesaplanır. */
  amountUsd: number;
  highlight?: boolean;
};

// Nihai fiyatlandırma — üçlü paket. Bonuslar peşinen NET krediye dahildir,
// ayrı sayaç/kod yok. Toplam kredi = paketin `credits` alanı.
// Starter $7 → 80 Kredi (70 + 10 bonus) · Pro $14 → 175 Kredi (160 + 15 bonus)
// Scale $24 → 370 Kredi (350 + 20 bonus).
export const IYZICO_PLANS: IyzicoPlan[] = [
  {
    id: "iyz_starter",
    key: "starter",
    label: "Starter Paketi · 80 Kredi",
    credits: 80,
    amountTry: 239,
    amountUsd: 7,
  },
  {
    id: "iyz_pro",
    key: "pro",
    label: "Pro Paketi · 175 Kredi · Bulk Upload",
    credits: 175,
    amountTry: 479,
    amountUsd: 14,
    highlight: true,
  },
  {
    id: "iyz_premium",
    key: "premium",
    label: "Scale Paketi · 370 Kredi",
    credits: 370,
    amountTry: 829,
    amountUsd: 24,
  },
];

export function findIyzicoPlan(id: string): IyzicoPlan | null {
  return IYZICO_PLANS.find((p) => p.id === id) ?? null;
}

/**
 * TR dinamik fiyat hesabı — USD taban × canlı kur, sonra en yakın 1 TRY'ye yuvarla.
 * `amountTry` (floor) altına asla inmez → kur çakılsa da minimum satış fiyatı korunur.
 * `usdTryRate` geçersiz/eksikse floor değeri döner (güvenli fallback).
 */
export function computeDynamicTry(plan: IyzicoPlan, usdTryRate: number | null | undefined): number {
  if (!usdTryRate || !isFinite(usdTryRate) || usdTryRate <= 0) return plan.amountTry;
  const raw = plan.amountUsd * usdTryRate;
  const rounded = Math.round(raw);
  return Math.max(plan.amountTry, rounded);
}

export const IYZICO_SUPPORTED_CURRENCIES: readonly IyzicoCurrency[] = ["TRY", "USD", "EUR", "GBP", "NOK", "CHF"] as const;

const SUPPORTED_SET = new Set<string>(IYZICO_SUPPORTED_CURRENCIES);

// Multi-currency flag — iyzico panelinden döviz POS aktif olunca aç.
// Client: VITE_IYZICO_MULTICURRENCY, Server: IYZICO_MULTICURRENCY. Değer "1"/"true"/"on".
// Kapalıyken sadece TRY kabul edilir; diğer para birimleri USD üzerinden çekilir.
function multicurrencyEnabled(): boolean {
  const v =
    (typeof process !== "undefined" && process.env?.IYZICO_MULTICURRENCY) ||
    (typeof import.meta !== "undefined" && (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_IYZICO_MULTICURRENCY) ||
    "";
  return /^(1|true|on|yes)$/i.test(String(v));
}

export function isIyzicoCurrency(code: string): code is IyzicoCurrency {
  if (!SUPPORTED_SET.has(code)) return false;
  if (code === "TRY") return true;
  return multicurrencyEnabled();
}



export function roundMoney(amount: number, currency: string): number {
  if (!isFinite(amount) || amount <= 0) return 0;
  if (currency === "JPY" || currency === "KRW" || currency === "KZT" || currency === "UZS") {
    return Math.round(amount);
  }
  return Math.round(amount * 100) / 100;
}

export function formatMoney(amount: number, currency: string, locale = "en-US"): string {
  const maxFractionDigits = Number.isInteger(amount) ? 0 : 2;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: maxFractionDigits,
      maximumFractionDigits: maxFractionDigits,
    }).format(amount);
  } catch {
    const formatted = amount.toLocaleString(locale, { maximumFractionDigits: maxFractionDigits });
    return `${formatted} ${currency}`;
  }
}

export function computeCheckoutPricing(input: {
  plan: IyzicoPlan;
  billingCurrency: IyzicoCurrency;
  displayCurrency?: DisplayCurrency;
  ratesPerUsd?: Record<string, number> | null;
  usdTryRate?: number | null;
}) {
  const { plan, billingCurrency, displayCurrency = billingCurrency, ratesPerUsd, usdTryRate } = input;
  const usdRate = ratesPerUsd?.[billingCurrency];
  const amount = billingCurrency === "TRY"
    ? computeDynamicTry(plan, usdTryRate)
    : roundMoney(plan.amountUsd * (typeof usdRate === "number" && usdRate > 0 ? usdRate : 1), billingCurrency);

  const displayRate = ratesPerUsd?.[displayCurrency];
  const displayAmount = displayCurrency === billingCurrency
    ? amount
    : roundMoney(plan.amountUsd * (typeof displayRate === "number" && displayRate > 0 ? displayRate : 1), displayCurrency);

  return {
    amount,
    currency: billingCurrency,
    displayAmount,
    displayCurrency,
    fxRate: typeof usdRate === "number" && usdRate > 0 ? usdRate : null,
  };
}
