import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { MessageSquare, Send, X, Star } from "lucide-react";
import { submitFeedback } from "@/lib/feedback.functions";
import { toast } from "sonner";
import { usePreferredLanguage, type AppLang } from "@/lib/language";

type Lang = AppLang;

const T = {
  tr: { btn: "Geri bildirim", btnAria: "Geri bildirim gönder", close: "Kapat", title: "Geri bildirim gönder", subtitle: "Fikir, hata veya öneri — her şey bize ulaşır.", star: (n: number) => `${n} yıldız`, placeholder: "Mesajınızı buraya yazın…", email: "E-posta (opsiyonel)", send: "Gönder", sending: "Gönderiliyor…", tooShort: "Lütfen kısa da olsa mesaj yazın.", thanks: "Teşekkürler! Geri bildiriminiz kaydedildi.", failed: "Gönderilemedi. Lütfen tekrar deneyin." },
  en: { btn: "Feedback", btnAria: "Send feedback", close: "Close", title: "Send feedback", subtitle: "Ideas, bugs or suggestions — it all reaches us.", star: (n: number) => `${n} stars`, placeholder: "Write your message here…", email: "Email (optional)", send: "Send", sending: "Sending…", tooShort: "Please write a short message.", thanks: "Thanks! Your feedback was saved.", failed: "Could not send. Please try again." },
  de: { btn: "Feedback", btnAria: "Feedback senden", close: "Schließen", title: "Feedback senden", subtitle: "Ideen, Fehler oder Vorschläge — alles erreicht uns.", star: (n: number) => `${n} Sterne`, placeholder: "Nachricht hier schreiben…", email: "E-Mail (optional)", send: "Senden", sending: "Senden…", tooShort: "Bitte schreibe eine kurze Nachricht.", thanks: "Danke! Dein Feedback wurde gespeichert.", failed: "Senden fehlgeschlagen. Bitte erneut versuchen." },
  es: { btn: "Comentarios", btnAria: "Enviar comentarios", close: "Cerrar", title: "Enviar comentarios", subtitle: "Ideas, errores o sugerencias — todo nos llega.", star: (n: number) => `${n} estrellas`, placeholder: "Escribe tu mensaje aquí…", email: "Correo (opcional)", send: "Enviar", sending: "Enviando…", tooShort: "Escribe un mensaje breve.", thanks: "¡Gracias! Tu comentario fue guardado.", failed: "No se pudo enviar. Inténtalo de nuevo." },
  ru: { btn: "Отзыв", btnAria: "Отправить отзыв", close: "Закрыть", title: "Отправить отзыв", subtitle: "Идеи, ошибки или предложения — всё дойдёт до нас.", star: (n: number) => `${n} звёзд`, placeholder: "Напишите сообщение здесь…", email: "Email (необязательно)", send: "Отправить", sending: "Отправка…", tooShort: "Напишите короткое сообщение.", thanks: "Спасибо! Ваш отзыв сохранён.", failed: "Не удалось отправить. Попробуйте ещё раз." },
  ar: { btn: "ملاحظات", btnAria: "إرسال ملاحظات", close: "إغلاق", title: "إرسال ملاحظات", subtitle: "أفكار أو أخطاء أو اقتراحات — كلها تصل إلينا.", star: (n: number) => `${n} نجوم`, placeholder: "اكتب رسالتك هنا…", email: "البريد الإلكتروني (اختياري)", send: "إرسال", sending: "جارٍ الإرسال…", tooShort: "اكتب رسالة قصيرة من فضلك.", thanks: "شكرًا! تم حفظ ملاحظاتك.", failed: "تعذّر الإرسال. حاول مرة أخرى." },
} as const;

function useLang(): Lang {
  return usePreferredLanguage("en");
}

/** Sabit köşede duran küçük geri bildirim butonu. Tıklayınca modal açılır. */
export function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const lang = useLang();
  const t = T[lang];
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-4 z-40 inline-flex items-center gap-1.5 rounded-full border bg-background/95 backdrop-blur px-3 py-2 text-xs font-medium shadow-md hover:bg-accent transition-colors"
        aria-label={t.btnAria}
      >
        <MessageSquare className="size-3.5" />
        <span className="hidden sm:inline">{t.btn}</span>
      </button>
      {open ? <FeedbackModal onClose={() => setOpen(false)} lang={lang} /> : null}
    </>
  );
}

export function FeedbackModal({ onClose, lang }: { onClose: () => void; lang: Lang }) {
  const t = T[lang];
  const submit = useServerFn(submitFeedback);
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (sending) return;
    if (message.trim().length < 3) {
      toast.error(t.tooShort);
      return;
    }
    setSending(true);
    try {
      await submit({
        data: {
          message: message.trim(),
          contact: contact.trim() || undefined,
          rating: rating ?? undefined,
          context: typeof window !== "undefined" ? window.location.pathname : undefined,
        },
      });
      toast.success(t.thanks);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(t.failed);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-background rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
          aria-label={t.close}
        >
          <X className="size-4" />
        </button>

        <div>
          <h3 className="font-semibold text-lg">{t.title}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">{t.subtitle}</p>
        </div>

        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              className={`p-1 transition-colors ${
                rating && n <= rating ? "text-amber-400" : "text-muted-foreground hover:text-amber-400"
              }`}
              aria-label={t.star(n)}
            >
              <Star className={`size-6 ${rating && n <= rating ? "fill-current" : ""}`} />
            </button>
          ))}
        </div>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t.placeholder}
          className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          maxLength={4000}
        />

        <input
          type="email"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder={t.email}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          maxLength={200}
        />

        <button
          type="button"
          onClick={send}
          disabled={sending || message.trim().length < 3}
          className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          <Send className="size-4" />
          {sending ? t.sending : t.send}
        </button>
      </div>
    </div>
  );
}
