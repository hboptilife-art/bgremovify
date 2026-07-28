import { useEffect, useRef, useState } from "react";

/**
 * Sonuç ekranı için Before/After.
 * Mount olur olmaz otomatik "wipe" animasyonu (0→100% 1.8s ease-out) çalar,
 * sonra kullanıcı slider'ı sürükleyebilir.
 */
export function BeforeAfterReveal({
  beforeSrc,
  afterSrc,
  beforeLabel = "Before",
  afterLabel = "After",
  aspectClass = "aspect-[4/5]",
  onDownload,
  onSendToStudio,
  onRetry,
}: {
  beforeSrc: string;
  afterSrc: string;
  beforeLabel?: string;
  afterLabel?: string;
  aspectClass?: string;
  onDownload?: () => void;
  onSendToStudio?: () => void;
  onRetry?: () => void;
}) {
  const [pos, setPos] = useState(0);
  const [autoDone, setAutoDone] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  // Auto-wipe reveal on mount
  useEffect(() => {
    const start = performance.now();
    const duration = 1800;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      setPos(eased * 100);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setAutoDone(true);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const updateFromClientX = (clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const next = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.max(0, Math.min(100, next)));
  };

  useEffect(() => {
    if (!autoDone) return;
    const onMove = (e: MouseEvent) => draggingRef.current && updateFromClientX(e.clientX);
    const onUp = () => { draggingRef.current = false; };
    const onTouch = (e: TouchEvent) => {
      if (!draggingRef.current) return;
      const t = e.touches[0];
      if (t) updateFromClientX(t.clientX);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onTouch, { passive: true });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onTouch);
      window.removeEventListener("touchend", onUp);
    };
  }, [autoDone]);

  const start = (clientX: number) => {
    if (!autoDone) return;
    draggingRef.current = true;
    updateFromClientX(clientX);
  };

  return (
    <div className="w-full">
      <div
        ref={containerRef}
        className={`relative w-full ${aspectClass} overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 select-none ${
          autoDone ? "cursor-ew-resize" : ""
        }`}
        onMouseDown={(e) => start(e.clientX)}
        onTouchStart={(e) => { const t = e.touches[0]; if (t) start(t.clientX); }}
      >
        {/* Before (base) */}
        <img
          src={beforeSrc}
          alt={beforeLabel}
          className="absolute inset-0 h-full w-full object-contain"
          draggable={false}
        />
        {/* After clipped */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
        >
          <img
            src={afterSrc}
            alt={afterLabel}
            className="absolute inset-0 h-full w-full object-contain"
            draggable={false}
          />
        </div>

        <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
          {beforeLabel}
        </span>
        <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-emerald-500/95 px-2.5 py-1 text-[11px] font-semibold text-white shadow">
          {afterLabel}
        </span>

        {/* Divider */}
        <div
          className="pointer-events-none absolute top-0 bottom-0 w-[2px] bg-white shadow-[0_0_12px_rgba(16,185,129,0.55)]"
          style={{ left: `${pos}%` }}
        />
        {autoDone && (
          <div
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 grid h-10 w-10 place-items-center rounded-full border border-emerald-400 bg-white shadow-lg"
            style={{ left: `${pos}%` }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600">
              <polyline points="9 6 3 12 9 18" />
              <polyline points="15 6 21 12 15 18" />
            </svg>
          </div>
        )}
      </div>

      {(onDownload || onSendToStudio || onRetry) && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          {onDownload && (
            <button
              onClick={onDownload}
              className="rounded-full bg-slate-900 px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-slate-800"
            >
              Download
            </button>
          )}
          {onSendToStudio && (
            <button
              onClick={onSendToStudio}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-[12.5px] font-semibold text-slate-700 hover:border-slate-300"
            >
              Add to canvas
            </button>
          )}
          {onRetry && (
            <button
              onClick={onRetry}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-[12.5px] font-semibold text-slate-600 hover:border-slate-300"
            >
              Try another template
            </button>
          )}
        </div>
      )}
    </div>
  );
}
