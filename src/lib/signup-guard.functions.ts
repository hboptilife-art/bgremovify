import { createServerFn } from "@tanstack/react-start";
import { getRequestIP } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Called by the client immediately after a successful sign-up.
 * - Logs the signup IP.
 * - If the same IP already registered a previous account, zeroes out the
 *   newly granted free credits and returns { throttled: true } so the UI can
 *   nudge the user toward paid plans.
 * Idempotent per user: if already finalized, returns the previous decision.
 */
export const finalizeSignup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const rawIp = getRequestIP({ xForwardedFor: true }) ?? "";
    const ip = String(rawIp).trim().slice(0, 64) || "unknown";

    let supabaseAdmin: Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];
    try {
      ({ supabaseAdmin } = await import("@/integrations/supabase/client.server"));
      // Touch the proxy so a missing SERVICE_ROLE key surfaces here, not mid-query.
      void supabaseAdmin.auth;
    } catch (err) {
      console.warn("[finalizeSignup] admin client unavailable, skipping:", (err as Error).message);
      return { ok: true, throttled: false, alreadyFinalized: true, skipped: true };
    }


    // Idempotency: if we've already processed this user, return the stored decision.
    const { data: existingForUser } = await supabaseAdmin
      .from("signup_ips")
      .select("throttled")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (existingForUser) {
      return { ok: true, throttled: !!existingForUser.throttled, alreadyFinalized: true };
    }

    // Feature flag: IP-based signup throttle. Kept in STANDBY during growth
    // phase to avoid false positives on shared NAT/CGNAT (couples at home,
    // office coworkers). Flip SIGNUP_IP_THROTTLE_ENABLED=true to re-enable
    // instantly — no code changes needed.
    const throttleEnabled =
      String(process.env.SIGNUP_IP_THROTTLE_ENABLED ?? "").toLowerCase() === "true";

    // Skip old accounts: this fn may fire on any SIGNED_IN event; we only
    // want to run for genuinely fresh signups (< 10 minutes old).
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    const createdAtStr = authUser?.user?.created_at;
    if (createdAtStr) {
      const ageMs = Date.now() - new Date(createdAtStr).getTime();
      if (ageMs > 10 * 60 * 1000) {
        return { ok: true, throttled: false, alreadyFinalized: true };
      }
    }

    // IP duplicate check (only when flag is ON and we have a usable IP).
    let throttled = false;
    if (throttleEnabled && ip !== "unknown") {
      const { data: dup } = await supabaseAdmin
        .from("signup_ips")
        .select("id")
        .eq("ip", ip)
        .limit(1)
        .maybeSingle();
      throttled = !!dup;
    }

    // Record this signup (best-effort).
    await supabaseAdmin.from("signup_ips").insert({
      user_id: context.userId,
      ip,
      throttled,
    });

    if (throttled) {
      // Wipe the free credits the handle_new_user trigger just granted.
      await supabaseAdmin
        .from("user_credits")
        .upsert(
          { user_id: context.userId, credits: 0 },
          { onConflict: "user_id" },
        );
    }

    return { ok: true, throttled, alreadyFinalized: false };
  });
