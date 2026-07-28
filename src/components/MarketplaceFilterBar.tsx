import { useEffect, useState } from "react";
import {
  MARKETPLACES,
  type MarketplaceId,
  getMarketplace,
  setMarketplace,
  subscribeMarketplace,
} from "@/lib/marketplaces";

type Props = {
  /** Show the aspect-ratio hint (e.g. "1:1") inside each chip. */
  showRatio?: boolean;
  className?: string;
};

/**
 * Horizontal, swipeable marketplace filter used across /dashboard and /studio.
 * Selection is stored globally so both routes stay in sync.
 */
export function MarketplaceFilterBar({ showRatio = true, className = "" }: Props) {
  const [active, setActive] = useState<MarketplaceId>("amazon");

  useEffect(() => {
    setActive(getMarketplace());
    return subscribeMarketplace(setActive);
  }, []);

  return (
    <div
      className={`-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:flex-wrap md:overflow-visible md:px-0 ${className}`}
      role="tablist"
      aria-label="Marketplace format"
    >
      {MARKETPLACES.map((m) => {
        const isActive = active === m.id;
        return (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => setMarketplace(m.id)}
            className={`flex shrink-0 snap-start items-center gap-2 rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition ${
              isActive
                ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
            }`}
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: m.accent }}
              aria-hidden
            />
            <span>{m.label}</span>
            {showRatio && (
              <span
                className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium tabular-nums ${
                  isActive ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500"
                }`}
              >
                {m.short}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function useActiveMarketplace(): MarketplaceId {
  const [active, setActive] = useState<MarketplaceId>("amazon");
  useEffect(() => {
    setActive(getMarketplace());
    return subscribeMarketplace(setActive);
  }, []);
  return active;
}
