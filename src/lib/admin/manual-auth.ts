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

  throw new FreeFlowError("FORBIDDEN", "관리자만 가능합니다.", 403);
}

function allowLegacyManualToken(request: Request): boolean {
  const testOrBypass =
    process.env.NODE_ENV === "test" ||
    (getDataMode() === "mock" && process.env.ADMIN_MANUAL_BYPASS === "1");

  if (!testOrBypass) return false;

  if (getDataMode() === "mock" && process.env.ADMIN_MANUAL_BYPASS === "1") {
    return true;
  }

  const token = request.headers.get("x-admin-manual-token");
  return Boolean(
    process.env.ADMIN_MANUAL_TOKEN && token === process.env.ADMIN_MANUAL_TOKEN
  );
}

/** @deprecated Use assertAdminRequest — kept for call-site migration. */
export async function assertAdminManualToken(request: Request): Promise<void> {
  await assertAdminRequest(request);
}
