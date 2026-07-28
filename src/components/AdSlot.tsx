import { useEffect, useRef } from "react";

type AdSlotProps = {
  label?: string;
  className?: string;
  height?: string;
  adSlot?: string;
  adFormat?: string;
  fullWidthResponsive?: boolean;
};

/**
 * Google AdSense ad unit wrapper.
 * Pass `adSlot` to render a live ad; otherwise a dashed placeholder is shown.
 */
export function AdSlot({
  label = "Advertisement",
  className = "",
  height = "h-24",
  adSlot,
  adFormat = "auto",
  fullWidthResponsive = true,
}: AdSlotProps) {
  const pushedRef = useRef(false);

  useEffect(() => {
    if (!adSlot || pushedRef.current) return;
    try {
      const w = window as any;
      w.adsbygoogle = w.adsbygoogle || [];
      w.adsbygoogle.push({});
      pushedRef.current = true;
    } catch (e) {
      console.error("AdSense push failed:", e);
    }
  }, [adSlot]);

  if (!adSlot) {
    return (
      <div
        aria-label={label}
        className={`w-full ${height} rounded-xl border border-dashed border-border bg-muted/30 flex items-center justify-center text-xs uppercase tracking-wider text-muted-foreground/70 ${className}`}
      >
        {label}
      </div>
    );
  }

  return (
    <ins
      className={`adsbygoogle ${className}`}
      style={{ display: "block" }}
      data-ad-client="ca-pub-9094226564934665"
      data-ad-slot={adSlot}
      data-ad-format={adFormat}
      data-full-width-responsive={fullWidthResponsive ? "true" : "false"}
    />
  );
}
