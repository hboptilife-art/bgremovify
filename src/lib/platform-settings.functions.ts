import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const DEFAULT_SETTINGS = {
  signup_credits: 0,
} as const;


export type PlatformSettingKey = keyof typeof DEFAULT_SETTINGS;

// ---- Public read via server function. RLS restricts direct SELECT to admins;
// this handler uses the service-role client and only returns the whitelisted
// keys defined in DEFAULT_SETTINGS so no other config leaks to the browser.
// POST kullanıyoruz: GET server-fn'leri sabit URL + anon olduğu için
// Cloudflare / ara CDN katmanları tarafından cachelenebiliyor ve admin
// panelinden yapılan değişiklikler canlıya geç yansıyordu. POST hiçbir
// katmanda cache'lenmez, panel kaydı anında etkili olur.
export const getPlatformSettings = createServerFn({ method: "POST" }).handler(async () => {
  const allowedKeys = Object.keys(DEFAULT_SETTINGS);
  const out: Record<string, number | string | boolean | null> = { ...DEFAULT_SETTINGS };
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("platform_settings")
      .select("key,value")
      .in("key", allowedKeys);
    for (const row of (data ?? []) as Array<{ key: string; value: number | string | boolean | null }>) {
      if (allowedKeys.includes(row.key)) out[row.key] = row.value;
    }
  } catch (err) {
    // Service role key not injected (e.g. local dev without Cloud secrets):
    // fall back to defaults instead of blanking the page.
    console.warn("[getPlatformSettings] falling back to defaults:", (err as Error).message);
  }
  return out;
});


// ---- Admin write ----
export const updatePlatformSetting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { key: string; value: number | string | boolean }) => {
    const key = String(input?.key ?? "").trim();
    if (!key || key.length > 64) throw new Error("invalid_key");
    if (input.value === undefined || input.value === null) throw new Error("invalid_value");
    // Guard rails per known keys
    if (key === "signup_credits") {
      const n = Number(input.value);
      if (!Number.isFinite(n) || n < 0 || n > 1000) throw new Error("invalid_value");
      return { key, value: Math.floor(n) as number | string | boolean };
    }

    return { key, value: input.value };
  })
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleErr } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleErr) throw new Error(roleErr.message);
    if (!isAdmin) throw new Error("forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("platform_settings")
      .upsert(
        { key: data.key, value: data.value as never, updated_by: context.userId, updated_at: new Date().toISOString() },
        { onConflict: "key" },
      );
    if (error) throw new Error(error.message);
    return { ok: true, key: data.key, value: data.value };
  });
