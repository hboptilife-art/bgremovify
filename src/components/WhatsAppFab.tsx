import { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { usePreferredLanguage, type AppLang } from "@/lib/language";

type Lang = AppLang;

const SUPPORT_WA = "77027548461"; // Hakan — primary support line

const COPY: Record<Lang, { btn: string; title: string; sub: string; cta: string; msg: string }> = {
  tr: {
    btn: "Yardım",
    title: "WhatsApp Destek",
    sub: "Hakan birkaç dakika içinde cevap verir.",
    cta: "WhatsApp'tan yaz",
    msg: "Merhaba, bgremovify.com hakkında yardım almak istiyorum.",
  },
  en: {
    btn: "Help",
    title: "WhatsApp Support",
    sub: "Hakan typically replies within minutes.",
    cta: "Chat on WhatsApp",
    msg: "Hi, I'd like some help with bgremovify.com.",
  },
  es: {
    btn: "Ayuda",
    title: "Soporte WhatsApp",
    sub: "Hakan responde en pocos minutos.",
    cta: "Escribir por WhatsApp",
    msg: "Hola, necesito ayuda con bgremovify.com.",
  },
  de: {
    btn: "Hilfe",
    title: "WhatsApp Support",
    sub: "Hakan antwortet meist innerhalb weniger Minuten.",
    cta: "Auf WhatsApp schreiben",
    msg: "Hallo, ich brauche Hilfe mit bgremovify.com.",
  },
  ru: {
    btn: "Помощь",
    title: "Поддержка в WhatsApp",
    sub: "Хакан обычно отвечает за пару минут.",
    cta: "Написать в WhatsApp",
    msg: "Здравствуйте, мне нужна помощь по bgremovify.com.",
  },
  ar: {
    btn: "مساعدة",
    title: "دعم واتساب",
    sub: "يرد هاكان عادةً خلال دقائق.",
    cta: "تواصل عبر واتساب",
    msg: "مرحبًا، أحتاج مساعدة بخصوص bgremovify.com.",
  },
};

export function WhatsAppFab() {
  const [open, setOpen] = useState(false);
  const lang = usePreferredLanguage("en") as Lang;

  const t = COPY[lang];
  const href = `https://wa.me/${SUPPORT_WA}?text=${encodeURIComponent(t.msg)}`;
  const isRtl = lang === "ar";

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className={`fixed bottom-5 ${isRtl ? "left-5" : "right-5"} z-[60] flex flex-col items-end gap-3`}
    >
      {open && (
        <div className="w-72 rounded-2xl border bg-card shadow-2xl p-4 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <p className="font-semibold text-foreground">{t.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t.sub}</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="close"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-[#25D366] hover:bg-[#1ebe57] text-white font-medium py-2.5 text-sm transition-colors"
          >
            <MessageCircle className="size-4" />
            {t.cta}
          </a>
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={t.btn}
        className="flex items-center gap-2 rounded-full bg-[#25D366] hover:bg-[#1ebe57] text-white px-4 py-3 shadow-lg shadow-[#25D366]/30 transition-colors"
      >
        <MessageCircle className="size-5" />
        <span className="text-sm font-medium hidden sm:inline">{t.btn}</span>
      </button>
    </div>
  );
}
