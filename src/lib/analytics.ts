// Centralized funnel + attribution tracking.
// Writes to:
//   1. Supabase `analytics_events` (durable, admin-readable)
//   2. Meta Pixel (fbq) — for ad optimization
//   3. Google Analytics (gtag) — for funnel reports
//
// UTM params are captured on first visit, persisted in sessionStorage,
// and attached to every event in the session.

import { supabase } from "@/integrations/supabase/client";
import { getCachedGeo, detectGeo } from "@/lib/geo";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
  }
}

const SESSION_KEY = "bgr_session_id";
const UTM_KEY = "bgr_utm_v1";

export interface UtmParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  referrer?: string;
}

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "no-storage";
  }
}

export function captureUtmFromUrl(): UtmParams {
  if (typeof window === "undefined") return {};
  try {
    const stored = sessionStorage.getItem(UTM_KEY);
    if (stored) return JSON.parse(stored) as UtmParams;

    const url = new URL(window.location.href);
    const utm: UtmParams = {
      utm_source: url.searchParams.get("utm_source") ?? undefined,
      utm_medium: url.searchParams.get("utm_medium") ?? undefined,
      utm_campaign: url.searchParams.get("utm_campaign") ?? undefined,
      utm_term: url.searchParams.get("utm_term") ?? undefined,
      utm_content: url.searchParams.get("utm_content") ?? undefined,
      referrer: document.referrer || undefined,
    };

    // Only persist if we got at least one UTM or a useful referrer
    const hasData = Object.values(utm).some((v) => v && v.length > 0);
    if (hasData) {
      sessionStorage.setItem(UTM_KEY, JSON.stringify(utm));
    }
    return utm;
  } catch {
    return {};
  }
}

function getStoredUtm(): UtmParams {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(UTM_KEY);
    return raw ? (JSON.parse(raw) as UtmParams) : {};
  } catch {
    return {};
  }
}

export async function track(
  eventName: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  if (typeof window === "undefined") return;

  const sessionId = getOrCreateSessionId();
  const utm = getStoredUtm();
  const geo = getCachedGeo();

  // Fire third-party trackers immediately (non-blocking).
  try {
    window.fbq?.("trackCustom", eventName, metadata);
  } catch {
    /* ignore */
  }
  try {
    window.gtag?.("event", eventName, {
      ...(metadata ?? {}),
      ...utm,
    });
  } catch {
    /* ignore */
  }

  // Persist to our DB (fire-and-forget, never throws).
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase.from("analytics_events").insert({
      event_name: eventName,
      session_id: sessionId,
      user_id: user?.id ?? null,
      utm_source: utm.utm_source ?? null,
      utm_medium: utm.utm_medium ?? null,
      utm_campaign: utm.utm_campaign ?? null,
      utm_term: utm.utm_term ?? null,
      utm_content: utm.utm_content ?? null,
      referrer: utm.referrer ?? null,
      country: geo?.country ?? null,
      metadata: (metadata ?? {}) as never,
    });
  } catch (err) {
    // Never break the UI for analytics failures.
    if (import.meta.env.DEV) console.warn("[analytics] insert failed", err);
  }
}

// Initialize on app boot: capture UTM, ensure session id, warm geo cache.
export function initAnalytics(): void {
  if (typeof window === "undefined") return;
  getOrCreateSessionId();
  captureUtmFromUrl();
  // fire-and-forget geo detection
  void detectGeo();
}
