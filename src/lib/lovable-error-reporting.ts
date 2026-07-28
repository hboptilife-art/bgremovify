import { reportClientIssue } from "./feedback.functions";

type LovableErrorOptions = {
  mechanism?: "manual" | "onerror" | "unhandledrejection" | "react_error_boundary";
  handled?: boolean;
  severity?: "error" | "warning" | "info";
};

type LovableEvents = {
  captureException?: (
    error: unknown,
    context?: Record<string, unknown>,
    options?: LovableErrorOptions,
  ) => void;
};

declare global {
  interface Window {
    __lovableEvents?: LovableEvents;
  }
}

// Session-level dedup so we don't spam the panel with the same error every render.
const seen = new Set<string>();

function signatureOf(error: unknown, route: string): string {
  const msg = error instanceof Error ? error.message : String(error);
  return `${route}::${msg.slice(0, 120)}`;
}

export function reportLovableError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  const route = window.location.pathname;
  const sig = signatureOf(error, route);

  window.__lovableEvents?.captureException?.(
    error,
    { source: "react_error_boundary", route, ...context },
    { mechanism: "react_error_boundary", handled: false, severity: "error" },
  );

  // Fire-and-forget to our own panel; dedup per session.
  if (seen.has(sig)) return;
  seen.add(sig);
  try {
    const msg = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack ?? "" : "";
    void reportClientIssue({
      data: {
        title: msg.slice(0, 200) || "client_error",
        detail: stack.slice(0, 2000),
        route,
        signature: sig.slice(0, 200),
      },
    }).catch(() => { /* ignore */ });
  } catch { /* ignore */ }
}
