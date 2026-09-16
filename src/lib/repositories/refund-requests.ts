import "server-only";

import { getDataMode } from "@/lib/repositories/data-mode";
import { createAdminClient } from "@/lib/supabase/admin";
import { mockStore } from "@/lib/mock-store";
import type { Tables, TablesInsert } from "@/types/database.types";

export type RefundRequestRow = Tables<"refund_requests">;

export async function insertRefundRequest(
  input: TablesInsert<"refund_requests">
): Promise<RefundRequestRow> {
  if (getDataMode() === "mock") {
    const row: RefundRequestRow = {
      id: crypto.randomUUID(),
      order_id: input.order_id,
      guest_session_id: input.guest_session_id ?? null,
      user_id: input.user_id ?? null,
      reason: input.reason,
      screenshot_data_url: input.screenshot_data_url ?? null,
      status: input.status ?? "PENDING",
      admin_note: null,
      decided_by: null,
      decided_at: null,
      created_at: new Date().toISOString(),
    };
    mockStore.refundRequests.set(row.id, row);
    return row;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("refund_requests")
    .insert(input)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/** Most recent PENDING request for an order, if any (blocks duplicate submits). */
export async function getPendingRefundRequestForOrder(
  orderId: string
): Promise<RefundRequestRow | null> {
  if (getDataMode() === "mock") {
    for (const row of mockStore.refundRequests.values()) {
      if (row.order_id === orderId && row.status === "PENDING") return row;
    }
    return null;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("refund_requests")
    .select("*")
    .eq("order_id", orderId)
    .eq("status", "PENDING")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getRefundRequestById(
  id: string
): Promise<RefundRequestRow | null> {
  if (getDataMode() === "mock") {
    return mockStore.refundRequests.get(id) ?? null;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("refund_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listRefundRequestsForAdmin(
  limit = 80
): Promise<RefundRequestRow[]> {
  if (getDataMode() === "mock") {
    return [...mockStore.refundRequests.values()]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limit);
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("refund_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function decideRefundRequest(input: {
  id: string;
  status: "APPROVED" | "REJECTED";
  adminNote: string | null;
  decidedBy: string | null;
}): Promise<RefundRequestRow> {
  const decided_at = new Date().toISOString();

  if (getDataMode() === "mock") {
    const existing = mockStore.refundRequests.get(input.id);
    if (!existing) throw new Error("Refund request not found");
    const next: RefundRequestRow = {
      ...existing,
      status: input.status,
      admin_note: input.adminNote,
      decided_by: input.decidedBy,
      decided_at,
    };
    mockStore.refundRequests.set(input.id, next);
    return next;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("refund_requests")
    .update({
      status: input.status,
      admin_note: input.adminNote,
      decided_by: input.decidedBy,
      decided_at,
    })
    .eq("id", input.id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}
