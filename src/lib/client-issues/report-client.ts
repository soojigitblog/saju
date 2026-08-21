"use client";

/**
 * Best-effort client issue reporter. Never throws to callers.
 */
export function reportClientIssue(input: {
  kind: "BUG_REPORT" | "CLIENT_ERROR";
  message: string;
  details?: string | null;
  path?: string | null;
  metadata?: Record<string, unknown>;
}) {
  if (typeof window === "undefined") return;

  const payload = {
    kind: input.kind,
    message: input.message.slice(0, 500),
    details: input.details?.slice(0, 4000) ?? null,
    path: (input.path ?? window.location.pathname).slice(0, 300),
    metadata: input.metadata,
  };

  void fetch("/api/client-issues", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {
    /* ignore */
  });
}

export function installClientErrorCapture() {
  if (typeof window === "undefined") return () => {};

  const g = window as Window & { __unuiClientErrorCapture?: boolean };
  if (g.__unuiClientErrorCapture) return () => {};
  g.__unuiClientErrorCapture = true;

  const recent = new Set<string>();

  function shouldSkip(key: string) {
    if (recent.has(key)) return true;
    recent.add(key);
    window.setTimeout(() => recent.delete(key), 30_000);
    return false;
  }

  function onError(event: ErrorEvent) {
    const msg = event.message || "window.error";
    const key = `e:${msg}:${event.filename}:${event.lineno}`;
    if (shouldSkip(key)) return;
    reportClientIssue({
      kind: "CLIENT_ERROR",
      message: msg,
      details: [
        event.filename ? `file=${event.filename}` : null,
        event.lineno != null ? `line=${event.lineno}` : null,
        event.colno != null ? `col=${event.colno}` : null,
        event.error instanceof Error ? event.error.stack : null,
      ]
        .filter(Boolean)
        .join("\n"),
      metadata: { source: "window.error" },
    });
  }

  function onRejection(event: PromiseRejectionEvent) {
    const reason = event.reason;
    const msg =
      reason instanceof Error
        ? reason.message
        : typeof reason === "string"
          ? reason
          : "unhandledrejection";
    const key = `r:${msg}`;
    if (shouldSkip(key)) return;
    reportClientIssue({
      kind: "CLIENT_ERROR",
      message: msg.slice(0, 500),
      details: reason instanceof Error ? reason.stack ?? null : null,
      metadata: { source: "unhandledrejection" },
    });
  }

  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);

  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
    g.__unuiClientErrorCapture = false;
  };
}
