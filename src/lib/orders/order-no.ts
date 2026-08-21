import "server-only";

import { randomBytes } from "node:crypto";

/**
 * Display + Toss orderId.
 * Toss: 6–64 chars, [A-Za-z0-9-_].
 * Not an auth credential — ownership is guest_session / access_token.
 */
export function createOrderNo(now = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  const suffix = randomBytes(4).toString("hex").toUpperCase();
  return `ORD-${y}${m}${d}-${suffix}`;
}
