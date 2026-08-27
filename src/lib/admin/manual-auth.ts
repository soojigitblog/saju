import "server-only";

import { getDataMode } from "@/lib/repositories/data-mode";
import { getCurrentAdminUser, type AdminUser } from "@/lib/repositories/roles";
import { FreeFlowError } from "@/lib/services/free-flow-errors";

export type AdminAuthResult = {
  user: AdminUser | null;
  via: "session" | "legacy_token" | "test_bypass";
};

/**
 * Prefer Supabase Auth + ADMIN role.
 * Deprecated: x-admin-manual-token only when NODE_ENV=test (or mock + ADMIN_MANUAL_BYPASS).
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
  const sessionAdmin = await getCurrentAdminUser();
  if (sessionAdmin) {
    return { user: sessionAdmin, via: "session" };
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
  const token = request.headers.get("x-admin-manual-token");
  // Bypass must still send the admin header so customer requests stay customer.
  if (!token) return false;

  const appEnv = (process.env.APP_ENV ?? "").toLowerCase();
  const preliveDev =
    process.env.ADMIN_MANUAL_BYPASS === "1" &&
    (appEnv === "development" || appEnv === "local" || appEnv === "test");
  const mockBypass =
    getDataMode() === "mock" && process.env.ADMIN_MANUAL_BYPASS === "1";
  const testEnv = process.env.NODE_ENV === "test";

  if (!testEnv && !mockBypass && !preliveDev) return false;

  if (process.env.ADMIN_MANUAL_TOKEN) {
    return token === process.env.ADMIN_MANUAL_TOKEN;
  }
  // Bypass without a configured token: any non-empty x-admin-manual-token works.
  return mockBypass || preliveDev || testEnv;
}

/** @deprecated Use assertAdminRequest — kept for call-site migration. */
export async function assertAdminManualToken(request: Request): Promise<void> {
  await assertAdminRequest(request);
}
