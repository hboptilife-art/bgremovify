// Kullanıcının kişisel şablon kütüphanesi — Lovable Cloud'da kalıcı olarak
// saklanır. Ücretsiz kullanıcıların şablonları 5 gün sonra otomatik silinir
// (pg_cron: purge_stale_user_templates). Ödeme yapmış kullanıcılarda süresiz.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type CloudTemplate = {
  id: string;
  name: string;
  category: string;
  dataUrl: string;
  createdAt: string;
};

export const listUserTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CloudTemplate[]> => {
    const { data, error } = await context.supabase
      .from("user_templates")
      .select("id, name, category, data_url, created_at")
      .order("created_at", { ascending: false })
      .limit(60);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      dataUrl: r.data_url,
      createdAt: r.created_at,
    }));
  });

export const upsertUserTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id?: string; name: string; category: string; dataUrl: string }) => {
    if (!input?.name || !input?.category || !input?.dataUrl) throw new Error("invalid_input");
    if (input.dataUrl.length > 6_500_000) throw new Error("template_too_large"); // ~4.5MB binary
    return input;
  })
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const payload = {
      user_id: context.userId,
      name: data.name.slice(0, 80),
      category: data.category.slice(0, 40),
      data_url: data.dataUrl,
    };
    if (data.id) {
      const { data: row, error } = await context.supabase
        .from("user_templates")
        .upsert({ id: data.id, ...payload })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return { id: row.id };
    }
    const { data: row, error } = await context.supabase
      .from("user_templates")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteUserTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("invalid_input");
    return input;
  })
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { error } = await context.supabase
      .from("user_templates")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
