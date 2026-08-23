import "server-only";

import { getDataMode } from "@/lib/repositories/data-mode";
import { FreeFlowError } from "@/lib/services/free-flow-errors";

/**
 * Validates admin manual bank operations (confirm deposit, retry report).
 * Requires x-admin-manual-token header matching ADMIN_MANUAL_TOKEN,
 * or ADMIN_MANUAL_BYPASS=1 in mock data mode (tests only).
 */
export function assertAdminManualToken(request: Request): void {
  const token = request.headers.get("x-admin-manual-token");
  const allowed =
    (process.env.ADMIN_MANUAL_TOKEN &&
      token === process.env.ADMIN_MANUAL_TOKEN) ||
    (getDataMode() === "mock" && process.env.ADMIN_MANUAL_BYPASS === "1");

  if (!allowed) {
    throw new FreeFlowError("FORBIDDEN", "관리자만 가능합니다.", 403);
  }
}
