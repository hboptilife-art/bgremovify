import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { MessageSquareQuote, Star, X, Send, Loader2, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { listApprovedReviews, submitReview, type PublicReview } from "@/lib/reviews.functions";
import { usePreferredLanguage, type AppLang } from "@/lib/language";

type Lang = AppLang;

const T: Record<Lang, {
  open: string; title: string; subtitle: string; write: string; close: string;
  rating: string; name: string; namePh: string; message: string; messagePh: string;
  send: string; sending: string; thanks: string; failed: string; validate: string;
  approved: string; empty: string; pending: string; showAll: string; showLess: string;
}> = {
  tr: { open: "Yorumlar", title: "Müşteri Yorumları", subtitle: "Deneyimini paylaş, onay sonrası yayına alınır.", write: "Yorum yaz", close: "Kapat", rating: "Puanın", name: "Adın", namePh: "Örn. Serkan A.", message: "Yorumun", messagePh: "Beğendiğin veya geliştirilmesini istediğin şey…", send: "Gönder", sending: "Gönderiliyor…", thanks: "Teşekkürler! Yorumun onaya düştü.", failed: "Gönderilemedi, tekrar dene.", validate: "Lütfen puan, isim ve kısa bir yorum yaz.", approved: "Onaylı yorumlar", empty: "Henüz onaylı yorum yok — ilk sen ol!", pending: "Onay Bekliyor", showAll: "Tümünü gör", showLess: "Daralt" },
  en: { open: "Reviews", title: "Customer Reviews", subtitle: "Share your experience — it goes live after review.", write: "Write a review", close: "Close", rating: "Your rating", name: "Your name", namePh: "e.g. Serkan A.", message: "Your review", messagePh: "What did you love, or what could be better…", send: "Send", sending: "Sending…", thanks: "Thanks! Your review is pending approval.", failed: "Could not send, please try again.", validate: "Please add a rating, your name and a short review.", approved: "Approved reviews", empty: "No approved reviews yet — be the first!", pending: "Pending approval", showAll: "Show all", showLess: "Show less" },
  de: { open: "Bewertungen", title: "Kundenbewertungen", subtitle: "Teile deine Erfahrung — nach Prüfung sichtbar.", write: "Bewertung schreiben", close: "Schließen", rating: "Deine Bewertung", name: "Dein Name", namePh: "z.B. Serkan A.", message: "Deine Bewertung", messagePh: "Was hat dir gefallen oder was ginge besser…", send: "Senden", sending: "Senden…", thanks: "Danke! Deine Bewertung wartet auf Freigabe.", failed: "Senden fehlgeschlagen, bitte erneut versuchen.", validate: "Bitte Bewertung, Name und kurzen Text angeben.", approved: "Freigegebene Bewertungen", empty: "Noch keine freigegebenen Bewertungen — sei die/der Erste!", pending: "Wartet auf Freigabe", showAll: "Alle anzeigen", showLess: "Weniger anzeigen" },
  es: { open: "Reseñas", title: "Reseñas de clientes", subtitle: "Comparte tu experiencia — se publica tras aprobación.", write: "Escribir reseña", close: "Cerrar", rating: "Tu puntuación", name: "Tu nombre", namePh: "p. ej. Serkan A.", message: "Tu reseña", messagePh: "Qué te gustó o qué mejorarías…", send: "Enviar", sending: "Enviando…", thanks: "¡Gracias! Tu reseña está pendiente de aprobación.", failed: "No se pudo enviar, inténtalo de nuevo.", validate: "Añade puntuación, nombre y una reseña corta.", approved: "Reseñas aprobadas", empty: "Aún no hay reseñas aprobadas — ¡sé el primero!", pending: "Pendiente de aprobación", showAll: "Ver todas", showLess: "Ver menos" },
  ru: { open: "Отзывы", title: "Отзывы клиентов", subtitle: "Поделись впечатлением — опубликуем после проверки.", write: "Написать отзыв", close: "Закрыть", rating: "Оценка", name: "Твоё имя", namePh: "напр. Серкан А.", message: "Отзыв", messagePh: "Что понравилось или что улучшить…", send: "Отправить", sending: "Отправка…", thanks: "Спасибо! Отзыв отправлен на модерацию.", failed: "Не удалось отправить, попробуй ещё раз.", validate: "Укажи оценку, имя и короткий текст.", approved: "Одобренные отзывы", empty: "Пока нет одобренных отзывов — будь первым!", pending: "На модерации", showAll: "Показать все", showLess: "Свернуть" },
  ar: { open: "التقييمات", title: "تقييمات العملاء", subtitle: "شارك تجربتك — تُنشر بعد الموافقة.", write: "اكتب تقييمًا", close: "إغلاق", rating: "تقييمك", name: "اسمك", namePh: "مثال: سيركان أ.", message: "تقييمك", messagePh: "ما الذي أعجبك أو ما يمكن تحسينه…", send: "إرسال", sending: "جارٍ الإرسال…", thanks: "شكرًا! تقييمك بانتظار الموافقة.", failed: "تعذّر الإرسال، حاول مجددًا.", validate: "أضف تقييمًا واسمك ونصًا قصيرًا.", approved: "التقييمات المعتمدة", empty: "لا توجد تقييمات معتمدة بعد — كن الأول!", pending: "بانتظار الموافقة", showAll: "عرض الكل", showLess: "عرض أقل" },
};

export function StudioReviewsPanel() {
  const [open, setOpen] = useState(false);
  const lang = usePreferredLanguage("en") as Lang;
  const t = T[lang];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={t.open}
        className="fixed bottom-24 right-4 z-40 md:bottom-6 md:right-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-3.5 py-2 text-[12px] font-semibold text-slate-700 shadow-lg backdrop-blur transition hover:border-[#1d6bff]/60 hover:text-[#1d6bff]"
      >
        <MessageSquareQuote className="h-4 w-4" />
        <span className="hidden sm:inline">{t.open}</span>
      </button>
      {open && <ReviewsModal lang={lang} onClose={() => setOpen(false)} />}
    </>
  );
}

export function ReviewsModal({ lang, onClose }: { lang: Lang; onClose: () => void }) {
  const t = T[lang];
  const load = useServerFn(listApprovedReviews);
  const send = useServerFn(submitReview);

  const [items, setItems] = useState<PublicReview[] | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [rating, setRating] = useState(0);
  const [name, setName] = useState("");
  const [quote, setQuote] = useState("");
  const [sending, setSending] = useState(false);

  const reload = useCallback(async () => {
    try {
      const data = await load();
      setItems(data);
    } catch {
      setItems([]);
    }
  }, [load]);

  useEffect(() => { reload(); }, [reload]);

  const submit = async () => {
    if (sending) return;
    if (rating < 1 || name.trim().length < 2 || quote.trim().length < 5) {
      toast.error(t.validate);
      return;
    }
    setSending(true);
    try {
      await send({ data: { name: name.trim(), quote: quote.trim(), rating, lang } });
      toast.success(t.thanks);
      setRating(0); setName(""); setQuote("");
    } catch (err) {
      console.error(err);
      toast.error(t.failed);
    } finally {
      setSending(false);
    }
  };

  const visible = items ?? [];
  const shown = expanded ? visible : visible.slice(0, 3);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <button
          onClick={onClose}
          aria-label={t.close}
          className="absolute right-3 top-3 rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="border-b border-slate-100 px-6 pb-4 pt-6">
          <h3 className="text-[17px] font-semibold text-slate-900">{t.title}</h3>
          <p className="mt-0.5 text-[12.5px] text-slate-500">{t.subtitle}</p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {/* Submit form */}
          <div className="border-b border-slate-100 px-6 py-5">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{t.rating}</div>
            <div className="mb-4 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  className={`p-1 transition ${n <= rating ? "text-amber-400" : "text-slate-300 hover:text-amber-400"}`}
                  aria-label={`${n}`}
                >
                  <Star className={`h-6 w-6 ${n <= rating ? "fill-current" : ""}`} />
                </button>
              ))}
            </div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.namePh}
              maxLength={80}
              className="mb-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-[#1d6bff] focus:outline-none focus:ring-2 focus:ring-[#1d6bff]/20"
              aria-label={t.name}
            />
            <textarea
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              placeholder={t.messagePh}
              maxLength={480}
              className="min-h-[92px] w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-[#1d6bff] focus:outline-none focus:ring-2 focus:ring-[#1d6bff]/20"
              aria-label={t.message}
            />
            <button
              onClick={submit}
              disabled={sending}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#1d6bff] px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm shadow-[#1d6bff]/25 transition hover:bg-[#155ce8] disabled:opacity-60"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {sending ? t.sending : t.write}
            </button>
            <p className="mt-2 text-[11px] text-slate-400">{t.pending}</p>
          </div>

          {/* Approved list */}
          <div className="px-6 py-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                {t.approved} {items ? `(${items.length})` : ""}
              </div>
              {visible.length > 3 && (
                <button
                  onClick={() => setExpanded((x) => !x)}
                  className="inline-flex items-center gap-1 text-[12px] font-medium text-[#1d6bff] hover:underline"
                >
                  {expanded ? t.showLess : t.showAll}
                  <ChevronDown className={`h-3.5 w-3.5 transition ${expanded ? "rotate-180" : ""}`} />
                </button>
              )}
            </div>

            {items === null ? (
              <div className="flex items-center justify-center py-6 text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : visible.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-[12.5px] text-slate-400">
                {t.empty}
              </p>
            ) : (
              <ul className="space-y-3">
                {shown.map((r) => (
                  <li key={r.id} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5">
                    <div className="mb-1 flex items-center justify-between">
                      <div className="text-[13px] font-semibold text-slate-800">
                        {r.name}
                        {r.country ? <span className="ml-1.5 text-[11px] font-normal text-slate-400">· {r.country}</span> : null}
                      </div>
                      {r.rating ? (
                        <div className="flex items-center gap-0.5 text-amber-400">
                          {Array.from({ length: r.rating }).map((_, i) => (
                            <Star key={i} className="h-3 w-3 fill-current" />
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <p className="text-[12.5px] leading-relaxed text-slate-600">{r.quote}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
