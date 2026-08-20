"use client";

/**
 * Client analytics helper — posts to /api/analytics only.
 * Never writes to Supabase from the browser.
 * Dedupe: same eventName+path once per sessionStorage key.
 */

export function trackClientEvent(input: {
  eventName: string;
  path?: string;
  productId?: string;
  metadata?: Record<string, unknown>;
}) {
  if (typeof window === "undefined") return;

  const path = input.path ?? window.location.pathname;
  const dedupeKey = `analytics:${input.eventName}:${path}`;
  try {
    if (sessionStorage.getItem(dedupeKey)) return;
    sessionStorage.setItem(dedupeKey, "1");
  } catch {
    /* private mode */
  }

  const params = new URLSearchParams(window.location.search);
  const utm = {
    utm_source: params.get("utm_source") ?? undefined,
    utm_medium: params.get("utm_medium") ?? undefined,
    utm_campaign: params.get("utm_campaign") ?? undefined,
    utm_content: params.get("utm_content") ?? undefined,
    utm_term: params.get("utm_term") ?? undefined,
  };

  void fetch("/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventName: input.eventName,
      path,
      productId: input.productId,
      metadata: input.metadata,
      utm,
      referrer: document.referrer || null,
    }),
    keepalive: true,
  }).catch(() => {
    /* best effort */
  });
}
