import "server-only";

import { randomBytes } from "node:crypto";

/** 256-bit URL-safe token — not sequential, not guessable. */
export function createShareToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Validates token format before DB lookup (rejects sequential / numeric IDs). */
export function isValidShareToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{32,64}$/.test(token);
}
