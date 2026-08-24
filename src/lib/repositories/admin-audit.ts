import "server-only";

import { getDataMode } from "@/lib/repositories/data-mode";
import { createAdminClient } from "@/lib/supabase/admin";
import { mockStore } from "@/lib/mock-store";
import type { Json } from "@/types/database.types";

export type AdminAuditAction =
  | "BANK_CONFIRM"
  | "REPORT_RETRY"
  | "PRODUCT_STATUS"
  | (string & {});

export type AdminAuditRow = {
  id: string;
  admin_user_id: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  meta: Json;
  created_at: string;
};

/** Best-effort audit — never throws to caller flows. */
export async function writeAdminAudit(input: {
  adminUserId: string | null;
  action: AdminAuditAction;
  targetType: string;
  targetId?: string | null;
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    const now = new Date().toISOString();
    const row: AdminAuditRow = {
      id: crypto.randomUUID(),
      admin_user_id: input.adminUserId,
      action: input.action,
      target_type: input.targetType,
      target_id: input.targetId ?? null,
      meta: (input.meta ?? {}) as Json,
      created_at: now,
    };

    if (getDataMode() === "mock") {
      const store = mockStore as unknown as { adminAuditLogs?: AdminAuditRow[] };
      if (!store.adminAuditLogs) store.adminAuditLogs = [row];
      else store.adminAuditLogs.push(row);
      return;
    }

    const admin = createAdminClient();
    const { error } = await admin.from("admin_audit_logs").insert({
      id: row.id,
      admin_user_id: row.admin_user_id,
      action: row.action,
      target_type: row.target_type,
      target_id: row.target_id,
      meta: row.meta,
      created_at: row.created_at,
    });
    if (error) {
      console.error("[admin-audit] insert failed", { code: error.code });
    }
  } catch {
    console.error("[admin-audit] write failed");
  }
}

export async function listAdminAuditLogs(limit = 50): Promise<AdminAuditRow[]> {
  if (getDataMode() === "mock") {
    const bag =
      (mockStore as unknown as { adminAuditLogs?: AdminAuditRow[] })
        .adminAuditLogs ?? [];
    return [...bag].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, limit);
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("admin_audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as AdminAuditRow[];
}
