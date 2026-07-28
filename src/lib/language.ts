import { useEffect, useState } from "react";

export type AppLang = "tr" | "en" | "es" | "de" | "ru" | "ar";

export const APP_LANG_STORAGE_KEY = "bgr-lang";
export const APP_LANG_EVENT = "bgr-language-change";
export const APP_LANGS: AppLang[] = ["tr", "en", "es", "de", "ru", "ar"];

export function isAppLang(value: unknown): value is AppLang {
  return typeof value === "string" && APP_LANGS.includes(value as AppLang);
}

export function readSearchLanguage(): AppLang | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const value = params.get("lang") ?? params.get(APP_LANG_STORAGE_KEY);
  return isAppLang(value) ? value : null;
}

export function readStoredLanguage(): AppLang | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(APP_LANG_STORAGE_KEY);
    return isAppLang(value) ? value : null;
  } catch {
    return null;
  }
}

export function readBrowserLanguage(): AppLang | null {
  if (typeof navigator === "undefined") return null;
  const value = (navigator.language || "en").slice(0, 2).toLowerCase();
  return isAppLang(value) ? value : null;
}

export function getPreferredLanguage(fallback: AppLang = "en"): AppLang {
  return readSearchLanguage() ?? readStoredLanguage() ?? readBrowserLanguage() ?? fallback;
}

export function setStoredLanguage(lang: AppLang) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(APP_LANG_STORAGE_KEY, lang);
  } catch {
    // ignore private-mode storage failures
  }
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  window.dispatchEvent(new CustomEvent(APP_LANG_EVENT, { detail: { lang } }));
}

export function usePreferredLanguage(fallback: AppLang = "en"): AppLang {
  const [lang, setLang] = useState<AppLang>(fallback);

  useEffect(() => {
    const sync = () => setLang(getPreferredLanguage(fallback));
    sync();

    const onLanguage = (event: Event) => {
      const next = (event as CustomEvent<{ lang?: unknown }>).detail?.lang;
      setLang(isAppLang(next) ? next : getPreferredLanguage(fallback));
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === APP_LANG_STORAGE_KEY) sync();
    };

    window.addEventListener(APP_LANG_EVENT, onLanguage);
    window.addEventListener("storage", onStorage);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener(APP_LANG_EVENT, onLanguage);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("popstate", sync);
    };
  }, [fallback]);

  return lang;
}