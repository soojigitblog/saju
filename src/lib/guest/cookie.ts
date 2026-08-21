import "server-only";

import { cookies } from "next/headers";
import { createGuestSessionId } from "@/lib/guest/session";

export const GUEST_SESSION_COOKIE = "fortune_guest_session";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 180; // 180 days

/**
 * `next start` sets NODE_ENV=production. Local/tunnel friend tests keep
 * APP_ENV=development — Secure cookies then fail on http://localhost and can
 * be dropped by some reverse-proxy setups. Real deploys keep Secure.
 */
function shouldUseSecureCookies(): boolean {
  if (process.env.NODE_ENV !== "production") return false;
  const appEnv = (process.env.APP_ENV ?? "").toLowerCase();
  if (appEnv === "development" || appEnv === "local" || appEnv === "test") {
    return false;
  }
  return true;
}

export async function getGuestSessionId(): Promise<string | undefined> {
  const jar = await cookies();
  const value = jar.get(GUEST_SESSION_COOKIE)?.value?.trim();
  return value || undefined;
}

/**
 * Read existing guest cookie or mint a new HttpOnly session id.
 */
export async function ensureGuestSessionId(): Promise<string> {
  const existing = await getGuestSessionId();
  if (existing && isUuid(existing)) return existing;

  const id = createGuestSessionId();
  const jar = await cookies();
  jar.set(GUEST_SESSION_COOKIE, id, {
    httpOnly: true,
    secure: shouldUseSecureCookies(),
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  return id;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}
