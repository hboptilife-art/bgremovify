import { Globe, Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  APP_LANGS,
  setStoredLanguage,
  usePreferredLanguage,
  type AppLang,
} from "@/lib/language";

/**
 * Minimal, flagless language selector.
 * - Small globe icon + short code (TR / EN / DE …)
 * - Dropdown lists the 6 currently supported app languages.
 * - IP-based auto-detection and the wider 18-language legal layer stay untouched
 *   behind the scenes; this is a UI surface only.
 */

const LABELS: Record<AppLang, { code: string; native: string }> = {
  tr: { code: "TR", native: "Türkçe" },
  en: { code: "EN", native: "English" },
  de: { code: "DE", native: "Deutsch" },
  es: { code: "ES", native: "Español" },
  ru: { code: "RU", native: "Русский" },
  ar: { code: "AR", native: "العربية" },
};

export function LanguageSelector({
  variant = "light",
}: {
  variant?: "light" | "dark";
}) {
  const current = usePreferredLanguage("en");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  const dark = variant === "dark";
  const border = dark ? "border-white/15" : "border-slate-200";
  const bg = dark ? "bg-white/5 hover:bg-white/10" : "bg-white hover:bg-slate-50";
  const text = dark ? "text-white" : "text-slate-700";

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Select language"
        className={`inline-flex items-center gap-1.5 rounded-full border ${border} ${bg} px-2.5 py-1.5 text-[12px] font-semibold tracking-wide ${text} transition`}
      >
        <Globe className="h-3.5 w-3.5 opacity-70" />
        <span>{LABELS[current].code}</span>
      </button>
      {open && (
        <div
          className={`absolute right-0 top-11 z-50 w-44 overflow-hidden rounded-xl border shadow-xl ${
            dark
              ? "border-white/10 bg-slate-900 text-white"
              : "border-slate-200 bg-white text-slate-800"
          }`}
        >
          {APP_LANGS.map((lang) => {
            const active = lang === current;
            return (
              <button
                key={lang}
                type="button"
                onClick={() => {
                  setStoredLanguage(lang);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[13px] ${
                  dark ? "hover:bg-white/5" : "hover:bg-slate-50"
                } ${active ? (dark ? "bg-white/5" : "bg-slate-50") : ""}`}
              >
                <span className="flex items-center gap-2">
                  <span
                    className={`inline-flex h-5 w-8 items-center justify-center rounded-md text-[10.5px] font-bold tracking-wide ${
                      active
                        ? "bg-[#1d6bff] text-white"
                        : dark
                          ? "bg-white/10 text-white/80"
                          : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {LABELS[lang].code}
                  </span>
                  <span className="font-medium">{LABELS[lang].native}</span>
                </span>
                {active && <Check className="h-3.5 w-3.5 text-[#1d6bff]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
