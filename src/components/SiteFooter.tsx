import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { FeedbackHub } from "@/components/FeedbackHub";
import { detectGeo, getCachedGeo, type GeoRegion } from "@/lib/geo";
import { useT } from "@/i18n/useT";

export function SiteFooter() {
  return <FooterInner />;
}


function FooterInner() {
  // TR-only assets: iyzico payment badge row + Turkish legal links.
  // Global visitors must never see "iyzico", "TRY", or Turkish trust copy.
  const [region, setRegion] = useState<GeoRegion | null>(null);
  const { t, lang } = useT("en");


  useEffect(() => {
    let cancelled = false;
    const cachedRegion = getCachedGeo()?.region;
    if (cachedRegion) {
      setRegion(cachedRegion);
      return () => { cancelled = true; };
    }
    detectGeo()
      .then((g) => { if (!cancelled) setRegion(g.region); })
      .catch(() => { if (!cancelled) setRegion("GLOBAL"); });
    return () => { cancelled = true; };
  }, []);

  // TR legal pages (KVKK, Mesafeli Satış, İade, Hakkımızda) are only shown for TR region.
  const isTR = region === "TR";

  return (
    <footer className="border-t mt-12">
      <div className="container mx-auto px-6 py-8 space-y-6 text-sm text-muted-foreground">
        <div className="flex justify-center pb-2">
          <FeedbackHub />
        </div>

        {/* Payment methods & security — TR-only (iyzico requirement + Turkish trust copy). */}
        {isTR && (
          <div className="flex flex-col items-center justify-center gap-3 pb-2">
            <div className="flex flex-wrap items-center justify-center gap-3" aria-label={t("footer.pay")}>
              <PaymentBadge label="iyzico" bg="bg-[#1E64FF]" fg="text-white" size="lg" />
              <PaymentBadge label="VISA" bg="bg-white border border-border" fg="text-[#1A1F71] font-bold italic" size="lg" />
              <PaymentBadge label="MC" bg="bg-white border border-border" fg="text-[#EB001B] font-bold" title="Mastercard" size="lg" />
              <PaymentBadge label="AMEX" bg="bg-[#2E77BB]" fg="text-white font-bold" title="American Express" size="lg" />
              <PaymentBadge label="Troy" bg="bg-white border border-border" fg="text-[#00A69C] font-bold" size="lg" />
              <ApplePayBadge />
              <GooglePayBadge />
            </div>

            <div className="flex items-center gap-1.5 text-sm font-medium text-foreground" dir={lang === "ar" ? "rtl" : "ltr"}>
              <Lock className="h-4 w-4 text-emerald-500" />
              <span>{t("footer.secure")}</span>
            </div>
          </div>
        )}

        <div className="border-t pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>
            © {new Date().getFullYear()} BgRemovify. {t("footer.rights")}
            {/* Hidden admin entry */}
            <Link
              to="/admin"
              aria-label="admin"
              className="ml-1.5 inline-block size-1 rounded-full bg-muted-foreground/20 hover:bg-primary transition-colors"
            />
          </p>
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {isTR && (
              <Link to="/about" className="hover:text-foreground transition-colors">{t("footer.about")}</Link>
            )}
            <Link to="/help" className="hover:text-foreground transition-colors">{t("footer.help")}</Link>
            <Link to="/brand" className="hover:text-foreground transition-colors">{t("footer.brand")}</Link>
            <Link to="/contact" className="hover:text-foreground transition-colors">{t("footer.contact")}</Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">{t("footer.privacy")}</Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">{t("footer.terms")}</Link>
            {isTR && (
              <>
                <Link to="/kvkk" className="hover:text-foreground transition-colors">{t("footer.kvkk")}</Link>
                <Link to="/mesafeli-satis" className="hover:text-foreground transition-colors">{t("footer.distance")}</Link>
                <Link to="/iade" className="hover:text-foreground transition-colors">{t("footer.refund")}</Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </footer>
  );
}

function PaymentBadge({
  label,
  bg,
  fg,
  title,
  size = "md",
}: {
  label: string;
  bg: string;
  fg: string;
  title?: string;
  size?: "md" | "lg";
}) {
  const sizeCls =
    size === "lg"
      ? "px-3 py-1.5 text-xs min-w-[56px] h-8"
      : "px-2 py-1 text-[10px] min-w-[42px] h-6";
  return (
    <span
      title={title ?? label}
      className={`inline-flex items-center justify-center rounded-md tracking-wide ${sizeCls} ${bg} ${fg}`}
    >
      {label}
    </span>
  );
}

function ApplePayBadge() {
  return (
    <span
      title="Apple Pay"
      aria-label="Apple Pay"
      className="inline-flex items-center justify-center rounded-md bg-white border border-border px-3 h-8 shadow-sm"
    >
      <svg width="38" height="16" viewBox="0 0 40 16" fill="#000" aria-hidden>
        <path d="M6.5 2.2c.5-.6.8-1.4.7-2.2-.7 0-1.5.4-2 1-.5.6-.9 1.4-.7 2.2.8 0 1.6-.4 2-1zM7.1 3.3c-1.1-.1-2 .6-2.6.6-.6 0-1.4-.6-2.3-.6-1.2 0-2.3.7-2.9 1.8C-1.9 7.4-.6 11 .6 13c.6 1 1.3 2 2.3 2 .9 0 1.3-.6 2.4-.6s1.4.6 2.4.6c1 0 1.6-1 2.2-2 .7-1.1 1-2.3 1-2.3s-1.9-.7-1.9-2.9c0-1.8 1.5-2.7 1.6-2.7-.9-1.3-2.2-1.5-2.7-1.5z"/>
        <text x="13" y="12" fontFamily="-apple-system, Helvetica, Arial, sans-serif" fontSize="10" fontWeight="600" fill="#000">Pay</text>
      </svg>
    </span>
  );
}

function GooglePayBadge() {
  return (
    <span
      title="Google Pay"
      aria-label="Google Pay"
      className="inline-flex items-center justify-center rounded-md bg-white border border-border px-3 h-8 shadow-sm"
    >
      <svg width="48" height="16" viewBox="0 0 52 16" aria-hidden>
        <text x="0" y="12" fontFamily="Arial, sans-serif" fontSize="11" fontWeight="700">
          <tspan fill="#4285F4">G</tspan>
          <tspan fill="#EA4335">o</tspan>
          <tspan fill="#FBBC04">o</tspan>
          <tspan fill="#4285F4">g</tspan>
          <tspan fill="#34A853">l</tspan>
          <tspan fill="#EA4335">e</tspan>
        </text>
        <text x="30" y="12" fontFamily="Arial, sans-serif" fontSize="11" fontWeight="600" fill="#5F6368">Pay</text>
      </svg>
    </span>
  );
}
