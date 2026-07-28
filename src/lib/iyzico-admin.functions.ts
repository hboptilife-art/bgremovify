// Admin-only iyzico işlemleri: liste + pending sipariş doğrulama/kredilendirme.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: ok } = await supabaseAdmin.rpc("is_billing_admin", { _user_id: userId });
  if (!ok) throw new Error("forbidden");
  return supabaseAdmin;
}

export type IyzicoAdminOrder = {
  id: string;
  status: string;
  plan_id: string;
  credits: number;
  amount_try: number;
  amount: number;
  currency: string;
  display_amount: number;
  display_currency: string;
  user_id: string;
  user_email: string | null;
  iyzico_payment_id: string | null;
  conversation_id: string;
  created_at: string;
  completed_at: string | null;
  error_message: string | null;
};

export const listIyzicoOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await assertAdmin(context.userId);

    const { data: orders, error } = await admin
      .from("iyzico_orders")
      .select("id, status, plan_id, credits, amount_try, amount, currency, display_amount, display_currency, user_id, iyzico_payment_id, conversation_id, created_at, completed_at, error_message")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);

    const userIds = Array.from(new Set((orders ?? []).map((o) => o.user_id)));
    const emailMap = new Map<string, string>();
    for (const uid of userIds) {
      try {
        const { data: u } = await admin.auth.admin.getUserById(uid);
        if (u?.user?.email) emailMap.set(uid, u.user.email);
      } catch { /* skip */ }
    }

    const rows: IyzicoAdminOrder[] = (orders ?? []).map((o) => ({
      id: o.id,
      status: o.status,
      plan_id: o.plan_id,
      credits: o.credits,
      amount_try: Number(o.amount_try),
      amount: Number(o.amount),
      currency: o.currency,
      display_amount: Number(o.display_amount),
      display_currency: o.display_currency,
      user_id: o.user_id,
      user_email: emailMap.get(o.user_id) ?? null,
      iyzico_payment_id: o.iyzico_payment_id ?? null,
      conversation_id: o.conversation_id,
      created_at: o.created_at,
      completed_at: o.completed_at ?? null,
      error_message: o.error_message ?? null,
    }));

    const successRows = rows.filter((r) => r.status === "success");
    const summary = {
      total: rows.length,
      pending: rows.filter((r) => r.status === "pending").length,
      success: successRows.length,
      failed: rows.filter((r) => r.status === "failed").length,
      revenueByCurrency: successRows.reduce<Record<string, number>>((acc, r) => {
        acc[r.currency] = (acc[r.currency] ?? 0) + r.amount;
        return acc;
      }, {}),
    };

    return { rows, summary };
  });

/**
 * Pending bir siparişi iyzico API'sına sorup ödeme başarılıysa krediyi yükler.
 * Idempotent — success olan siparişte tekrar krediyi yüklemez.
 */
export const reconcileIyzicoOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { orderId: string }) => {
    const id = String(input?.orderId ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("invalid_id");
    return { orderId: id };
  })
  .handler(async ({ data, context }) => {
    const admin = await assertAdmin(context.userId);
    const { retrieveCheckoutForm } = await import("@/lib/iyzico.server");

    const { data: order, error } = await admin
      .from("iyzico_orders")
      .select("id, user_id, credits, amount_try, amount, currency, status, conversation_id, iyzico_token")
      .eq("id", data.orderId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) throw new Error("order_not_found");

    if (order.status === "success") {
      return { ok: true, alreadyCredited: true, message: "Zaten başarılı — tekrar kredi verilmedi." };
    }
    if (!order.iyzico_token) {
      return { ok: false, message: "Token yok — iyzico'da işlem başlatılmamış." };
    }

    const detail = await retrieveCheckoutForm({
      conversationId: order.conversation_id,
      token: order.iyzico_token,
    });

    const paidOk = detail.status === "success" && detail.paymentStatus === "SUCCESS";
    if (!paidOk) {
      const errMsg = detail.errorMessage || detail.paymentStatus || detail.errorCode || "not_paid";
      await admin
        .from("iyzico_orders")
        .update({ status: "failed", error_message: errMsg })
        .eq("id", order.id);
      return { ok: false, message: `iyzico durumu: ${errMsg}` };
    }

    if (
      typeof detail.paidPrice === "number" &&
      detail.paidPrice + 0.005 < Number(order.amount)
    ) {
      await admin
        .from("iyzico_orders")
        .update({ status: "failed", error_message: "amount_mismatch" })
        .eq("id", order.id);
      return { ok: false, message: "Ödenen tutar sipariş tutarından düşük." };
    }

    if (detail.currency && detail.currency !== order.currency) {
      await admin
        .from("iyzico_orders")
        .update({ status: "failed", error_message: "currency_mismatch" })
        .eq("id", order.id);
      return { ok: false, message: "Para birimi uyuşmuyor." };
    }

    // Krediyi yükle
    const { data: creditRow } = await admin
      .from("user_credits")
      .select("credits")
      .eq("user_id", order.user_id)
      .maybeSingle();
    const currentCredits = creditRow?.credits ?? 0;
    if (creditRow) {
      await admin
        .from("user_credits")
        .update({
          credits: currentCredits + order.credits,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", order.user_id);
    } else {
      await admin.from("user_credits").insert({
        user_id: order.user_id,
        credits: order.credits,
      });
    }

    await admin
      .from("iyzico_orders")
      .update({
        status: "success",
        iyzico_payment_id: detail.paymentId,
        completed_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    return {
      ok: true,
      alreadyCredited: false,
      credited: order.credits,
      paymentId: detail.paymentId,
      message: `${order.credits} kredi yüklendi (Ödeme ID: ${detail.paymentId}).`,
    };
  });

/** Admin-only: iyzico siparişini kalıcı olarak siler (hard delete). */
export const deleteIyzicoOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { orderId: string }) => {
    const id = String(input?.orderId ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("invalid_id");
    return { orderId: id };
  })
  .handler(async ({ data, context }) => {
    const admin = await assertAdmin(context.userId);
    const { error } = await admin.from("iyzico_orders").delete().eq("id", data.orderId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

