import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Admin-only: manually grant credits to a user by email.
 * Used when a payment is taken outside the app (e.g. WhatsApp + bank transfer / Kaspi / Papara).
 */
export const grantCreditsByEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { email: string; credits: number; note?: string }) => {
    const email = String(input?.email ?? "").trim().toLowerCase();
    const credits = Number(input?.credits);
    const note = String(input?.note ?? "").slice(0, 200);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("invalid_email");
    if (!Number.isFinite(credits) || credits <= 0 || credits > 100000) {
      throw new Error("invalid_credits");
    }
    return { email, credits: Math.floor(credits), note };
  })
  .handler(async ({ data, context }) => {
    const { supabase: userClient, userId } = context;

    // 1) Verify caller is admin (RLS-safe via has_role security-definer fn)
    const { data: isAdmin, error: roleErr } = await userClient.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (roleErr) throw new Error(roleErr.message);
    if (!isAdmin) throw new Error("forbidden");

    // 2) Service-role client for cross-user mutations (auth.users lookup + user_credits upsert)
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 3) Find user by email via Auth Admin API
    let targetUserId: string | null = null;
    let page = 1;
    const perPage = 200;
    // Walk pages until we find a match (defensive cap)
    while (page <= 20 && !targetUserId) {
      const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
      if (error) throw new Error(error.message);
      const hit = list.users.find((u) => u.email?.toLowerCase() === data.email);
      if (hit) targetUserId = hit.id;
      if (list.users.length < perPage) break;
      page += 1;
    }
    if (!targetUserId) throw new Error("user_not_found");

    // 4) Upsert credits
    const { data: existing } = await supabaseAdmin
      .from("user_credits")
      .select("credits")
      .eq("user_id", targetUserId)
      .maybeSingle();

    const newBalance = (existing?.credits ?? 0) + data.credits;

    const { error: upErr } = await supabaseAdmin
      .from("user_credits")
      .upsert({ user_id: targetUserId, credits: newBalance }, { onConflict: "user_id" });
    if (upErr) throw new Error(upErr.message);

    return {
      ok: true,
      email: data.email,
      userId: targetUserId,
      added: data.credits,
      newBalance,
    };
  });

/**
 * Admin-only: manually adjust (delta) a user's credit balance.
 * `delta` may be negative. Floor at 0.
 */
export const adjustCreditsByEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { email: string; delta: number }) => {
    const email = String(input?.email ?? "").trim().toLowerCase();
    const delta = Number(input?.delta);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("invalid_email");
    if (!Number.isFinite(delta) || delta === 0 || Math.abs(delta) > 100000) throw new Error("invalid_delta");
    return { email, delta: Math.trunc(delta) };
  })
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleErr } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleErr) throw new Error(roleErr.message);
    if (!isAdmin) throw new Error("forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let targetUserId: string | null = null;
    let page = 1;
    const perPage = 200;
    while (page <= 20 && !targetUserId) {
      const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
      if (error) throw new Error(error.message);
      const hit = list.users.find((u) => u.email?.toLowerCase() === data.email);
      if (hit) targetUserId = hit.id;
      if (list.users.length < perPage) break;
      page += 1;
    }
    if (!targetUserId) throw new Error("user_not_found");

    const { data: existing } = await supabaseAdmin
      .from("user_credits")
      .select("credits")
      .eq("user_id", targetUserId)
      .maybeSingle();

    const current = existing?.credits ?? 0;
    const newBalance = Math.max(0, current + data.delta);

    const { error: upErr } = await supabaseAdmin
      .from("user_credits")
      .upsert({ user_id: targetUserId, credits: newBalance }, { onConflict: "user_id" });
    if (upErr) throw new Error(upErr.message);

    return { ok: true, email: data.email, userId: targetUserId, delta: data.delta, newBalance };
  });

