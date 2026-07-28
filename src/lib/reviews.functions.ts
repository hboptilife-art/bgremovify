import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface PublicReview {
  id: string;
  name: string;
  role: string;
  country: string;
  countryCode: string;
  quote: string;
  rating: number | null;
}

export interface AdminReview extends PublicReview {
  status: "pending" | "approved" | "rejected";
  lang: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

async function publicClient() {
  const { createClient } = await import("@supabase/supabase-js");
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient(process.env.SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

// ---- Public: approved reviews (unauthenticated) ----
export const listApprovedReviews = createServerFn({ method: "GET" }).handler(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  const client = createClient(process.env.SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
  const { data } = await client
    .from("reviews")
    .select("id,name,role,country,country_code,quote,rating")
    .eq("status", "approved")
    .order("sort_order", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);
  return ((data ?? []) as Array<{ id: string; name: string; role: string; country: string; country_code: string; quote: string; rating: number | null }>).map(
    (r) => ({ id: r.id, name: r.name, role: r.role, country: r.country, countryCode: r.country_code, quote: r.quote, rating: r.rating ?? null }),
  ) as PublicReview[];
});

// ---- Public: submit a new review (pending) ----
export const submitReview = createServerFn({ method: "POST" })
  .inputValidator((i: { name: string; quote: string; rating: number; role?: string; country?: string; countryCode?: string; lang?: string }) => {
    const name = String(i?.name ?? "").trim().slice(0, 100);
    const quote = String(i?.quote ?? "").trim().slice(0, 500);
    const rating = Math.floor(Number(i?.rating));
    const role = String(i?.role ?? "Customer").trim().slice(0, 100) || "Customer";
    const country = String(i?.country ?? "").trim().slice(0, 60) || "—";
    const cc = String(i?.countryCode ?? "").trim().toUpperCase().slice(0, 2);
    const countryCode = /^[A-Z]{2}$/.test(cc) ? cc : "XX";
    const lang = String(i?.lang ?? "en").trim().slice(0, 8) || "en";
    if (!name || name.length < 2) throw new Error("invalid_name");
    if (!quote || quote.length < 5) throw new Error("invalid_quote");
    if (!(rating >= 1 && rating <= 5)) throw new Error("invalid_rating");
    return { name, quote, rating, role, country, countryCode, lang };
  })
  .handler(async ({ data }) => {
    const client = await publicClient();
    const { error } = await client.from("reviews").insert({
      name: data.name,
      role: data.role,
      country: data.country,
      country_code: data.countryCode,
      quote: data.quote,
      lang: data.lang,
      rating: data.rating,
      status: "pending",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---- Admin helpers ----
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertAdmin(context: any) {
  const { data: isAdmin, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!isAdmin) throw new Error("forbidden");
}

export const listReviewsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("reviews")
      .select("id,name,role,country,country_code,quote,lang,status,sort_order,rating,created_at,updated_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return ((data ?? []) as Array<{
      id: string; name: string; role: string; country: string; country_code: string;
      quote: string; lang: string; status: string; sort_order: number; rating: number | null;
      created_at: string; updated_at: string;
    }>).map((r) => ({
      id: r.id, name: r.name, role: r.role, country: r.country, countryCode: r.country_code,
      quote: r.quote, lang: r.lang, status: r.status as AdminReview["status"], sortOrder: r.sort_order,
      rating: r.rating, createdAt: r.created_at, updatedAt: r.updated_at,
    })) as AdminReview[];
  });

const reviewInput = (i: { name: string; role: string; country: string; countryCode: string; quote: string; lang?: string; sortOrder?: number }) => {
  const name = String(i.name ?? "").trim().slice(0, 100);
  const role = String(i.role ?? "").trim().slice(0, 100);
  const country = String(i.country ?? "").trim().slice(0, 60);
  const countryCode = String(i.countryCode ?? "").trim().toUpperCase().slice(0, 2);
  const quote = String(i.quote ?? "").trim().slice(0, 500);
  const lang = String(i.lang ?? "en").trim().slice(0, 8);
  const sortOrder = Number.isFinite(i.sortOrder) ? Math.floor(Number(i.sortOrder)) : 0;
  if (!name || !role || !country || !/^[A-Z]{2}$/.test(countryCode) || !quote) throw new Error("invalid_review");
  return { name, role, country, countryCode, quote, lang, sortOrder };
};

export const createReviewAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(reviewInput)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("reviews").insert({
      name: data.name, role: data.role, country: data.country, country_code: data.countryCode,
      quote: data.quote, lang: data.lang, sort_order: data.sortOrder, status: "approved",
      approved_at: new Date().toISOString(), approved_by: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateReviewAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string; name: string; role: string; country: string; countryCode: string; quote: string; lang?: string; sortOrder?: number }) => {
    const id = String(i.id ?? "").trim();
    if (!id) throw new Error("invalid_id");
    return { id, ...reviewInput(i) };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("reviews").update({
      name: data.name, role: data.role, country: data.country, country_code: data.countryCode,
      quote: data.quote, lang: data.lang, sort_order: data.sortOrder,
    }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setReviewStatusAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string; status: "pending" | "approved" | "rejected" }) => {
    if (!i.id || !["pending", "approved", "rejected"].includes(i.status)) throw new Error("invalid_input");
    return { id: String(i.id), status: i.status };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: { status: string; approved_at?: string; approved_by?: string } = { status: data.status };
    if (data.status === "approved") {
      patch.approved_at = new Date().toISOString();
      patch.approved_by = context.userId;
    }
    const { error } = await supabaseAdmin.from("reviews").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteReviewAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => {
    if (!i?.id) throw new Error("invalid_id");
    return { id: String(i.id) };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("reviews").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
