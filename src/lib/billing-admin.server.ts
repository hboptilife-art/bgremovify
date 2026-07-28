import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Hardened billing-admin check for server functions.
 *
 * Do not rely only on client/UI admin state for credit decisions. This runs with
 * the service role and delegates to the DB function that checks both:
 * - public.user_roles(role = 'admin')
 * - the protected finance@bgremovify.com email fallback
 */
export async function isBillingAdminUser(userId: string): Promise<boolean> {
  if (!userId) return false;

  const { data, error } = await supabaseAdmin.rpc("is_billing_admin", {
    _user_id: userId,
  });

  if (error) {
    console.warn("[billing-admin] is_billing_admin failed", {
      userId,
      message: error.message,
    });
    return false;
  }

  return data === true;
}

export async function readUserCreditBalance(userId: string, fallback = 9999): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from("user_credits")
    .select("credits")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.warn("[billing-admin] credit read failed", {
      userId,
      message: error.message,
    });
    return fallback;
  }

  return typeof data?.credits === "number" ? data.credits : fallback;
}