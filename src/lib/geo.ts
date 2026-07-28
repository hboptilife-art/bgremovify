// Lightweight geo detection for PPP pricing.
// Strategy: try IP-based lookup (more accurate, handles VPNs poorly but TR/KZ rarely VPN out),
// fall back to browser language + Intl timezone.

export type GeoRegion =
  | "TR"
  | "KZ"
  | "AZ"
  | "UZ"
  | "KG"
  | "RU"
  | "DE"
  | "AT"
  | "CH"
  | "FR"
  | "ES"
  | "IT"
  | "NL"
  | "BE"
  | "PT"
  | "IE"
  | "GR"
  | "FI"
  | "GB"
  | "US"
  | "CA"
  | "AE"
  | "SA"
  | "GLOBAL";

// Local currency hint used in the pricing UI. Rates are approximate — used
// only for displaying an *estimated* local price alongside the primary
// (USD or TRY) charge. Update roughly every quarter.
export type LocalCurrency = {
  code: string;   // ISO 4217 (EUR, GBP, KZT, ...)
  symbol: string; // €, £, ₸ ...
  perUsd: number; // 1 USD ≈ perUsd units
  perTry: number; // 1 TRY ≈ perTry units
  locale: string; // toLocaleString locale for formatting
};

const CURRENCY_BY_REGION: Record<GeoRegion, LocalCurrency> = {
  TR: { code: "TRY", symbol: "₺", perUsd: 40, perTry: 1, locale: "tr-TR" },
  KZ: { code: "KZT", symbol: "₸", perUsd: 500, perTry: 12.5, locale: "ru-RU" },
  AZ: { code: "AZN", symbol: "₼", perUsd: 1.7, perTry: 0.042, locale: "az-AZ" },
  UZ: { code: "UZS", symbol: "so'm", perUsd: 12700, perTry: 317, locale: "en-US" },
  KG: { code: "KGS", symbol: "с", perUsd: 87, perTry: 2.17, locale: "ru-RU" },
  RU: { code: "RUB", symbol: "₽", perUsd: 100, perTry: 2.5, locale: "ru-RU" },
  DE: { code: "EUR", symbol: "€", perUsd: 0.93, perTry: 0.023, locale: "de-DE" },
  AT: { code: "EUR", symbol: "€", perUsd: 0.93, perTry: 0.023, locale: "de-AT" },
  CH: { code: "CHF", symbol: "CHF", perUsd: 0.88, perTry: 0.022, locale: "de-CH" },
  FR: { code: "EUR", symbol: "€", perUsd: 0.93, perTry: 0.023, locale: "fr-FR" },
  ES: { code: "EUR", symbol: "€", perUsd: 0.93, perTry: 0.023, locale: "es-ES" },
  IT: { code: "EUR", symbol: "€", perUsd: 0.93, perTry: 0.023, locale: "it-IT" },
  NL: { code: "EUR", symbol: "€", perUsd: 0.93, perTry: 0.023, locale: "nl-NL" },
  BE: { code: "EUR", symbol: "€", perUsd: 0.93, perTry: 0.023, locale: "nl-BE" },
  PT: { code: "EUR", symbol: "€", perUsd: 0.93, perTry: 0.023, locale: "pt-PT" },
  IE: { code: "EUR", symbol: "€", perUsd: 0.93, perTry: 0.023, locale: "en-IE" },
  GR: { code: "EUR", symbol: "€", perUsd: 0.93, perTry: 0.023, locale: "el-GR" },
  FI: { code: "EUR", symbol: "€", perUsd: 0.93, perTry: 0.023, locale: "fi-FI" },
  GB: { code: "GBP", symbol: "£", perUsd: 0.78, perTry: 0.019, locale: "en-GB" },
  US: { code: "USD", symbol: "$", perUsd: 1, perTry: 0.025, locale: "en-US" },
  CA: { code: "CAD", symbol: "CA$", perUsd: 1.38, perTry: 0.034, locale: "en-CA" },
  AE: { code: "AED", symbol: "AED", perUsd: 3.67, perTry: 0.091, locale: "en-AE" },
  SA: { code: "SAR", symbol: "﷼", perUsd: 3.75, perTry: 0.094, locale: "ar-SA" },
  GLOBAL: { code: "USD", symbol: "$", perUsd: 1, perTry: 0.025, locale: "en-US" },
};

// Live FX overrides — populated by fx-rates.ts on client load.
// Keyed by ISO currency code (e.g. "EUR", "GBP").
let LIVE_PER_TRY: Record<string, number> | null = null;
let LIVE_PER_USD: Record<string, number> | null = null;

export function setLiveRates(rates: { perTry: Record<string, number>; perUsd: Record<string, number> }) {
  LIVE_PER_TRY = rates.perTry;
  LIVE_PER_USD = rates.perUsd;
}

function rateFromTry(code: string, fallback: number): number {
  if (LIVE_PER_TRY && typeof LIVE_PER_TRY[code] === "number" && LIVE_PER_TRY[code] > 0) {
    return LIVE_PER_TRY[code];
  }
  return fallback;
}

function rateFromUsd(code: string, fallback: number): number {
  if (LIVE_PER_USD && typeof LIVE_PER_USD[code] === "number" && LIVE_PER_USD[code] > 0) {
    return LIVE_PER_USD[code];
  }
  return fallback;
}

export function getLocalCurrency(region: GeoRegion): LocalCurrency {
  return CURRENCY_BY_REGION[region] ?? CURRENCY_BY_REGION.GLOBAL;
}


export function formatLocalFromTry(region: GeoRegion, amountTry: number): string {
  const c = getLocalCurrency(region);
  if (c.code === "TRY") {
    return `₺${amountTry.toLocaleString("tr-TR")}`;
  }
  const local = amountTry * rateFromTry(c.code, c.perTry);
  // Round smart: >100 → nearest 1, 10–100 → nearest 0.5, <10 → 2 decimals
  const rounded =
    local >= 100 ? Math.round(local) : local >= 10 ? Math.round(local * 2) / 2 : Math.round(local * 100) / 100;
  const formatted = rounded.toLocaleString(c.locale, {
    maximumFractionDigits: rounded >= 100 ? 0 : 2,
  });
  return c.symbol === "€" || c.symbol === "£" || c.symbol === "$" || c.symbol === "₺" || c.symbol === "₸" || c.symbol === "₽"
    ? `${c.symbol}${formatted}`
    : `${formatted} ${c.symbol}`;
}

export function formatLocalFromUsd(region: GeoRegion, amountUsd: number): string {
  const c = getLocalCurrency(region);
  if (c.code === "USD") return `$${amountUsd.toFixed(2)}`;
  const local = amountUsd * rateFromUsd(c.code, c.perUsd);
  const rounded =
    local >= 100 ? Math.round(local) : local >= 10 ? Math.round(local * 2) / 2 : Math.round(local * 100) / 100;
  const formatted = rounded.toLocaleString(c.locale, {
    maximumFractionDigits: rounded >= 100 ? 0 : 2,
  });
  return c.symbol === "€" || c.symbol === "£" || c.symbol === "$" || c.symbol === "₺" || c.symbol === "₸" || c.symbol === "₽"
    ? `${c.symbol}${formatted}`
    : `${formatted} ${c.symbol}`;
}

const CACHE_KEY = "bgr_geo_v2";
const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours — VPN/travel değişimleri hızlı yansısın

interface GeoCache {
  region: GeoRegion;
  country: string;
  ts: number;
}

function readCache(): GeoCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GeoCache;
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(c: GeoCache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(c));
  } catch {
    /* ignore */
  }
}

function regionFromCountry(country: string | undefined | null): GeoRegion {
  const c = (country ?? "").toUpperCase();
  const map: Record<string, GeoRegion> = {
    TR: "TR", KZ: "KZ", AZ: "AZ", UZ: "UZ", KG: "KG", RU: "RU",
    DE: "DE", AT: "AT", CH: "CH", FR: "FR", ES: "ES", IT: "IT",
    NL: "NL", BE: "BE", PT: "PT", IE: "IE", GR: "GR", FI: "FI",
    GB: "GB", UK: "GB", US: "US", CA: "CA", AE: "AE", SA: "SA",
  };
  return map[c] ?? "GLOBAL";
}


function fallbackFromBrowser(): { region: GeoRegion; country: string } {
  if (typeof navigator === "undefined") return { region: "GLOBAL", country: "??" };

  const langs = [navigator.language, ...(navigator.languages ?? [])]
    .filter(Boolean)
    .map((l) => l.toLowerCase());

  let tz = "";
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
  } catch {
    /* ignore */
  }

  const isTR =
    langs.some((l) => l.startsWith("tr")) ||
    tz === "Europe/Istanbul" ||
    tz === "Turkey";

  const isKZ =
    langs.some((l) => l.startsWith("kk")) ||
    /^Asia\/(Almaty|Aqtau|Aqtobe|Atyrau|Oral|Qostanay|Qyzylorda)$/.test(tz);

  const isUZ =
    langs.some((l) => l.startsWith("uz")) ||
    /^Asia\/(Tashkent|Samarkand)$/.test(tz);

  const isKG =
    langs.some((l) => l.startsWith("ky")) ||
    tz === "Asia/Bishkek";

  const isAZ =
    langs.some((l) => l.startsWith("az")) ||
    tz === "Asia/Baku";

  const isRU =
    langs.some((l) => l.startsWith("ru")) ||
    /^Europe\/(Moscow|Kaliningrad|Simferopol|Volgograd|Astrakhan|Saratov|Ulyanovsk|Kirov)$/.test(tz) ||
    /^Asia\/(Yekaterinburg|Chelyabinsk|Omsk|Novosibirsk|Barnaul|Tomsk|Novokuznetsk|Krasnoyarsk|Irkutsk|Chita|Yakutsk|Vladivostok|Magadan|Sakhalin|Srednekolymsk|Kamchatka|Anadyr)$/.test(tz);

  if (isTR) return { region: "TR", country: "TR" };
  if (isKZ) return { region: "KZ", country: "KZ" };
  if (isAZ) return { region: "AZ", country: "AZ" };
  if (isUZ) return { region: "UZ", country: "UZ" };
  if (isKG) return { region: "KG", country: "KG" };
  if (isRU) return { region: "RU", country: "RU" };
  return { region: "GLOBAL", country: "??" };
}

let inflight: Promise<GeoCache> | null = null;

export async function detectGeo(): Promise<GeoCache> {
  if (typeof window === "undefined") {
    return { region: "GLOBAL", country: "??", ts: Date.now() };
  }

  const cached = readCache();
  if (cached) return cached;

  if (inflight) return inflight;

  inflight = (async () => {
    // Try IP geolocation (free, no key, generous limits)
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 2500);
      const res = await fetch("https://ipapi.co/json/", { signal: ctrl.signal });
      clearTimeout(timer);
      if (res.ok) {
        const data = (await res.json()) as { country_code?: string };
        const country = (data.country_code ?? "??").toUpperCase();
        const out: GeoCache = {
          region: regionFromCountry(country),
          country,
          ts: Date.now(),
        };
        writeCache(out);
        return out;
      }
    } catch {
      /* fall through to browser fallback */
    }

    const fb = fallbackFromBrowser();
    const out: GeoCache = { ...fb, ts: Date.now() };
    writeCache(out);
    return out;
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

export function getCachedGeo(): GeoCache | null {
  if (typeof window === "undefined") return null;
  return readCache();
}
