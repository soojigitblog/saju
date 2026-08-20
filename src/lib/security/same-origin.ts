import "server-only";

/**
 * Same-origin check for cookie-authenticated mutation endpoints.
 * Relies on SameSite=Lax guest cookie + Origin/Host match.
 * Assumes trusted reverse proxy (e.g. Vercel) for Host.
 */
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) {
    // Same-origin navigations / some clients omit Origin — allow when Host present
    // and Sec-Fetch-Site is same-origin or missing (non-browser).
    const site = request.headers.get("sec-fetch-site");
    if (!site || site === "same-origin" || site === "none") return;
    throw new Error("CROSS_ORIGIN");
  }

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new Error("CROSS_ORIGIN");
  }

  const host =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request.headers.get("host") ||
    "";

  if (!host || originHost !== host) {
    throw new Error("CROSS_ORIGIN");
  }
}
