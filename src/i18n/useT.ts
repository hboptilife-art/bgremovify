import { useEffect } from "react";
import tr from "./dictionaries/tr.json";
import en from "./dictionaries/en.json";
import de from "./dictionaries/de.json";
import es from "./dictionaries/es.json";
import ru from "./dictionaries/ru.json";
import ar from "./dictionaries/ar.json";
import {
  usePreferredLanguage,
  setStoredLanguage,
  readStoredLanguage,
  readSearchLanguage,
  readBrowserLanguage,
  isAppLang,
  type AppLang,
} from "@/lib/language";
import { detectGeo, getCachedGeo, type GeoRegion } from "@/lib/geo";

// Merkezi sözlükler. Yeni anahtar eklerken 6 dosyayı da güncelle.
const DICTS: Record<AppLang, Record<string, unknown>> = {
  tr,
  en,
  de,
  es,
  ru,
  ar,
};

// IP tabanlı ülke → uygulama dili eşlemesi.
// Cache'de ülke varsa ve kullanıcı henüz açıkça bir dil seçmediyse otomatik seçilir.
const REGION_TO_LANG: Partial<Record<GeoRegion, AppLang>> = {
  TR: "tr",
  DE: "de",
  AT: "de",
  CH: "de",
  ES: "es",
  RU: "ru",
  KZ: "ru",
  KG: "ru",
  UZ: "ru",
  AZ: "ru",
  AE: "ar",
  SA: "ar",
};

function lookup(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

/**
 * useT — merkezi sözlük + otomatik dil tespiti.
 * Öncelik: ?lang=... > localStorage > IP (geo cache) > browser > "en".
 * Kullanıcı bir kere manuel seçim yaptıysa (localStorage) IP override etmez.
 */
export function useT(fallback: AppLang = "en") {
  const stored = usePreferredLanguage(fallback);

  useEffect(() => {
    // Kullanıcı zaten seçmişse veya URL'de varsa dokunma.
    if (readSearchLanguage() || readStoredLanguage()) return;

    let cancelled = false;
    (async () => {
      let region: GeoRegion | undefined = getCachedGeo()?.region;
      if (!region) {
        try {
          region = (await detectGeo()).region;
        } catch {
          return;
        }
      }
      if (cancelled) return;
      const mapped = region ? REGION_TO_LANG[region] : undefined;
      const browser = readBrowserLanguage();
      const next = mapped ?? browser ?? fallback;
      if (isAppLang(next) && next !== stored && !readStoredLanguage()) {
        setStoredLanguage(next);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fallback, stored]);

  const dict = DICTS[stored] ?? DICTS.en;

  function t(path: string): string {
    const v = lookup(dict, path);
    if (typeof v === "string") return v;
    // Fallback zinciri: seçili → en → path
    const fb = lookup(DICTS.en, path);
    if (typeof fb === "string") return fb;
    return path;
  }

  return { t, lang: stored };
}
