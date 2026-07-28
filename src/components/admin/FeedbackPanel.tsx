import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  getFeedbackSummary,
  listFeedbackEvents,
  resolveFeedbackEvent,
  deleteFeedbackEvent,
  runFeedbackArchiveNow,
} from "@/lib/feedback.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MessageSquare,
  Bug,
  DollarSign,
  RefreshCw,
  Trash2,
  Check,
  Loader2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

interface EventItem {
  id: string;
  kind: string;
  severity: string;
  status: string;
  source: string | null;
  title: string;
  detail: string | null;
  user_email: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  resolved_at: string | null;
  archived_at: string | null;
}

interface Summary {
  paymentsSuccess: number;
  paymentsFailed: number;
  openAiErrors: number;
  openFeedback: number;
  sysErrors24h: number;
}

const KIND_META: Record<string, { label: string; icon: React.ReactNode }> = {
  payment: { label: "Ödeme", icon: <DollarSign className="size-3.5" /> },
  ai_error: { label: "AI Hata", icon: <Bug className="size-3.5" /> },
  user_feedback: { label: "Geri Bildirim", icon: <MessageSquare className="size-3.5" /> },
  system_error: { label: "Sistem", icon: <AlertTriangle className="size-3.5" /> },
};

export function FeedbackPanel() {
  const fetchSummary = useServerFn(getFeedbackSummary);
  const fetchList = useServerFn(listFeedbackEvents);
  const resolveFn = useServerFn(resolveFeedbackEvent);
  const deleteFn = useServerFn(deleteFeedbackEvent);
  const runArchive = useServerFn(runFeedbackArchiveNow);

  const [summary, setSummary] = useState<Summary | null>(null);
  const [rows, setRows] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [kindFilter, setKindFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("open");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, l] = await Promise.all([
        fetchSummary(),
        fetchList({ data: { kind: kindFilter || undefined, status: statusFilter || undefined, limit: 200 } }),
      ]);
      setSummary(s);
      setRows(l as EventItem[]);
    } catch (err) {
      console.error(err);
      toast.error("Veriler yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [fetchSummary, fetchList, kindFilter, statusFilter]);

  useEffect(() => { void load(); }, [load]);

  const onResolve = async (id: string) => {
    setBusy(true);
    try {
      await resolveFn({ data: { id } });
      toast.success("Çözüldü olarak işaretlendi");
      await load();
    } catch { toast.error("İşlem başarısız"); }
    finally { setBusy(false); }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Bu kaydı silmek istiyor musunuz?")) return;
    setBusy(true);
    try {
      await deleteFn({ data: { id } });
      toast.success("Silindi");
      await load();
    } catch { toast.error("Silinemedi"); }
    finally { setBusy(false); }
  };

  const onArchiveNow = async () => {
    setBusy(true);
    try {
      const res = await runArchive();
      toast.success(`${res.archived} kayıt arşivlendi`);
      await load();
    } catch { toast.error("Arşivleme başarısız"); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      {/* Summary blocks */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <SummaryCard
          label="Başarılı Ödeme (24s)"
          value={summary?.paymentsSuccess ?? 0}
          tone="success"
          icon={<CheckCircle2 className="size-4" />}
        />
        <SummaryCard
          label="Başarısız Ödeme (24s)"
          value={summary?.paymentsFailed ?? 0}
          tone={summary && summary.paymentsFailed > 0 ? "error" : "muted"}
          icon={<XCircle className="size-4" />}
        />
        <SummaryCard
          label="Açık AI Hatası"
          value={summary?.openAiErrors ?? 0}
          tone={summary && summary.openAiErrors > 0 ? "warning" : "muted"}
          icon={<Bug className="size-4" />}
        />
        <SummaryCard
          label="Bekleyen Geri Bildirim"
          value={summary?.openFeedback ?? 0}
          tone={summary && summary.openFeedback > 0 ? "info" : "muted"}
          icon={<MessageSquare className="size-4" />}
        />
        <SummaryCard
          label="Sistem Hatası (24s)"
          value={summary?.sysErrors24h ?? 0}
          tone={summary && summary.sysErrors24h > 0 ? "warning" : "muted"}
          icon={<AlertTriangle className="size-4" />}
        />
      </div>

      {/* Filters + actions */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <FilterChip label="Tümü" active={!kindFilter} onClick={() => setKindFilter("")} />
          <FilterChip label="Ödeme" active={kindFilter === "payment"} onClick={() => setKindFilter("payment")} />
          <FilterChip label="AI Hata" active={kindFilter === "ai_error"} onClick={() => setKindFilter("ai_error")} />
          <FilterChip label="Geri Bildirim" active={kindFilter === "user_feedback"} onClick={() => setKindFilter("user_feedback")} />
          <FilterChip label="Sistem" active={kindFilter === "system_error"} onClick={() => setKindFilter("system_error")} />
          <div className="w-px h-5 bg-border mx-1" />
          <FilterChip label="Açık" active={statusFilter === "open"} onClick={() => setStatusFilter("open")} />
          <FilterChip label="Çözüldü" active={statusFilter === "resolved"} onClick={() => setStatusFilter("resolved")} />
          <FilterChip label="Arşiv" active={statusFilter === "archived"} onClick={() => setStatusFilter("archived")} />
          <FilterChip label="Hepsi" active={statusFilter === ""} onClick={() => setStatusFilter("")} />

          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => void load()} disabled={busy}>
              <RefreshCw className={`size-3.5 mr-1 ${loading ? "animate-spin" : ""}`} /> Yenile
            </Button>
            <Button size="sm" variant="outline" onClick={onArchiveNow} disabled={busy}>
              <Sparkles className="size-3.5 mr-1" /> Şimdi temizle
            </Button>
          </div>
        </div>
      </Card>

      {/* List */}
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Bu filtreyle kayıt yok — dükkân temiz. 🎉
          </div>
        ) : (
          <ul className="divide-y">
            {rows.map((r) => (
              <EventRow key={r.id} row={r} onResolve={onResolve} onDelete={onDelete} busy={busy} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: number;
  tone: "success" | "error" | "warning" | "info" | "muted";
  icon: React.ReactNode;
}) {
  const toneCls =
    tone === "success"
      ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400"
      : tone === "error"
        ? "border-red-500/30 bg-red-500/5 text-red-600 dark:text-red-400"
        : tone === "warning"
          ? "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400"
          : tone === "info"
            ? "border-primary/30 bg-primary/5 text-primary"
            : "border-border bg-card text-muted-foreground";
  return (
    <div className={`rounded-lg border p-3 ${toneCls}`}>
      <div className="flex items-center gap-1.5 text-xs font-medium opacity-80">
        {icon} {label}
      </div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
        active ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-accent text-muted-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function EventRow({
  row,
  onResolve,
  onDelete,
  busy,
}: {
  row: EventItem;
  onResolve: (id: string) => void;
  onDelete: (id: string) => void;
  busy: boolean;
}) {
  const meta = KIND_META[row.kind] ?? { label: row.kind, icon: null };
  const severityColor =
    row.severity === "error"
      ? "text-red-600 dark:text-red-400"
      : row.severity === "warning"
        ? "text-amber-600 dark:text-amber-400"
        : row.severity === "success"
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-muted-foreground";

  return (
    <li className="p-4 hover:bg-muted/40 transition-colors">
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 ${severityColor}`}>{meta.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
              {meta.label}
            </Badge>
            <span className={`text-[10px] uppercase ${severityColor}`}>{row.severity}</span>
            {row.status !== "open" && (
              <Badge variant="secondary" className="text-[10px]">{row.status}</Badge>
            )}
            {row.source && <span className="text-[10px] text-muted-foreground">· {row.source}</span>}
            <span className="text-[10px] text-muted-foreground ml-auto">
              {new Date(row.created_at).toLocaleString("tr-TR")}
            </span>
          </div>
          <p className="text-sm font-medium mt-1 truncate">{row.title}</p>
          {row.detail && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2 whitespace-pre-wrap">{row.detail}</p>
          )}
          {row.user_email && (
            <p className="text-xs text-muted-foreground mt-1">👤 {row.user_email}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {row.status === "open" && (
            <Button size="sm" variant="ghost" onClick={() => onResolve(row.id)} disabled={busy} title="Çözüldü">
              <Check className="size-3.5" />
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(row.id)}
            disabled={busy}
            title="Sil"
            className="text-red-500 hover:text-red-600"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>
    </li>
  );
}
