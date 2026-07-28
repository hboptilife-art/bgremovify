import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { finalizeSignup } from "@/lib/signup-guard.functions";

/**
 * Listens for SIGNED_IN events and calls finalizeSignup once per session.
 * The server function is idempotent per user and skips accounts older than
 * 10 minutes, so it's safe to fire on every sign-in event.
 * If the same IP was already used to grab free credits, the server zeros
 * out the new account's balance and returns { throttled: true } — we then
 * inform the user and nudge them toward paid plans.
 */
export function SignupFinalizer() {
  const finalize = useServerFn(finalizeSignup);
  const handled = useRef<Set<string>>(new Set());

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" || !session?.user) return;
      const uid = session.user.id;
      if (handled.current.has(uid)) return;
      handled.current.add(uid);

      // Fire and forget; server handles idempotency + age gating.
      void finalize()
        .then((res) => {
          if (res?.throttled && !res?.alreadyFinalized) {
            const lang = (typeof document !== "undefined" && document.documentElement.lang) || "en";
            const msg = throttleCopy(lang);
            toast.warning(msg.title, { description: msg.body, duration: 9000 });
            // Small hint the pricing page / homepage can also pick up.
            try {
              localStorage.setItem("bg_signup_throttled", "1");
            } catch {}
          }
        })
        .catch((err) => {
          console.warn("[signup-finalize] failed", err);
        });
    });
    return () => sub.subscription.unsubscribe();
  }, [finalize]);

  return null;
}

function throttleCopy(lang: string): { title: string; body: string } {
  const l = lang.toLowerCase().slice(0, 2);
  switch (l) {
    case "tr":
      return {
        title: "Bu ağ üzerinden deneme kotası kullanıldı",
        body: "Aynı bağlantıdan daha önce ücretsiz kredi alınmış. VIP Fast Lane ile hemen devam edebilirsin.",
      };
    case "ru":
      return {
        title: "Бесплатная квота с этой сети уже использована",
        body: "С этого соединения уже были получены бесплатные кредиты. Продолжите с VIP Fast Lane.",
      };
    case "de":
      return {
        title: "Testkontingent für dieses Netzwerk aufgebraucht",
        body: "Über diese Verbindung wurden bereits Gratis-Credits genutzt. Weiter mit VIP Fast Lane.",
      };
    case "es":
      return {
        title: "Cuota de prueba de esta red ya utilizada",
        body: "Ya se han usado créditos gratuitos desde esta conexión. Continúa con VIP Fast Lane.",
      };
    case "ar":
      return {
        title: "تم استخدام حصة التجربة من هذه الشبكة",
        body: "تم الحصول على أرصدة مجانية من هذا الاتصال مسبقًا. تابع مع VIP Fast Lane.",
      };
    default:
      return {
        title: "Free-trial quota already used on this network",
        body: "Free credits were already claimed from this connection. Continue instantly with VIP Fast Lane.",
      };
  }
}
