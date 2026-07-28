// Server-only helper for writing to public.feedback_events.
// Fire-and-forget: never throws, so business logic isn't affected by logging.

type Kind = "payment" | "ai_error" | "user_feedback" | "system_error";
type Severity = "info" | "warning" | "error" | "success";

export interface FeedbackLogInput {
  kind: Kind;
  severity?: Severity;
  source?: string;
  title: string;
  detail?: string | null;
  user_id?: string | null;
  user_email?: string | null;
  metadata?: Record<string, unknown>;
}

function truncate(s: string | null | undefined, max: number): string | null {
  if (!s) return null;
  return s.length > max ? s.slice(0, max) : s;
}

export async function logFeedback(evt: FeedbackLogInput): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("feedback_events").insert({
      kind: evt.kind,
      severity: evt.severity ?? "info",
      source: evt.source ?? null,
      title: truncate(evt.title, 300) ?? "(untitled)",
      detail: truncate(evt.detail ?? null, 4000),
      user_id: evt.user_id ?? null,
      user_email: evt.user_email ?? null,
      metadata: (evt.metadata ?? {}) as never,
    });
  } catch (err) {
    console.warn("[feedback-log] insert failed", err);
  }
}
