import { useEffect, useRef, useState } from "react";
import { Coins, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

type CreditCounterProps = {
  credits: number | null;
  loading?: boolean;
  label: string;
  buyLabel: string;
  compact?: boolean;
  className?: string;
};

/**
 * Premium credit counter with a subtle "pop" animation whenever the value
 * changes. Reads-only — parent (`useCredits`) owns the state.
 */
export function CreditCounter({
  credits,
  loading,
  label,
  buyLabel,
  compact = false,
  className,
}: CreditCounterProps) {
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const prev = useRef<number | null>(credits);

  useEffect(() => {
    if (credits === null || prev.current === null) {
      prev.current = credits;
      return;
    }
    if (credits > prev.current) setFlash("up");
    else if (credits < prev.current) setFlash("down");
    prev.current = credits;
  }, [credits]);

  useEffect(() => {
    if (flash === null) return;
    const t = setTimeout(() => setFlash(null), 700);
    return () => clearTimeout(t);
  }, [flash]);

  const value = loading || credits === null ? "—" : credits.toString();
  const low = typeof credits === "number" && credits <= 1;

  if (compact) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 backdrop-blur transition-all",
          flash === "down" && "border-rose-400/60 bg-rose-500/10",
          flash === "up" && "border-emerald-400/60 bg-emerald-500/10",
          className,
        )}
        aria-live="polite"
      >
        <Coins className="h-3.5 w-3.5 text-primary" />
        <span
          key={`${value}-${flash}`}
          className={cn(
            "text-xs font-semibold tabular-nums transition-transform",
            flash && "animate-[scale-in_0.35s_ease-out]",
            low ? "text-rose-300" : "text-foreground",
          )}
        >
          {value}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-4 backdrop-blur-xl shadow-[0_20px_60px_-30px_rgba(0,0,0,0.6)]",
        className,
      )}
      aria-live="polite"
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500",
          flash === "down" && "opacity-100 bg-[radial-gradient(circle_at_top,rgba(244,63,94,0.18),transparent_60%)]",
          flash === "up" && "opacity-100 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.18),transparent_60%)]",
        )}
      />
      <div className="relative">
        <div className="flex items-center justify-between gap-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Coins className="h-3.5 w-3.5 text-primary" />
            {label}
          </span>
          {low && (
            <span className="rounded-full bg-rose-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-rose-300">
              low
            </span>
          )}
        </div>
        <div className="mt-2 flex items-end justify-between">
          <span
            key={`${value}-${flash}`}
            className={cn(
              "text-4xl font-bold tabular-nums leading-none tracking-tight",
              flash === "down" && "animate-[scale-in_0.4s_ease-out] text-rose-300",
              flash === "up" && "animate-[scale-in_0.4s_ease-out] text-emerald-300",
              !flash && "text-foreground",
            )}
          >
            {value}
          </span>
          <Link
            to="/"
            hash="pricing"
            className="inline-flex items-center gap-1 rounded-full bg-primary/90 px-3 py-1.5 text-[11px] font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:bg-primary"
          >
            <Sparkles className="h-3 w-3" /> {buyLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
