// Google Ads / Meta conversion tracking helpers.
//
// Base gtag config for AW-7088990370 is loaded in src/routes/__root.tsx.
// Enhanced Conversions are enabled: when an email is provided we hash it
// with SHA-256 and pass it to gtag('set', 'user_data', {...}) before the
// conversion event so Google Ads can match the click to the user.

export const GOOGLE_ADS_ID = "AW-7088990370";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
  }
}

type ConversionName = "Kayit_Basarili" | "Odeme_Basarili";

// Map internal names -> Google Ads / GA4 event names.
const GTAG_EVENT: Record<ConversionName, "sign_up" | "purchase"> = {
  Kayit_Basarili: "sign_up",
  Odeme_Basarili: "purchase",
};

async function sha256Hex(input: string): Promise<string | null> {
  try {
    const normalized = input.trim().toLowerCase();
    if (!normalized) return null;
    const buf = new TextEncoder().encode(normalized);
    const digest = await crypto.subtle.digest("SHA-256", buf);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return null;
  }
}

async function setEnhancedUserData(params?: Record<string, unknown>) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  const email = typeof params?.email === "string" ? (params.email as string) : null;
  if (!email) return;
  const hashed = await sha256Hex(email);
  if (!hashed) return;
  try {
    window.gtag("set", "user_data", { sha256_email_address: hashed });
  } catch {
    /* noop */
  }
}

export function trackConversion(name: ConversionName, params?: Record<string, unknown>) {
  if (typeof window === "undefined") return;

  // Strip PII from the outgoing event payload; email only used for hashing.
  const { email: _email, ...safeParams } = (params ?? {}) as Record<string, unknown>;
  const eventName = GTAG_EVENT[name];

  void (async () => {
    await setEnhancedUserData(params);

    if (typeof window.gtag === "function") {
      try {
        // Google Ads conversion — send_to points at the AW account.
        window.gtag("event", "conversion", {
          send_to: GOOGLE_ADS_ID,
          ...safeParams,
        });
        // Standard GA4 / Google Ads event (sign_up | purchase)
        window.gtag("event", eventName, safeParams);
        // Legacy custom name for internal analytics
        window.gtag("event", name, safeParams);
      } catch {
        /* noop */
      }
    }

    if (typeof window.fbq === "function") {
      try {
        window.fbq("trackCustom", name, safeParams);
      } catch {
        /* noop */
      }
    }
  })();
}
