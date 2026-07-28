import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type GalleryCategory = {
  id: string;
  group_id: string;
  emoji: string;
  label: string;
  unsplash_query: string | null;
  background_prompt: string | null;
  position: number;
  refreshed_at: string | null;
};

export type GalleryItem = {
  id: string;
  category_id: string;
  source: "unsplash" | "manual";
  image_url: string;
  thumb_url: string | null;
  unsplash_id: string | null;
  photographer_name: string | null;
  photographer_url: string | null;
  position: number;
};

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

/** Public — anyone can browse the full gallery. */
export const listGallery = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const [{ data: cats, error: catErr }, { data: items, error: itemErr }] = await Promise.all([
    sb.from("gallery_categories").select("*").order("position", { ascending: true }),
    sb.from("gallery_items").select("*").order("position", { ascending: true }),
  ]);
  if (catErr) throw new Error(catErr.message);
  if (itemErr) throw new Error(itemErr.message);

  const byCat = new Map<string, GalleryItem[]>();
  for (const it of (items ?? []) as GalleryItem[]) {
    const arr = byCat.get(it.category_id) ?? [];
    arr.push(it);
    byCat.set(it.category_id, arr);
  }
  // Manual items first (admin curation wins), then unsplash by position.
  for (const arr of byCat.values()) {
    arr.sort((a, b) => {
      if (a.source !== b.source) return a.source === "manual" ? -1 : 1;
      return a.position - b.position;
    });
  }

  return {
    categories: (cats ?? []) as GalleryCategory[],
    itemsByCategory: Object.fromEntries(byCat) as Record<string, GalleryItem[]>,
  };
});

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("forbidden");
}

/**
 * Admin — fetch up to 30 photos from Unsplash for a category's query
 * and upsert them as source='unsplash'. Manual items are never touched.
 */
export const refreshGalleryCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { categoryId: string; perPage?: number }) => ({
    categoryId: String(input?.categoryId ?? "").trim(),
    perPage: Math.min(Math.max(Number(input?.perPage ?? 24), 5), 30),
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const key = process.env.UNSPLASH_ACCESS_KEY;
    if (!key) throw new Error("unsplash_key_missing");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: cat, error: catErr } = await supabaseAdmin
      .from("gallery_categories")
      .select("*")
      .eq("id", data.categoryId)
      .maybeSingle();
    if (catErr) throw new Error(catErr.message);
    if (!cat) throw new Error("category_not_found");
    if (!cat.unsplash_query) throw new Error("category_is_manual_only");

    const url = new URL("https://api.unsplash.com/search/photos");
    url.searchParams.set("query", cat.unsplash_query);
    url.searchParams.set("per_page", String(data.perPage));
    url.searchParams.set("orientation", "landscape");
    url.searchParams.set("content_filter", "high");

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Client-ID ${key}`,
        "Accept-Version": "v1",
      },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`unsplash_error_${res.status}:${body.slice(0, 120)}`);
    }
    const json = (await res.json()) as {
      results: Array<{
        id: string;
        urls: { regular: string; small: string };
        user: { name: string; links: { html: string } };
      }>;
    };

    // Wipe previous unsplash rows for this category, keep manual.
    const { error: delErr } = await supabaseAdmin
      .from("gallery_items")
      .delete()
      .eq("category_id", data.categoryId)
      .eq("source", "unsplash");
    if (delErr) throw new Error(delErr.message);

    const rows = json.results.map((r, idx) => ({
      category_id: data.categoryId,
      source: "unsplash" as const,
      image_url: `${r.urls.regular}&w=1600&q=80&auto=format&fit=crop`,
      thumb_url: `${r.urls.small}&w=400&q=70&auto=format&fit=crop`,
      unsplash_id: r.id,
      photographer_name: r.user.name,
      photographer_url: `${r.user.links.html}?utm_source=bgremovify&utm_medium=referral`,
      position: idx,
    }));

    if (rows.length > 0) {
      const { error: insErr } = await supabaseAdmin.from("gallery_items").insert(rows);
      if (insErr) throw new Error(insErr.message);
    }

    await supabaseAdmin
      .from("gallery_categories")
      .update({ refreshed_at: new Date().toISOString() })
      .eq("id", data.categoryId);

    return { ok: true, inserted: rows.length };
  });

/** Admin — add a manual image (e.g. Dubai Garden curated photos). */
export const addManualGalleryItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    categoryId: string;
    imageUrl: string;
    thumbUrl?: string;
    photographerName?: string;
    photographerUrl?: string;
    position?: number;
  }) => {
    const imageUrl = String(input?.imageUrl ?? "").trim();
    if (!/^https?:\/\//.test(imageUrl)) throw new Error("invalid_image_url");
    return {
      categoryId: String(input?.categoryId ?? "").trim(),
      imageUrl,
      thumbUrl: input?.thumbUrl ? String(input.thumbUrl).trim() : null,
      photographerName: input?.photographerName ? String(input.photographerName).slice(0, 120) : null,
      photographerUrl: input?.photographerUrl ? String(input.photographerUrl).slice(0, 300) : null,
      position: Number.isFinite(input?.position) ? Math.floor(input!.position!) : 0,
    };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("gallery_items")
      .insert({
        category_id: data.categoryId,
        source: "manual",
        image_url: data.imageUrl,
        thumb_url: data.thumbUrl,
        photographer_name: data.photographerName,
        photographer_url: data.photographerUrl,
        position: data.position,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id };
  });

/** Admin — delete a single gallery item (manual or unsplash). */
export const deleteGalleryItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => ({ id: String(input?.id ?? "").trim() }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("gallery_items").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin — bulk refresh every category that has an Unsplash query. */
export const refreshAllGalleryCategories = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const key = process.env.UNSPLASH_ACCESS_KEY;
    if (!key) throw new Error("unsplash_key_missing");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cats, error } = await supabaseAdmin
      .from("gallery_categories")
      .select("id, unsplash_query")
      .not("unsplash_query", "is", null);
    if (error) throw new Error(error.message);

    const results: Array<{ id: string; ok: boolean; inserted?: number; error?: string }> = [];
    for (const cat of cats ?? []) {
      try {
        const url = new URL("https://api.unsplash.com/search/photos");
        url.searchParams.set("query", cat.unsplash_query!);
        url.searchParams.set("per_page", "24");
        url.searchParams.set("orientation", "landscape");
        url.searchParams.set("content_filter", "high");
        const res = await fetch(url.toString(), {
          headers: { Authorization: `Client-ID ${key}`, "Accept-Version": "v1" },
        });
        if (!res.ok) {
          results.push({ id: cat.id, ok: false, error: `http_${res.status}` });
          continue;
        }
        const json = (await res.json()) as {
          results: Array<{
            id: string;
            urls: { regular: string; small: string };
            user: { name: string; links: { html: string } };
          }>;
        };
        await supabaseAdmin
          .from("gallery_items")
          .delete()
          .eq("category_id", cat.id)
          .eq("source", "unsplash");
        const rows = json.results.map((r, idx) => ({
          category_id: cat.id,
          source: "unsplash" as const,
          image_url: `${r.urls.regular}&w=1600&q=80&auto=format&fit=crop`,
          thumb_url: `${r.urls.small}&w=400&q=70&auto=format&fit=crop`,
          unsplash_id: r.id,
          photographer_name: r.user.name,
          photographer_url: `${r.user.links.html}?utm_source=bgremovify&utm_medium=referral`,
          position: idx,
        }));
        if (rows.length > 0) {
          const { error: insErr } = await supabaseAdmin.from("gallery_items").insert(rows);
          if (insErr) {
            results.push({ id: cat.id, ok: false, error: insErr.message });
            continue;
          }
        }
        await supabaseAdmin
          .from("gallery_categories")
          .update({ refreshed_at: new Date().toISOString() })
          .eq("id", cat.id);
        results.push({ id: cat.id, ok: true, inserted: rows.length });
        // Respect Unsplash demo rate limit (~50/hr); small delay between calls.
        await new Promise((r) => setTimeout(r, 250));
      } catch (e) {
        results.push({ id: cat.id, ok: false, error: (e as Error).message });
      }
    }
    return { results };
  });
