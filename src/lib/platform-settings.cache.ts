import { getPlatformSettings } from "@/lib/platform-settings.functions";

/**
 * Client-side memoization for platform settings.
 *
 * Admin panelindeki değişikliklerin canlıya ulaşmasını hızlı tutarken
 * her sayfa etkileşiminde gereksiz sunucu round-trip'i atmamak için
 * 15 sn TTL kullanıyoruz. `bustPlatformSettingsCache()` admin kayıt
 * sonrasında cache'i geçersiz kılar, böylece kayıtlı değer yeni oturuma
 * çıkmadan diğer sekmelerde de en fazla 15 sn içinde görünür olur.
 */
type Settings = Awaited<ReturnType<typeof getPlatformSettings>>;

const TTL_MS = 15_000;
let cached: { at: number; value: Settings } | null = null;
let inflight: Promise<Settings> | null = null;

export async function fetchPlatformSettingsCached(): Promise<Settings> {
  const now = Date.now();
  if (cached && now - cached.at < TTL_MS) return cached.value;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const value = await getPlatformSettings();
      cached = { at: Date.now(), value };
      return value;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export function bustPlatformSettingsCache() {
  cached = null;
}
