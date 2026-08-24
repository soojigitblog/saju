import "server-only";

import { redirect } from "next/navigation";
import {
  getCurrentAdminUser,
  isCurrentUserAdmin,
  type AdminUser,
} from "@/lib/repositories/roles";
import { FreeFlowError } from "@/lib/services/free-flow-errors";

/**
 * Server Component / layout gate. Redirects unauthenticated or non-admin users.
 */
export async function requireAdminPage(nextPath = "/admin/dashboard"): Promise<AdminUser> {
  const admin = await getCurrentAdminUser();
  if (!admin) {
    const q = encodeURIComponent(nextPath);
    redirect(`/admin/login?next=${q}`);
  }
  return admin;
}

/** API / Route Handler: throw 403 if not admin session. */
export async function requireAdminApi(): Promise<AdminUser> {
  const admin = await getCurrentAdminUser();
  if (!admin) {
    throw new FreeFlowError("FORBIDDEN", "관리자만 가능합니다.", 403);
  }
  return admin;
}

export async function assertIsAdmin(): Promise<boolean> {
  return isCurrentUserAdmin();
}
