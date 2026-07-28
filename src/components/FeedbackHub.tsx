import { useState } from "react";
import { MessageSquare, MessageSquareQuote } from "lucide-react";
import { FeedbackModal } from "@/components/FeedbackWidget";
import { ReviewsModal } from "@/components/StudioReviewsPanel";
import { usePreferredLanguage, type AppLang } from "@/lib/language";

type View = null | "feedback" | "reviews";

const T: Record<AppLang, { feedback: string; reviews: string }> = {
  tr: { feedback: "Geri bildirim gönder", reviews: "Yorumlar" },
  en: { feedback: "Send feedback", reviews: "Reviews" },
  de: { feedback: "Feedback senden", reviews: "Bewertungen" },
  es: { feedback: "Enviar comentarios", reviews: "Reseñas" },
  ru: { feedback: "Отправить отзыв", reviews: "Отзывы" },
  ar: { feedback: "إرسال ملاحظات", reviews: "التقييمات" },
};

/**
 * Inline feedback & reviews entry points for the footer.
 * Two plain text buttons — no floating dropdown, no absolute layer that could
 * cover upload/download icons elsewhere on the page.
 */
export function FeedbackHub() {
  const lang = usePreferredLanguage("en");
  const t = T[lang];
  const [view, setView] = useState<View>(null);

  return (
    <>
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12.5px]">
        <button
          type="button"
          onClick={() => setView("feedback")}
          className="inline-flex items-center gap-1.5 font-medium text-slate-500 hover:text-[#1d6bff] transition-colors"
        >
          <MessageSquare className="size-3.5" />
          {t.feedback}
        </button>
        <button
          type="button"
          onClick={() => setView("reviews")}
          className="inline-flex items-center gap-1.5 font-medium text-slate-500 hover:text-amber-600 transition-colors"
        >
          <MessageSquareQuote className="size-3.5" />
          {t.reviews}
        </button>
      </div>

      {view === "feedback" && <FeedbackModal lang={lang} onClose={() => setView(null)} />}
      {view === "reviews" && <ReviewsModal lang={lang} onClose={() => setView(null)} />}
    </>
  );
}
