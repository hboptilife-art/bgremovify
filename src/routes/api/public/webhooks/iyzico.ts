// iyzico Checkout Form geri dönüşü:
// Kullanıcı ödemeyi tamamladıktan sonra iyzico bu URL'e POST yapar
// (application/x-www-form-urlencoded), body içinde `token` gelir.
// Biz de `token`'ı retrieve endpoint'ine sorup ödemeyi doğrular,
// kullanıcının kredisini yükleriz. Ardından kullanıcıyı UI'a yönlendiririz.
import { createFileRoute } from "@tanstack/react-router";

const PUBLIC_SITE_URL = "https://bgremovify.com";

export const Route = createFileRoute("/api/public/webhooks/iyzico")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const site = process.env.PUBLIC_SITE_URL || PUBLIC_SITE_URL;

        let token = "";
        let conversationIdFromForm = "";
        try {
          const formData = await request.formData();
          token = String(formData.get("token") || "");
          conversationIdFromForm = String(formData.get("conversationId") || "");
        } catch {
          // Bazı test isteklerinde body olmayabilir
        }

        if (!token) {
          return Response.redirect(`${site}/?payment=failed&reason=missing_token`, 302);
        }

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { retrieveCheckoutForm } = await import("@/lib/iyzico.server");

          const { data: order, error: orderErr } = await supabaseAdmin
            .from("iyzico_orders")
            .select("id, user_id, credits, amount_try, amount, currency, display_amount, display_currency, status, conversation_id")
            .eq("iyzico_token", token)
            .maybeSingle();

          if (orderErr) {
            console.error("[iyzico webhook] order lookup failed", orderErr);
            return Response.redirect(`${site}/?payment=failed&reason=lookup`, 302);
          }
          if (!order) {
            return Response.redirect(`${site}/?payment=failed&reason=order_not_found`, 302);
          }

          // Idempotent: aynı token için zaten kredilendirdiysek tekrar etme
          if (order.status === "success") {
            return Response.redirect(`${site}/?payment=success&order=${order.id}`, 302);
          }

          const detail = await retrieveCheckoutForm({
            conversationId: conversationIdFromForm || order.conversation_id,
            token,
          });

          const paidOk = detail.status === "success" && detail.paymentStatus === "SUCCESS";
          if (!paidOk) {
            const errMsg = detail.errorMessage || detail.paymentStatus || detail.errorCode || "declined";
            await supabaseAdmin
              .from("iyzico_orders")
              .update({ status: "failed", error_message: errMsg })
              .eq("id", order.id);
            const { logFeedback } = await import("@/lib/feedback-log.server");
            void logFeedback({
              kind: "payment",
              severity: "error",
              source: "iyzico",
              title: `Ödeme başarısız: ${errMsg.slice(0, 100)}`,
              detail: errMsg,
              user_id: order.user_id,
              metadata: { order_id: order.id, amount: order.amount, currency: order.currency, amount_try: order.amount_try },
            });
            return Response.redirect(`${site}/?payment=failed&order=${order.id}`, 302);
          }

          // Tutar doğrulaması — iyzico'nun bize bildirdiği tutar gerçek çekim tutarımızdan az olmasın.
          if (
            typeof detail.paidPrice === "number" &&
            detail.paidPrice + 0.005 < Number(order.amount)
          ) {
            await supabaseAdmin
              .from("iyzico_orders")
              .update({ status: "failed", error_message: "amount_mismatch" })
              .eq("id", order.id);
            return Response.redirect(`${site}/?payment=failed&order=${order.id}&reason=amount`, 302);
          }

          if (detail.currency && detail.currency !== order.currency) {
            await supabaseAdmin
              .from("iyzico_orders")
              .update({ status: "failed", error_message: "currency_mismatch" })
              .eq("id", order.id);
            return Response.redirect(`${site}/?payment=failed&order=${order.id}&reason=currency`, 302);
          }

          // Krediyi yükle (atomic-ish: read → write)
          const { data: creditRow } = await supabaseAdmin
            .from("user_credits")
            .select("credits")
            .eq("user_id", order.user_id)
            .maybeSingle();
          const currentCredits = creditRow?.credits ?? 0;
          if (creditRow) {
            await supabaseAdmin
              .from("user_credits")
              .update({
                credits: currentCredits + order.credits,
                updated_at: new Date().toISOString(),
              })
              .eq("user_id", order.user_id);
          } else {
            await supabaseAdmin.from("user_credits").insert({
              user_id: order.user_id,
              credits: order.credits,
            });
          }

          await supabaseAdmin
            .from("iyzico_orders")
            .update({
              status: "success",
              iyzico_payment_id: detail.paymentId,
              completed_at: new Date().toISOString(),
            })
            .eq("id", order.id);

          const { logFeedback } = await import("@/lib/feedback-log.server");
          void logFeedback({
            kind: "payment",
            severity: "success",
            source: "iyzico",
            title: `Ödeme başarılı: ${order.credits} kredi · ${order.amount} ${order.currency}`,
            user_id: order.user_id,
            metadata: { order_id: order.id, payment_id: detail.paymentId, amount: order.amount, currency: order.currency, amount_try: order.amount_try, credits: order.credits },
          });

          return Response.redirect(`${site}/?payment=success&order=${order.id}`, 302);
        } catch (err) {
          console.error("[iyzico webhook] handler error", err);
          const { logFeedback } = await import("@/lib/feedback-log.server");
          void logFeedback({
            kind: "payment",
            severity: "error",
            source: "iyzico",
            title: "iyzico webhook hata",
            detail: err instanceof Error ? err.message : String(err),
          });
          return Response.redirect(`${site}/?payment=failed&reason=server_error`, 302);
        }
      },

      // iyzico bazen callback URL'e GET ile doğrulama isteği atabilir.
      GET: async () => new Response("ok", { status: 200 }),
    },
  },
});
