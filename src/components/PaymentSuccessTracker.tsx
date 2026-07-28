import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getIyzicoOrderStatus } from "@/lib/iyzico.functions";
import { trackConversion } from "@/lib/conversions";
import { track } from "@/lib/analytics";
import { supabase } from "@/integrations/supabase/client";

/**
 * Fires the Google Ads / Meta purchase conversion when the user lands back
 * on the site after a successful iyzico payment (`?payment=success&order=...`).
 *
 * - Only fires on VERIFIED success (server-side status = "success").
 * - Deduped per order via localStorage — refresh / share-link cannot re-fire.
 * - Cleans the URL after handling so a copy-paste of the URL is inert.
 */
export function PaymentSuccessTracker() {
  const getStatus = useServerFn(getIyzicoOrderStatus);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    const payment = url.searchParams.get("payment");
    const orderId = url.searchParams.get("order");
    const reason = url.searchParams.get("reason");

    if (!payment) return;

    // Strip the params from the visible URL immediately.
    const cleanUrl = () => {
      url.searchParams.delete("payment");
      url.searchParams.delete("order");
      url.searchParams.delete("reason");
      window.history.replaceState({}, "", url.pathname + (url.search ? url.search : "") + url.hash);
    };

    if (payment === "failed") {
      toast.error("Ödeme tamamlanamadı", {
        description: reason ? `Sebep: ${reason}` : "Lütfen tekrar deneyin.",
      });
      cleanUrl();
      return;
    }

    if (payment !== "success" || !orderId) {
      cleanUrl();
      return;
    }

    // Dedupe — never fire the same conversion twice.
    const dedupeKey = `bgr_paid_order_${orderId}`;
    if (localStorage.getItem(dedupeKey)) {
      cleanUrl();
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        // Verify server-side that the order really succeeded before firing.
        const row = await getStatus({ data: { orderId } });
        if (cancelled) return;
        if (!row || row.status !== "success") {
          cleanUrl();
          return;
        }

        localStorage.setItem(dedupeKey, "1");

        let email: string | undefined;
        try {
          const { data } = await supabase.auth.getUser();
          email = data.user?.email ?? undefined;
        } catch { /* ignore */ }

        trackConversion("Odeme_Basarili", {
          method: "iyzico",
          currency: row.currency ?? "TRY",
          value: Number(row.amount ?? row.amount_try) || undefined,
          transaction_id: row.id,
          credits: row.credits,
          plan_id: row.plan_id,
          email,
        });

        void track("PurchaseCompleted", {
          method: "iyzico",
          order_id: row.id,
          amount: row.amount ?? row.amount_try,
          currency: row.currency ?? "TRY",
          amount_try: row.amount_try,
          credits: row.credits,
        });

        toast.success(`Ödeme başarılı! ${row.credits} kredi hesabına eklendi.`, {
          duration: 7000,
        });
        window.dispatchEvent(new CustomEvent("optilife:credits-refresh"));
      } catch {
        /* silent — never break the landing page for analytics */
      } finally {
        cleanUrl();
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
