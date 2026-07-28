import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/use-admin";
import { useCredits } from "@/hooks/use-credits";
import { useAdminSandbox } from "@/hooks/use-admin-sandbox";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldCheck, ArrowLeft, TrendingUp, Users, MousePointerClick, DollarSign, Gift, CheckCircle2, Coins, FlaskConical, Zap, Activity } from "lucide-react";
import { FeedbackPanel } from "@/components/admin/FeedbackPanel";
import { toast } from "sonner";
import { grantCreditsByEmail } from "@/lib/admin-credits.functions";
import { listIyzicoOrders, reconcileIyzicoOrder, deleteIyzicoOrder, type IyzicoAdminOrder } from "@/lib/iyzico-admin.functions";
import {
  listGallery,
  refreshGalleryCategory,
  refreshAllGalleryCategories,
  addManualGalleryItem,
  deleteGalleryItem,
  type GalleryCategory,
  type GalleryItem,
} from "@/lib/gallery.functions";
import { Image as ImageIcon, RefreshCw, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});


type Range = "24h" | "7d" | "30d";

interface EventRow {
  event_name: string;
  utm_source: string | null;
  utm_campaign: string | null;
  utm_medium: string | null;
  country: string | null;
  user_id: string | null;
  session_id: string;
  created_at: string;
}

const RANGE_MS: Record<Range, number> = {
  "24h": 1000 * 60 * 60 * 24,
  "7d": 1000 * 60 * 60 * 24 * 7,
  "30d": 1000 * 60 * 60 * 24 * 30,
};

function AdminPage() {
  const navigate = useNavigate();
  const { isAdmin, loading, user } = useAdmin();
  const [range, setRange] = useState<Range>("7d");
  const [rows, setRows] = useState<EventRow[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth", search: { redirect: "/admin" } as never });
      return;
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    setDataLoading(true);
    const since = new Date(Date.now() - RANGE_MS[range]).toISOString();
    (async () => {
      const { data, error } = await supabase
        .from("analytics_events")
        .select("event_name,utm_source,utm_campaign,utm_medium,country,user_id,session_id,created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(5000);
      if (cancelled) return;
      if (!error && data) setRows(data as EventRow[]);
      setDataLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, range]);

  const stats = useMemo(() => {
    const sessions = new Set(rows.map((r) => r.session_id));
    const users = new Set(rows.filter((r) => r.user_id).map((r) => r.user_id));
    const eventCounts: Record<string, number> = {};
    const sourceCounts: Record<string, number> = {};
    const countryCounts: Record<string, number> = {};
    const campaignCounts: Record<string, { clicks: number; signups: number; purchases: number }> = {};

    for (const r of rows) {
      eventCounts[r.event_name] = (eventCounts[r.event_name] ?? 0) + 1;
      const src = r.utm_source ?? (r.country ? "(direct/organic)" : "(unknown)");
      sourceCounts[src] = (sourceCounts[src] ?? 0) + 1;
      if (r.country) countryCounts[r.country] = (countryCounts[r.country] ?? 0) + 1;

      const camp = r.utm_campaign ?? "(none)";
      if (!campaignCounts[camp]) campaignCounts[camp] = { clicks: 0, signups: 0, purchases: 0 };
      campaignCounts[camp].clicks += 1;
      if (r.event_name === "signup") campaignCounts[camp].signups += 1;
      if (r.event_name === "purchase" || r.event_name === "Odeme_Basarili") campaignCounts[camp].purchases += 1;
    }

    const funnel = {
      visit: sessions.size,
      upload: eventCounts["ImageUploadStarted"] ?? 0,
      processed:
        (eventCounts["ImageProcessedPro"] ?? 0) +
        (eventCounts["ImageProcessedAnonymous"] ?? 0) +
        (eventCounts["BulkProcessCompleted"] ?? 0) +
        (eventCounts["SampleProcessedInstant"] ?? 0),
      bg_applied: eventCounts["StudioBgApplied"] ?? 0,
      downloaded:
        (eventCounts["ImageDownloaded"] ?? 0) +
        (eventCounts["CompositeDownloaded"] ?? 0),
      pro_click: (eventCounts["click_pro"] ?? 0) + (eventCounts["PaywallOpened"] ?? 0),
      checkout_started: eventCounts["CheckoutStarted"] ?? 0,
      provider_fallback: eventCounts["ReplicateProviderFallback"] ?? 0,
      purchase: (eventCounts["purchase"] ?? 0) + (eventCounts["Odeme_Basarili"] ?? 0),
    };

    return {
      totalEvents: rows.length,
      sessions: sessions.size,
      users: users.size,
      funnel,
      topSources: Object.entries(sourceCounts).sort((a, b) => b[1] - a[1]).slice(0, 10),
      topCountries: Object.entries(countryCounts).sort((a, b) => b[1] - a[1]).slice(0, 10),
      topCampaigns: Object.entries(campaignCounts)
        .sort((a, b) => b[1].clicks - a[1].clicks)
        .slice(0, 10),
    };
  }, [rows]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-md w-full p-8 text-center">
          <ShieldCheck className="size-12 mx-auto text-muted-foreground mb-3" />
          <h1 className="text-xl font-semibold">Access Denied</h1>
          <p className="text-sm text-muted-foreground mt-2">
            This page is for administrators only.
          </p>
          <Button asChild className="mt-6" variant="outline">
            <Link to="/">← Go home</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <Button asChild size="sm" variant="ghost">
              <Link to="/"><ArrowLeft className="size-4 mr-1" /> Home</Link>
            </Button>
            <div className="flex items-center gap-2 min-w-0">
              <ShieldCheck className="size-5 text-primary shrink-0" />
              <h1 className="font-semibold tracking-tight truncate">Admin Panel</h1>
              <Badge variant="secondary" className="hidden sm:inline-flex">{user?.email}</Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SandboxToggle />
            <AdminCreditBadge userId={user?.id} />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="flex flex-wrap gap-1 max-w-full">
            <TabsTrigger value="overview"><TrendingUp className="size-3.5 mr-1.5" />Overview</TabsTrigger>
            <TabsTrigger value="payments"><DollarSign className="size-3.5 mr-1.5" />Ödemeler</TabsTrigger>
            <TabsTrigger value="status"><Activity className="size-3.5 mr-1.5" />Durum</TabsTrigger>
            <TabsTrigger value="credits"><Gift className="size-3.5 mr-1.5" />Credits</TabsTrigger>
            <TabsTrigger value="reviews"><CheckCircle2 className="size-3.5 mr-1.5" />Yorumlar</TabsTrigger>
            <TabsTrigger value="settings"><Zap className="size-3.5 mr-1.5" />Ayarlar</TabsTrigger>
            <TabsTrigger value="gallery"><ImageIcon className="size-3.5 mr-1.5" />Gallery</TabsTrigger>
            <TabsTrigger value="campaigns"><MousePointerClick className="size-3.5 mr-1.5" />Campaigns</TabsTrigger>
          </TabsList>

          {dataLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <TabsContent value="overview" className="space-y-6">
                <div className="inline-flex rounded-full border bg-card p-1">
                  {(["24h", "7d", "30d"] as Range[]).map((r) => (
                    <button
                      key={r}
                      onClick={() => setRange(r)}
                      className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                        range === r ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <KpiCard icon={<TrendingUp className="size-4" />} label="Events" value={stats.totalEvents} />
                  <KpiCard icon={<Users className="size-4" />} label="Sessions" value={stats.sessions} />
                  <KpiCard icon={<Users className="size-4" />} label="Signed-in users" value={stats.users} />
                  <KpiCard icon={<DollarSign className="size-4" />} label="Purchases" value={stats.funnel.purchase} />
                </div>

                <Card className="p-6">
                  <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
                    <MousePointerClick className="size-4" /> Funnel
                  </h2>
                  <div className="space-y-2">
                    <FunnelRow label="🌐 Visit (session)" value={stats.funnel.visit} max={stats.funnel.visit} />
                    <FunnelRow label="📤 Upload started" value={stats.funnel.upload} max={stats.funnel.visit} />
                    <FunnelRow label="✨ Processed (BG removed)" value={stats.funnel.processed} max={stats.funnel.visit} />
                    <FunnelRow label="🎨 BG applied (Studio)" value={stats.funnel.bg_applied} max={stats.funnel.visit} />
                    <FunnelRow label="⬇️ Downloaded" value={stats.funnel.downloaded} max={stats.funnel.visit} />
                    <FunnelRow label="💎 Pro / Paywall opened" value={stats.funnel.pro_click} max={stats.funnel.visit} />
                    <FunnelRow label="🛒 Checkout started (WA)" value={stats.funnel.checkout_started} max={stats.funnel.visit} />
                    <FunnelRow label="💰 Purchase" value={stats.funnel.purchase} max={stats.funnel.visit} highlight />
                    {stats.funnel.provider_fallback > 0 && (
                      <FunnelRow label="⚠️ Provider fallback (HD motor)" value={stats.funnel.provider_fallback} max={stats.funnel.visit} />
                    )}
                  </div>
                </Card>

                <div className="grid md:grid-cols-2 gap-4">
                  <Card className="p-6">
                    <h2 className="text-sm font-semibold mb-4">Top UTM Sources</h2>
                    <BreakdownTable rows={stats.topSources} />
                  </Card>
                  <Card className="p-6">
                    <h2 className="text-sm font-semibold mb-4">Top Countries</h2>
                    <BreakdownTable rows={stats.topCountries} />
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="payments">
                <IyzicoOrdersCard />
              </TabsContent>

              <TabsContent value="status">
                <FeedbackPanel />
              </TabsContent>


              <TabsContent value="credits" className="space-y-4">
                <ManualGrantCard />
                <ManualAdjustCard />
              </TabsContent>

              <TabsContent value="reviews">
                <ReviewsManagerCard />
              </TabsContent>

              <TabsContent value="settings">
                <PlatformSettingsCard />
              </TabsContent>

              <TabsContent value="gallery">
                <GalleryManagerCard />
              </TabsContent>

              <TabsContent value="campaigns">
                <Card className="p-6">
                  <h2 className="text-sm font-semibold mb-4">Campaign Performance ({range})</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-muted-foreground border-b">
                          <th className="py-2 pr-4">Campaign</th>
                          <th className="py-2 pr-4 text-right">Events</th>
                          <th className="py-2 pr-4 text-right">Signups</th>
                          <th className="py-2 text-right">Purchases</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.topCampaigns.map(([name, c]) => (
                          <tr key={name} className="border-b last:border-0">
                            <td className="py-2 pr-4 font-mono text-xs truncate max-w-[200px]">{name}</td>
                            <td className="py-2 pr-4 text-right">{c.clicks}</td>
                            <td className="py-2 pr-4 text-right">{c.signups}</td>
                            <td className="py-2 text-right font-semibold text-primary">{c.purchases}</td>
                          </tr>
                        ))}
                        {stats.topCampaigns.length === 0 && (
                          <tr><td colSpan={4} className="py-6 text-center text-muted-foreground text-xs">No campaign data yet</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </TabsContent>
            </>
          )}
        </Tabs>
      </main>
    </div>
  );
}

function SandboxToggle() {
  const { liveTest, setLiveTest } = useAdminSandbox();
  return (
    <div
      className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        liveTest
          ? "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400"
          : "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
      }`}
      title={liveTest ? "Live AI ON — gerçek provider çağrıları yapılıyor" : "Sandbox / MOCK — provider çağrısı yok, kredi yakılmaz"}
    >
      {liveTest ? <Zap className="size-3.5" /> : <FlaskConical className="size-3.5" />}
      <span className="hidden sm:inline">{liveTest ? "Live AI" : "Sandbox"}</span>
      <Switch
        checked={liveTest}
        onCheckedChange={setLiveTest}
        aria-label="Live AI toggle"
        className="data-[state=checked]:bg-red-500"
      />
    </div>
  );
}

function AdminCreditBadge({ userId }: { userId: string | undefined }) {
  const { credits } = useCredits(userId);
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary">
      <Coins className="size-3.5" />
      <span>{credits === null ? "—" : credits.toLocaleString()}</span>
      <span className="hidden sm:inline text-[10px] font-normal text-muted-foreground">kredi</span>
    </div>
  );
}


function ManualGrantCard() {
  const grant = useServerFn(grantCreditsByEmail);
  const [email, setEmail] = useState("");
  const [credits, setCredits] = useState("100");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<{ email: string; added: number; balance: number } | null>(null);

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await grant({ data: { email: email.trim(), credits: Number(credits), note } });
      setLastResult({ email: res.email, added: res.added, balance: res.newBalance });
      toast.success(`+${res.added} kredi yüklendi`, {
        description: `${res.email} → toplam ${res.newBalance} kredi`,
        icon: <CheckCircle2 className="size-5 text-green-500" />,
        duration: 6000,
      });
      setEmail("");
      setNote("");
    } catch (err: any) {
      const msg = err?.message ?? "unknown_error";
      const human =
        msg === "user_not_found"
          ? "Bu e-postayla kayıtlı kullanıcı yok. Önce kullanıcı kayıt olmalı."
          : msg === "invalid_email"
            ? "Geçerli bir e-posta gir."
            : msg === "invalid_credits"
              ? "Geçerli bir kredi miktarı gir."
              : msg === "forbidden"
                ? "Yetkin yok."
                : msg;
      toast.error("Yükleme başarısız", { description: human });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="p-6 border-[#25D366]/40 bg-gradient-to-br from-[#25D366]/5 via-card to-card">
      <h2 className="text-sm font-semibold mb-1 flex items-center gap-2">
        <Gift className="size-4 text-[#25D366]" /> Manuel Kredi Yükle
        <span className="text-[10px] font-normal text-muted-foreground ml-1">
          WhatsApp ödeme onayından sonra
        </span>
      </h2>
      <p className="text-xs text-muted-foreground mb-4">
        Kullanıcı WhatsApp'tan ödeme yaptıktan sonra e-postasıyla buradan kredi yükle.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-[1fr,120px,auto] gap-2 items-end">
        <div>
          <label className="text-[11px] font-medium text-muted-foreground block mb-1">Kullanıcı e-posta</label>
          <Input
            type="email"
            placeholder="user@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
            className="h-10"
          />
        </div>
        <div>
          <label className="text-[11px] font-medium text-muted-foreground block mb-1">Kredi</label>
          <Input
            type="number"
            min={1}
            max={100000}
            value={credits}
            onChange={(e) => setCredits(e.target.value)}
            disabled={submitting}
            className="h-10 font-mono"
          />
        </div>
        <Button
          onClick={submit}
          disabled={submitting || !email.trim() || !credits}
          className="h-10 bg-[#25D366] hover:bg-[#1FB957] text-white font-semibold"
        >
          {submitting ? <Loader2 className="size-4 animate-spin" /> : <><Gift className="size-4 mr-1.5" /> Yükle</>}
        </Button>
      </div>
      <Input
        placeholder="Not (opsiyonel — ör: Papara 230₺, Ref OPT-X9K2)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        disabled={submitting}
        className="h-9 text-xs mt-2"
      />
      {lastResult && (
        <div className="mt-3 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-xs">
          ✅ Son yükleme: <strong>{lastResult.email}</strong> · +{lastResult.added} kredi (yeni bakiye: {lastResult.balance})
        </div>
      )}
    </Card>
  );
}



function KpiCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card className="p-4">
      <div className="text-xs text-muted-foreground flex items-center gap-1.5">{icon} {label}</div>
      <div className="text-2xl font-bold tracking-tight mt-1">{value.toLocaleString()}</div>
    </Card>
  );
}

function FunnelRow({ label, value, max, highlight }: { label: string; value: number; max: number; highlight?: boolean }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="w-44 text-xs truncate">{label}</div>
      <div className="flex-1 h-7 rounded bg-muted overflow-hidden relative">
        <div
          className={`h-full ${highlight ? "bg-gradient-to-r from-primary to-amber-500" : "bg-primary/70"} transition-all`}
          style={{ width: `${pct}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-end pr-2 text-xs font-medium">
          {value.toLocaleString()} <span className="text-muted-foreground ml-1">({pct}%)</span>
        </div>
      </div>
    </div>
  );
}

function BreakdownTable({ rows }: { rows: [string, number][] }) {
  if (rows.length === 0) {
    return <div className="text-xs text-muted-foreground py-4">No data yet</div>;
  }
  const max = rows[0]?.[1] ?? 1;
  return (
    <div className="space-y-1.5">
      {rows.map(([name, count]) => (
        <div key={name} className="flex items-center gap-2 text-xs">
          <div className="w-32 truncate">{name}</div>
          <div className="flex-1 h-5 rounded bg-muted overflow-hidden">
            <div className="h-full bg-primary/60" style={{ width: `${(count / max) * 100}%` }} />
          </div>
          <div className="w-12 text-right font-medium">{count}</div>
        </div>
      ))}
    </div>
  );
}

function GalleryManagerCard() {
  const fetchGallery = useServerFn(listGallery);
  const refreshOne = useServerFn(refreshGalleryCategory);
  const refreshAll = useServerFn(refreshAllGalleryCategories);
  const addManual = useServerFn(addManualGalleryItem);
  const removeItem = useServerFn(deleteGalleryItem);

  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<GalleryCategory[]>([]);
  const [itemsByCategory, setItemsByCategory] = useState<Record<string, GalleryItem[]>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [manualUrl, setManualUrl] = useState("");

  const reload = async () => {
    setLoading(true);
    try {
      const res = await fetchGallery();
      setCategories(res.categories);
      setItemsByCategory(res.itemsByCategory);
    } catch (e) {
      toast.error("Gallery load failed", { description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void reload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const handleRefresh = async (cat: GalleryCategory) => {
    setBusyId(cat.id);
    try {
      const res = await refreshOne({ data: { categoryId: cat.id, perPage: 24 } });
      toast.success(`${cat.label}: ${res.inserted} görsel`);
      await reload();
    } catch (e) {
      toast.error(`${cat.label} refresh fail`, { description: (e as Error).message });
    } finally {
      setBusyId(null);
    }
  };

  const handleRefreshAll = async () => {
    if (!confirm("Tüm Unsplash kategorilerini yenile? (rate-limit nedeniyle 1-2 dk sürebilir)")) return;
    setBulkBusy(true);
    try {
      const res = await refreshAll();
      const ok = res.results.filter((r) => r.ok).length;
      const fail = res.results.length - ok;
      toast.success(`Bulk refresh: ${ok} başarılı, ${fail} hatalı`);
      await reload();
    } catch (e) {
      toast.error("Bulk refresh fail", { description: (e as Error).message });
    } finally {
      setBulkBusy(false);
    }
  };

  const handleAddManual = async (catId: string) => {
    const url = manualUrl.trim();
    if (!url) return;
    setBusyId(catId);
    try {
      await addManual({ data: { categoryId: catId, imageUrl: url } });
      toast.success("Manuel görsel eklendi");
      setManualUrl("");
      await reload();
    } catch (e) {
      toast.error("Ekleme başarısız", { description: (e as Error).message });
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (item: GalleryItem) => {
    if (!confirm("Bu görseli sil?")) return;
    setBusyId(item.id);
    try {
      await removeItem({ data: { id: item.id } });
      await reload();
    } catch (e) {
      toast.error("Silme başarısız", { description: (e as Error).message });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card className="p-6 border-primary/30">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <ImageIcon className="size-4 text-primary" /> Galeri Yönetimi (Unsplash + Manuel)
        </h2>
        <Button size="sm" variant="outline" onClick={handleRefreshAll} disabled={bulkBusy || loading}>
          {bulkBusy ? <Loader2 className="size-4 animate-spin mr-1" /> : <RefreshCw className="size-4 mr-1" />}
          Tümünü Yenile
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Her kategori için Unsplash'tan 24 görsel çekilir. Manuel eklediklerin asla silinmez — Unsplash yenilemesi sadece kendi görsellerini değiştirir.
      </p>

      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-2">
          {categories.map((cat) => {
            const items = itemsByCategory[cat.id] ?? [];
            const unsplashCount = items.filter((i) => i.source === "unsplash").length;
            const manualCount = items.filter((i) => i.source === "manual").length;
            const isExpanded = expanded === cat.id;
            return (
              <div key={cat.id} className="border rounded-lg">
                <div className="flex items-center gap-2 p-3">
                  <span className="text-lg">{cat.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{cat.label}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {cat.group_id} · {unsplashCount} unsplash + {manualCount} manuel
                      {cat.unsplash_query ? ` · "${cat.unsplash_query}"` : " · manuel-only"}
                      {cat.refreshed_at ? ` · son: ${new Date(cat.refreshed_at).toLocaleString()}` : ""}
                    </div>
                  </div>
                  {cat.unsplash_query && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRefresh(cat)}
                      disabled={busyId === cat.id}
                    >
                      {busyId === cat.id ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => setExpanded(isExpanded ? null : cat.id)}>
                    {isExpanded ? "Kapat" : "Görseller"}
                  </Button>
                </div>
                {isExpanded && (
                  <div className="border-t p-3 space-y-3 bg-muted/30">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Manuel görsel URL (https://...)"
                        value={manualUrl}
                        onChange={(e) => setManualUrl(e.target.value)}
                        className="h-9 text-xs"
                      />
                      <Button size="sm" onClick={() => handleAddManual(cat.id)} disabled={!manualUrl.trim() || busyId === cat.id}>
                        <Plus className="size-3.5 mr-1" /> Ekle
                      </Button>
                    </div>
                    {items.length === 0 ? (
                      <div className="text-xs text-muted-foreground text-center py-4">Henüz görsel yok.</div>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-2">
                        {items.map((it) => (
                          <div key={it.id} className="relative aspect-square rounded overflow-hidden border group">
                            <img src={it.thumb_url ?? it.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                            <div className={`absolute top-1 left-1 text-[9px] px-1.5 py-0.5 rounded font-bold ${it.source === "manual" ? "bg-amber-500 text-black" : "bg-black/70 text-white"}`}>
                              {it.source === "manual" ? "MANUEL" : "U"}
                            </div>
                            <button
                              onClick={() => handleDelete(it)}
                              disabled={busyId === it.id}
                              className="absolute top-1 right-1 size-6 rounded bg-red-500/90 text-white opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
                            >
                              <Trash2 className="size-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}


function IyzicoOrdersCard() {
  const listFn = useServerFn(listIyzicoOrders);
  const reconcileFn = useServerFn(reconcileIyzicoOrder);
  const deleteFn = useServerFn(deleteIyzicoOrder);
  const [rows, setRows] = useState<IyzicoAdminOrder[]>([]);
  const [summary, setSummary] = useState<{ total: number; pending: number; success: number; failed: number; revenueByCurrency: Record<string, number> } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [filter, setFilter] = useState<"all" | "pending" | "success" | "failed">("all");

  const load = async () => {
    setLoading(true);
    try {
      const res = await listFn();
      setRows(res.rows);
      setSummary(res.summary);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const reconcile = async (id: string) => {
    setBusyId(id);
    try {
      const res = await reconcileFn({ data: { orderId: id } });
      if (res.ok) toast.success(res.message);
      else toast.error(res.message);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Doğrulama başarısız");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Bu ödeme kaydını kalıcı olarak silmek istediğine emin misin?")) return;
    setDeletingId(id);
    // Optimistic update: satırı ve sayaçları anında düşür
    const removed = rows.find((r) => r.id === id);
    setRows((prev) => prev.filter((r) => r.id !== id));
    setSummary((prev) => {
      if (!prev || !removed) return prev;
      const next = { ...prev, total: prev.total - 1, revenueByCurrency: { ...prev.revenueByCurrency } };
      if (removed.status === "pending") next.pending -= 1;
      else if (removed.status === "success") {
        next.success -= 1;
        const cur = next.revenueByCurrency[removed.currency] ?? 0;
        const remaining = cur - removed.amount;
        if (remaining > 0.005) next.revenueByCurrency[removed.currency] = remaining;
        else delete next.revenueByCurrency[removed.currency];
      } else if (removed.status === "failed") next.failed -= 1;
      return next;
    });
    try {
      await deleteFn({ data: { orderId: id } });
      toast.success("Kayıt silindi");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Silme başarısız");
      await load(); // rollback
    } finally {
      setDeletingId(null);
    }
  };


  const filtered = filter === "all" ? rows : rows.filter((r) => r.status === filter);
  const revenueLabel = summary
    ? Object.entries(summary.revenueByCurrency)
        .map(([currency, amount]) => `${amount.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ${currency}`)
        .join(" · ") || "0"
    : "0";

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold">iyzico Ödemeleri</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Son 200 sipariş · pending olanı "Doğrula" ile iyzico'ya sorup krediyi yükler.</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
          {loading ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : <RefreshCw className="size-3.5 mr-1.5" />}
          Yenile
        </Button>
      </div>

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <StatChip label="Toplam" value={String(summary.total)} />
          <StatChip label="Başarılı" value={String(summary.success)} tone="green" />
          <StatChip label="Pending" value={String(summary.pending)} tone={summary.pending > 0 ? "amber" : "muted"} />
          <StatChip label="Gelir" value={revenueLabel} tone="primary" />
        </div>
      )}

      <div className="flex gap-1.5 flex-wrap">
        {(["all", "pending", "success", "failed"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
              filter === f ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"
            }`}
          >
            {f === "all" ? "Hepsi" : f === "pending" ? "Pending" : f === "success" ? "Başarılı" : "Başarısız"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[11px] text-muted-foreground border-b">
                <th className="py-2 px-2">Tarih</th>
                <th className="py-2 px-2">Email</th>
                <th className="py-2 px-2">Plan</th>
                <th className="py-2 px-2 text-right">Tutar</th>
                <th className="py-2 px-2 text-right">Kredi</th>
                <th className="py-2 px-2">Durum</th>
                <th className="py-2 px-2 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="py-2 px-2 whitespace-nowrap text-muted-foreground">
                    {new Date(o.created_at).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="py-2 px-2 max-w-[180px] truncate" title={o.user_email ?? o.user_id}>
                    {o.user_email ?? <span className="font-mono text-[10px]">{o.user_id.slice(0, 8)}</span>}
                  </td>
                  <td className="py-2 px-2 font-mono text-[10px]">{o.plan_id.replace("iyz_", "")}</td>
                  <td className="py-2 px-2 text-right font-medium">{o.amount.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} {o.currency}</td>
                  <td className="py-2 px-2 text-right">{o.credits}</td>
                  <td className="py-2 px-2">
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      o.status === "success" ? "bg-green-500/10 text-green-700 dark:text-green-400" :
                      o.status === "pending" ? "bg-amber-500/10 text-amber-700 dark:text-amber-400" :
                      "bg-red-500/10 text-red-700 dark:text-red-400"
                    }`}>
                      {o.status === "success" ? <CheckCircle2 className="size-3" /> : o.status === "pending" ? <Loader2 className="size-3" /> : null}
                      {o.status}
                    </span>
                    {o.error_message && (
                      <div className="text-[10px] text-red-600 mt-0.5 max-w-[120px] truncate" title={o.error_message}>{o.error_message}</div>
                    )}
                  </td>
                  <td className="py-2 px-2 text-right">
                    <div className="inline-flex items-center gap-1.5 justify-end">
                      {o.status === "pending" && (
                        <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => void reconcile(o.id)} disabled={busyId === o.id}>
                          {busyId === o.id ? <Loader2 className="size-3 animate-spin" /> : "Doğrula"}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-[11px] text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950"
                        onClick={() => void remove(o.id)}
                        disabled={deletingId === o.id}
                        aria-label="Sil"
                        title="Sil"
                      >
                        {deletingId === o.id ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3.5" />}
                      </Button>
                    </div>
                    {o.iyzico_payment_id && (
                      <div className="text-[10px] text-muted-foreground font-mono mt-0.5">#{o.iyzico_payment_id}</div>
                    )}
                  </td>

                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="py-6 text-center text-muted-foreground text-xs">Kayıt yok</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function StatChip({ label, value, tone = "muted" }: { label: string; value: string; tone?: "muted" | "green" | "amber" | "primary" }) {
  const cls = {
    muted: "bg-muted text-foreground",
    green: "bg-green-500/10 text-green-700 dark:text-green-400",
    amber: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    primary: "bg-primary/10 text-primary",
  }[tone];
  return (
    <div className={`rounded-lg px-3 py-2 ${cls}`}>
      <div className="text-[10px] uppercase tracking-wider opacity-70">{label}</div>
      <div className="text-lg font-bold tabular-nums">{value}</div>
    </div>
  );
}

/* -------------------- Platform Settings Card -------------------- */
function PlatformSettingsCard() {
  const [signupCredits, setSignupCredits] = useState<string>("1");
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { getPlatformSettings } = await import("@/lib/platform-settings.functions");
        const s = await getPlatformSettings();
        if (!mounted) return;
        setSignupCredits(String(s.signup_credits ?? 1));
      } catch (e) {
        toast.error("Ayarlar yüklenemedi: " + (e as Error).message);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const saveNumber = async (key: string, raw: string) => {
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) { toast.error("Geçersiz sayı"); return; }
    setSavingKey(key);
    try {
      const { updatePlatformSetting } = await import("@/lib/platform-settings.functions");
      const { bustPlatformSettingsCache } = await import("@/lib/platform-settings.cache");
      await updatePlatformSetting({ data: { key, value: n } });
      bustPlatformSettingsCache();
      toast.success("Kaydedildi");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) return <Card className="p-6"><Loader2 className="size-4 animate-spin" /></Card>;

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h2 className="text-sm font-semibold mb-1">Platform Ayarları</h2>
        <p className="text-xs text-muted-foreground">Site kurallarını buradan dinamik olarak değiştir. Değişiklikler ~15 sn içinde tüm oturumlara yansır.</p>
      </div>

      <div className="space-y-2 border-t pt-4">
        <label className="text-xs font-medium">Yeni kayıt başlangıç kredisi</label>
        <p className="text-[11px] text-muted-foreground">Yeni üye olan kullanıcıya otomatik verilen kredi sayısı.</p>
        <div className="flex gap-2">
          <Input type="number" min={0} max={1000} value={signupCredits} onChange={(e) => setSignupCredits(e.target.value)} className="max-w-[200px]" />
          <Button onClick={() => saveNumber("signup_credits", signupCredits)} disabled={savingKey === "signup_credits"}>
            {savingKey === "signup_credits" ? <Loader2 className="size-4 animate-spin" /> : "Kaydet"}
          </Button>
        </div>
      </div>
    </Card>
  );
}


/* -------------------- Manual Adjust Card -------------------- */
function ManualAdjustCard() {
  const [email, setEmail] = useState("");
  const [delta, setDelta] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (sign: 1 | -1) => {
    const n = Number(delta);
    if (!email || !Number.isFinite(n) || n === 0) { toast.error("E-posta ve miktar gir"); return; }
    setBusy(true);
    try {
      const { adjustCreditsByEmail } = await import("@/lib/admin-credits.functions");
      const r = await adjustCreditsByEmail({ data: { email, delta: sign * Math.abs(n) } });
      toast.success(`${email} → yeni bakiye ${r.newBalance}`);
      setDelta("");
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(false); }
  };

  return (
    <Card className="p-6 space-y-3">
      <div>
        <h2 className="text-sm font-semibold">Kullanıcı Kredisi Ekle / Çıkar</h2>
        <p className="text-xs text-muted-foreground">Belirli bir kullanıcının bakiyesini manuel olarak değiştir.</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_120px_auto_auto]">
        <Input placeholder="kullanici@ornek.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input type="number" min={1} placeholder="Miktar" value={delta} onChange={(e) => setDelta(e.target.value)} />
        <Button onClick={() => submit(1)} disabled={busy}>+ Ekle</Button>
        <Button variant="outline" onClick={() => submit(-1)} disabled={busy}>− Çıkar</Button>
      </div>
    </Card>
  );
}

/* -------------------- Reviews Manager Card -------------------- */
interface AdminReviewRow {
  id: string; name: string; role: string; country: string; countryCode: string;
  quote: string; lang: string; status: "pending" | "approved" | "rejected"; sortOrder: number;
  rating?: number | null;
  createdAt: string; updatedAt: string;
}

function ReviewsManagerCard() {
  const [items, setItems] = useState<AdminReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [showNew, setShowNew] = useState(false);

  const reload = async () => {
    setLoading(true);
    try {
      const { listReviewsAdmin } = await import("@/lib/reviews.functions");
      const data = await listReviewsAdmin();
      setItems(data as AdminReviewRow[]);
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setLoading(false); }
  };

  useEffect(() => { reload(); }, []);

  const setStatus = async (id: string, status: "pending" | "approved" | "rejected") => {
    try {
      const { setReviewStatusAdmin } = await import("@/lib/reviews.functions");
      await setReviewStatusAdmin({ data: { id, status } });
      toast.success("Güncellendi");
      reload();
    } catch (e) { toast.error((e as Error).message); }
  };

  const remove = async (id: string) => {
    if (!confirm("Yorumu silmek istediğine emin misin?")) return;
    try {
      const { deleteReviewAdmin } = await import("@/lib/reviews.functions");
      await deleteReviewAdmin({ data: { id } });
      toast.success("Silindi");
      reload();
    } catch (e) { toast.error((e as Error).message); }
  };

  const filtered = items.filter((i) => filter === "all" || i.status === filter);
  const pendingCount = items.filter((i) => i.status === "pending").length;

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-sm font-semibold">Yorum Yönetimi</h2>
          <p className="text-xs text-muted-foreground">Gelen yorumlar önce burada bekler, sen onaylayınca sitede görünür.</p>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && <Badge variant="secondary">{pendingCount} bekliyor</Badge>}
          <Button size="sm" onClick={() => setShowNew((v) => !v)}>{showNew ? "Kapat" : "+ Yeni yorum"}</Button>
        </div>
      </div>

      {showNew && <ReviewForm onSaved={() => { setShowNew(false); reload(); }} />}

      <div className="flex gap-1 flex-wrap">
        {(["all", "pending", "approved", "rejected"] as const).map((f) => (
          <button key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 text-xs rounded-full border transition ${
              filter === f ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground hover:text-foreground"
            }`}>
            {f === "all" ? "Tümü" : f === "pending" ? "Bekliyor" : f === "approved" ? "Onaylı" : "Reddedildi"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-8 text-center"><Loader2 className="size-5 animate-spin inline" /></div>
      ) : filtered.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-8">Yorum yok.</p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((r) => (
            <li key={r.id} className="border rounded-lg p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">
                    {r.name} <span className="text-xs text-muted-foreground font-normal">— {r.role}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">{r.country} · {r.countryCode} · {r.lang}{r.rating ? ` · ${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}` : ""}</div>
                </div>
                <Badge variant={r.status === "approved" ? "default" : r.status === "pending" ? "secondary" : "destructive"}>
                  {r.status}
                </Badge>
              </div>
              <p className="text-sm text-foreground/90 whitespace-pre-wrap">{r.quote}</p>
              <div className="flex gap-2 flex-wrap pt-1">
                {r.status !== "approved" && <Button size="sm" onClick={() => setStatus(r.id, "approved")}>Onayla</Button>}
                {r.status !== "rejected" && <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "rejected")}>Reddet</Button>}
                {r.status !== "pending" && <Button size="sm" variant="ghost" onClick={() => setStatus(r.id, "pending")}>Beklet</Button>}
                <Button size="sm" variant="destructive" onClick={() => remove(r.id)}>Sil</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function ReviewForm({ onSaved }: { onSaved: () => void }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [country, setCountry] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [quote, setQuote] = useState("");
  const [lang, setLang] = useState("en");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const { createReviewAdmin } = await import("@/lib/reviews.functions");
      await createReviewAdmin({ data: { name, role, country, countryCode, quote, lang, sortOrder: 0 } });
      toast.success("Eklendi ve onaylandı");
      onSaved();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <div className="border rounded-lg p-4 space-y-2 bg-muted/30">
      <div className="grid gap-2 sm:grid-cols-2">
        <Input placeholder="Ad Soyad" value={name} onChange={(e) => setName(e.target.value)} />
        <Input placeholder="Rol / Ünvan" value={role} onChange={(e) => setRole(e.target.value)} />
        <Input placeholder="Ülke (örn: Türkiye)" value={country} onChange={(e) => setCountry(e.target.value)} />
        <Input placeholder="Ülke kodu (TR, DE, US...)" maxLength={2} value={countryCode} onChange={(e) => setCountryCode(e.target.value.toUpperCase())} />
        <Input placeholder="Dil (en, tr, de, es, ru, ar)" value={lang} onChange={(e) => setLang(e.target.value)} />
      </div>
      <textarea
        placeholder="Yorum metni..."
        value={quote}
        onChange={(e) => setQuote(e.target.value)}
        rows={3}
        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
      />
      <Button size="sm" onClick={submit} disabled={busy}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : "Ekle (onaylı)"}
      </Button>
    </div>
  );
}
