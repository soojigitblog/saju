import "server-only";

import { createHash, randomBytes } from "node:crypto";

/** Issue raw access token once; store only the hash on orders. */
export function createOrderAccessToken(): {
  rawToken: string;
  tokenHash: string;
} {
  const rawToken = randomBytes(32).toString("base64url");
  return { rawToken, tokenHash: hashOrderAccessToken(rawToken) };
}

export function hashOrderAccessToken(rawToken: string): string {
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}
