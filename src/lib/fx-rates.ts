// Live FX rates for pricing + display conversion.
// Ödeme request'inde desteklenen para birimlerinde native çekim yapılır;
// desteklenmeyen para birimleri sadece yerel ödeme/manuel akışta gösterilir.
//
// Source: open.er-api.com (free, no key, base=USD).
// Cache: localStorage, 12 saat. Fallback: geo.ts içindeki statik kurlar.
import { setLiveRates } from "./geo";

const CACHE_KEY = "bgr_fx_rates_v2";
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

interface FxCache {
  // Rates keyed by ISO 4217. Values = units of currency per 1 USD.
  ratesPerUsd: Record<string, number>;
  ts: number;
}

const CURRENCIES = [
  "TRY", "KZT", "AZN", "UZS", "KGS", "RUB", "EUR", "GBP", "CHF",
  "CAD", "AED", "SAR",
];

function readCache(): FxCache | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FxCache;
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(c: FxCache) {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(CACHE_KEY, JSON.stringify(c));
    }
  } catch {
    /* ignore */
  }
}

function applyToGeo(ratesPerUsd: Record<string, number>) {
  const tryPerUsd = ratesPerUsd.TRY;
  if (!tryPerUsd || tryPerUsd <= 0) return;
  const perTry: Record<string, number> = {};
  const perUsd: Record<string, number> = {};
  for (const code of CURRENCIES) {
    const v = ratesPerUsd[code];
    if (typeof v === "number" && v > 0) {
      perUsd[code] = v;
      perTry[code] = v / tryPerUsd;
    }
  }
  setLiveRates({ perTry, perUsd });
}

let inflight: Promise<void> | null = null;
let ratesInflight: Promise<Record<string, number> | null> | null = null;

export async function fetchRatesPerUsd(): Promise<Record<string, number> | null> {
  const cached = typeof window !== "undefined" ? readCache() : null;
  if (cached) return cached.ratesPerUsd;

  if (ratesInflight) return ratesInflight;

  ratesInflight = (async () => {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 3000);
      const res = await fetch("https://open.er-api.com/v6/latest/USD", {
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (!res.ok) return null;
      const data = (await res.json()) as { result?: string; rates?: Record<string, number> };
      if (data.result !== "success" || !data.rates) return null;
      const ratesPerUsd: Record<string, number> = {};
      for (const code of CURRENCIES) {
        if (typeof data.rates[code] === "number") ratesPerUsd[code] = data.rates[code];
      }
      if (typeof window !== "undefined") writeCache({ ratesPerUsd, ts: Date.now() });
      applyToGeo(ratesPerUsd);
      return ratesPerUsd;
    } catch {
      return null;
    } finally {
      ratesInflight = null;
    }
  })();

  return ratesInflight;
}

/**
 * Fetch live FX rates and mutate geo.ts CURRENCY_BY_REGION rates in-place.
 * Safe to call multiple times — cached & deduped.
 */
export async function refreshLiveFxRates(): Promise<void> {
  if (typeof window === "undefined") return;

  const cached = readCache();
  if (cached) {
    applyToGeo(cached.ratesPerUsd);
    return;
  }

  if (inflight) return inflight;

  inflight = fetchRatesPerUsd().then(() => undefined).finally(() => {
    inflight = null;
  });

  return inflight;
}
