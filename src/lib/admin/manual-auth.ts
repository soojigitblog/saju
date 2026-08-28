import "server-only";

import { timingSafeEqual } from "node:crypto";
import { getDataMode } from "@/lib/repositories/data-mode";
import { getCurrentAdminUser, type AdminUser } from "@/lib/repositories/roles";
import { FreeFlowError } from "@/lib/services/free-flow-errors";

export type AdminAuthResult = {
  user: AdminUser | null;
  via: "session" | "legacy_token" | "test_bypass";
};

/** Weak tokens must never succeed — even if accidentally configured. */
const WEAK_MANUAL_TOKENS = new Set([
  "",
  "default",
  "test",
  "smoke",
  "admin",
  "password",
  "secret",
  "token",
]);

/**
 * Explicit internal QA runner (CLI smoke, vitest).
 * Never inferred from cookies() failure alone.
 */
export function isInternalAdminQaRunner(): boolean {
  if (process.env.NODE_ENV === "test") return true;
  return (
    process.env.ALLOW_INTERNAL_ADMIN_QA === "1" &&
    process.env.INTERNAL_ADMIN_QA_RUNNER === "1"
  );
}

function isWeakManualToken(token: string | null | undefined): boolean {
  if (!token?.trim()) return true;
  return WEAK_MANUAL_TOKENS.has(token.trim().toLowerCase());
}

function manualTokensEqual(expected: string, provided: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function isCookiesOutsideRequestScope(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return msg.includes("cookies") && msg.includes("request scope");
}

/**
 * Prefer Supabase Auth + ADMIN role.
 * Legacy x-admin-manual-token: test / prelive dev / explicit internal runner only.
 * Production UI must not collect ADMIN_MANUAL_TOKEN.
 */
export async function assertAdminRequest(
  request: Request
): Promise<AdminAuthResult> {
  const result = await tryAdminRequest(request);
  if (result) return result;
  throw new FreeFlowError("FORBIDDEN", "관리자만 가능합니다.", 403);
}

/** Non-throwing admin check — used when route supports customer OR admin. */
export async function tryAdminRequest(
  request: Request
): Promise<AdminAuthResult | null> {
  let sessionAdmin: AdminUser | null = null;
  let sessionLookupFailedOutsideScope = false;

  try {
    sessionAdmin = await getCurrentAdminUser();
  } catch (error) {
    if (isCookiesOutsideRequestScope(error)) {
      sessionLookupFailedOutsideScope = true;
    } else if (!isInternalAdminQaRunner()) {
      return null;
    }
  }

  if (sessionAdmin) {
    return { user: sessionAdmin, via: "session" };
  }

  // cookies() failure must NOT auto-grant admin on HTTP/production paths.
  if (sessionLookupFailedOutsideScope && !isInternalAdminQaRunner()) {
    return null;
  }

  if (allowLegacyManualToken(request)) {
    return {
      user: null,
      via:
        getDataMode() === "mock" && process.env.ADMIN_MANUAL_BYPASS === "1"
          ? "test_bypass"
          : "legacy_token",
    };
  }

  return null;
}

function allowLegacyManualToken(request: Request): boolean {
  const headerToken = request.headers.get("x-admin-manual-token")?.trim();
  if (!headerToken || isWeakManualToken(headerToken)) return false;

  const configured = process.env.ADMIN_MANUAL_TOKEN?.trim();
  if (!configured || isWeakManualToken(configured)) return false;
  if (!manualTokensEqual(configured, headerToken)) return false;

  const appEnv = (process.env.APP_ENV ?? "").toLowerCase();
  const preliveDev =
    process.env.ADMIN_MANUAL_BYPASS === "1" &&
    (appEnv === "development" || appEnv === "local" || appEnv === "test");
  const mockBypass =
    getDataMode() === "mock" && process.env.ADMIN_MANUAL_BYPASS === "1";
  const testEnv = process.env.NODE_ENV === "test";
  const internalRunner = isInternalAdminQaRunner();

  if (!testEnv && !mockBypass && !preliveDev && !internalRunner) return false;

  return true;
}

/** @deprecated Use assertAdminRequest — kept for call-site migration. */
export async function assertAdminManualToken(request: Request): Promise<void> {
  await assertAdminRequest(request);
}
