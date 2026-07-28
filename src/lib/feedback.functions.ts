import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Public: kullanıcı geri bildirim gönderir. Auth şart — spam'i azaltır ve
// user_id/email otomatik eklenebilir. Auth yoksa client "user_email" ile
// göndersin, insert admin client üzerinden yapılır.
export const submitFeedback = createServerFn({ method: "POST" })
  .inputValidator((input: {
    message: string;
    contact?: string;
    rating?: number;
    context?: string;
  }) => {
    const message = String(input?.message ?? "").trim();
    if (message.length < 3) throw new Error("message_too_short");
    if (message.length > 4000) throw new Error("message_too_long");
    const contact = String(input?.contact ?? "").trim().slice(0, 200) || null;
    const rating = Number.isFinite(input?.rating) ? Math.max(1, Math.min(5, Number(input?.rating))) : null;
    const context = String(input?.context ?? "").trim().slice(0, 200) || null;
    return { message, contact, rating, context };
  })
  .handler(async ({ data }) => {
    const { logFeedback } = await import("./feedback-log.server");
    // Try to read logged-in user (best-effort; not required)
    let userId: string | null = null;
    let userEmail: string | null = data.contact;
    try {
      const { getRequestHeader } = await import("@tanstack/react-start/server");
      const auth = getRequestHeader("authorization");
      if (auth?.toLowerCase().startsWith("bearer ")) {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: u } = await supabaseAdmin.auth.getUser(auth.slice(7));
        if (u?.user) {
          userId = u.user.id;
          userEmail = userEmail ?? (u.user.email ?? null);
        }
      }
    } catch { /* ignore */ }

    await logFeedback({
      kind: "user_feedback",
      severity: data.rating && data.rating <= 2 ? "warning" : "info",
      source: data.context ?? "site",
      title: data.message.slice(0, 140),
      detail: data.message,
      user_id: userId,
      user_email: userEmail,
      metadata: { rating: data.rating, contact: data.contact ?? null },
    });
    return { ok: true };
  });

// Public: client-side error reporter (React error boundary + window error).
// Dedup should happen on the client; server just persists.
export const reportClientIssue = createServerFn({ method: "POST" })
  .inputValidator((input: {
    title: string;
    detail?: string;
    route?: string;
    signature?: string;
  }) => {
    const title = String(input?.title ?? "client_error").trim().slice(0, 300);
    const detail = String(input?.detail ?? "").slice(0, 4000);
    const route = String(input?.route ?? "").slice(0, 200);
    const signature = String(input?.signature ?? "").slice(0, 200);
    return { title, detail, route, signature };
  })
  .handler(async ({ data }) => {
    const { logFeedback } = await import("./feedback-log.server");
    await logFeedback({
      kind: "system_error",
      severity: "error",
      source: data.route || "client",
      title: data.title,
      detail: data.detail,
      metadata: { signature: data.signature, route: data.route },
    });
    return { ok: true };
  });

// --- Admin-only endpoints -------------------------------------------------

async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Error("forbidden");
}

export const getFeedbackSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [payments, aiErrors, feedback, sysErrors] = await Promise.all([
      supabaseAdmin
        .from("feedback_events")
        .select("severity", { count: "exact", head: false })
        .eq("kind", "payment")
        .gte("created_at", since24h),
      supabaseAdmin
        .from("feedback_events")
        .select("id", { count: "exact", head: true })
        .eq("kind", "ai_error")
        .eq("status", "open"),
      supabaseAdmin
        .from("feedback_events")
        .select("id", { count: "exact", head: true })
        .eq("kind", "user_feedback")
        .eq("status", "open"),
      supabaseAdmin
        .from("feedback_events")
        .select("id", { count: "exact", head: true })
        .eq("kind", "system_error")
        .gte("created_at", since24h),
    ]);

    const paymentsRows = (payments.data ?? []) as { severity: string }[];
    const paymentsSuccess = paymentsRows.filter((r) => r.severity === "success").length;
    const paymentsFailed = paymentsRows.filter((r) => r.severity === "error").length;

    return {
      paymentsSuccess,
      paymentsFailed,
      openAiErrors: aiErrors.count ?? 0,
      openFeedback: feedback.count ?? 0,
      sysErrors24h: sysErrors.count ?? 0,
    };
  });

export const listFeedbackEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    kind?: string;
    status?: string;
    limit?: number;
  }) => ({
    kind: ["payment", "ai_error", "user_feedback", "system_error"].includes(String(input?.kind))
      ? String(input?.kind)
      : null,
    status: ["open", "resolved", "archived"].includes(String(input?.status))
      ? String(input?.status)
      : null,
    limit: Math.min(Math.max(Number(input?.limit) || 100, 10), 500),
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("feedback_events")
      .select("id, kind, severity, status, source, title, detail, user_email, metadata, created_at, resolved_at, archived_at")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.kind) q = q.eq("kind", data.kind);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const resolveFeedbackEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; note?: string }) => {
    const id = String(input?.id ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("invalid_id");
    return { id, note: String(input?.note ?? "").slice(0, 500) || null };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("feedback_events")
      .update({
        status: "resolved",
        resolved_at: new Date().toISOString(),
        detail: data.note ? `[resolved by admin] ${data.note}` : undefined,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteFeedbackEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    const id = String(input?.id ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("invalid_id");
    return { id };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("feedback_events").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const runFeedbackArchiveNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("archive_stale_feedback_events");
    if (error) throw new Error(error.message);
    return { archived: Number(data) || 0 };
  });
