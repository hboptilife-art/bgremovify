// USD→TRY canlı kur getirici — client + server ortak.
// Sadece iyzico (TR) dinamik fiyatlaması için kullanılır. KZ/global akışına dokunmaz.
//
// Kaynak: open.er-api.com (ücretsiz, key yok). Timeout 3sn, hata halinde null döner
// → caller `computeDynamicTry` içinde floor (amountTry) değerine düşer.

const CACHE_KEY = "bgr_usdtry_v1";
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 dk — checkout sırasında tutarlı kalsın

type Cached = { rate: number; ts: number };

let memoryCache: Cached | null = null;
let inflight: Promise<number | null> | null = null;

function readLs(): Cached | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cached;
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeLs(c: Cached) {
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(CACHE_KEY, JSON.stringify(c));
  } catch { /* ignore */ }
}

export async function fetchUsdTryRate(): Promise<number | null> {
  const now = Date.now();
  if (memoryCache && now - memoryCache.ts < CACHE_TTL_MS) return memoryCache.rate;
  const ls = readLs();
  if (ls) {
    memoryCache = ls;
    return ls.rate;
  }
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 3000);
      const res = await fetch("https://open.er-api.com/v6/latest/USD", { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) return null;
      const data = (await res.json()) as { result?: string; rates?: Record<string, number> };
      if (data.result !== "success" || !data.rates) return null;
      const rate = data.rates.TRY;
      if (typeof rate !== "number" || !isFinite(rate) || rate <= 0) return null;
      const entry: Cached = { rate, ts: Date.now() };
      memoryCache = entry;
      writeLs(entry);
      return rate;
    } catch {
      return null;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}
