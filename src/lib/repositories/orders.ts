import "server-only";

import { getDataMode } from "@/lib/repositories/data-mode";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mockStore } from "@/lib/mock-store";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/database.types";

export type Order = Tables<"orders">;

/** Customer-safe order fields (no payment secrets / guest ids). */
export type OrderPublicDTO = {
  id: string;
  orderNo: string;
  productId: string;
  productName: string | null;
  amount: number;
  currency: string;
  status: Order["status"];
  paymentMethod: "BANK_TRANSFER" | "TOSS";
  paidAt: string | null;
  createdAt: string;
  expiresAt: string | null;
};

export function toOrderPublicDTO(order: Order): OrderPublicDTO {
  return {
    id: order.id,
    orderNo: order.order_no,
    productId: order.product_id,
    productName: order.product_name_snapshot,
    amount: order.amount,
    currency: order.currency ?? "KRW",
    status: order.status,
    paymentMethod: order.payment_method ?? "BANK_TRANSFER",
    paidAt: order.paid_at,
    createdAt: order.created_at,
    expiresAt: order.expires_at ?? null,
  };
}

export async function getOrderById(id: string): Promise<Order | null> {
  if (getDataMode() === "mock") {
    return mockStore.orders.get(id) ?? null;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getOrderByOrderNo(
  orderNo: string
): Promise<Order | null> {
  if (getDataMode() === "mock") {
    for (const order of mockStore.orders.values()) {
      if (order.order_no === orderNo) return order;
    }
    return null;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("orders")
    .select("*")
    .eq("order_no", orderNo)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function findReusablePendingOrder(input: {
  guestSessionId: string;
  productId: string;
  sourceResultId: string;
  expectedAmount: number;
}): Promise<Order | null> {
  if (getDataMode() === "mock") {
    for (const order of mockStore.orders.values()) {
      if (
        order.guest_session_id === input.guestSessionId &&
        order.product_id === input.productId &&
        order.source_result_id === input.sourceResultId &&
        order.status === "PENDING" &&
        order.amount === input.expectedAmount
      ) {
        return order;
      }
    }
    return null;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("orders")
    .select("*")
    .eq("guest_session_id", input.guestSessionId)
    .eq("product_id", input.productId)
    .eq("source_result_id", input.sourceResultId)
    .eq("status", "PENDING")
    .eq("amount", input.expectedAmount)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Authenticated checkout — user client + RLS.
 * amount must be server-derived from products.sale_price (PHASE 6).
 */
export async function createAuthenticatedOrder(
  input: TablesInsert<"orders"> & { user_id: string }
): Promise<Order> {
  if (getDataMode() === "mock") return mockInsertOrder(input);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .insert(input)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/**
 * Guest checkout — Route Handler only, after validating guest_session_id cookie.
 */
export async function createGuestOrder(
  input: TablesInsert<"orders"> & { guest_session_id: string }
): Promise<Order> {
  if (getDataMode() === "mock") return mockInsertOrder(input);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("orders")
    .insert(input)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/** @deprecated Prefer createAuthenticatedOrder / createGuestOrder */
export async function createOrder(
  input: TablesInsert<"orders">
): Promise<Order> {
  if (input.user_id) {
    return createAuthenticatedOrder({ ...input, user_id: input.user_id });
  }
  if (!input.guest_session_id) {
    throw new Error("orders require user_id or guest_session_id");
  }
  return createGuestOrder({
    ...input,
    guest_session_id: input.guest_session_id,
  });
}

export async function updateOrder(
  id: string,
  input: TablesUpdate<"orders">
): Promise<Order> {
  if (getDataMode() === "mock") {
    const existing = mockStore.orders.get(id);
    if (!existing) throw new Error("Order not found");
    const next: Order = {
      ...existing,
      ...input,
      updated_at: new Date().toISOString(),
    } as Order;
    mockStore.orders.set(id, next);
    return next;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("orders")
    .update(input)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

/**
 * Atomic PENDING → PAID. Returns null if already transitioned (race).
 */
export async function markOrderPaidIfPending(input: {
  orderId: string;
  paidAt: string;
  accessTokenHash: string;
}): Promise<Order | null> {
  if (getDataMode() === "mock") {
    const existing = mockStore.orders.get(input.orderId);
    if (!existing) return null;
    if (existing.status !== "PENDING") return null;
    const next: Order = {
      ...existing,
      status: "PAID",
      paid_at: input.paidAt,
      access_token_hash: input.accessTokenHash,
      updated_at: new Date().toISOString(),
    };
    mockStore.orders.set(input.orderId, next);
    return next;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("orders")
    .update({
      status: "PAID",
      paid_at: input.paidAt,
      access_token_hash: input.accessTokenHash,
    })
    .eq("id", input.orderId)
    .eq("status", "PENDING")
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function listOrdersForAdmin(
  limit = 50,
  opts?: { status?: Order["status"]; orderNo?: string }
): Promise<Order[]> {
  if (getDataMode() === "mock") {
    let rows = [...mockStore.orders.values()];
    if (opts?.status) rows = rows.filter((o) => o.status === opts.status);
    if (opts?.orderNo?.trim()) {
      const q = opts.orderNo.trim().toLowerCase();
      rows = rows.filter((o) => o.order_no.toLowerCase().includes(q));
    }
    return rows
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limit);
  }

  const admin = createAdminClient();
  let q = admin
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (opts?.status) q = q.eq("status", opts.status);
  if (opts?.orderNo?.trim()) q = q.ilike("order_no", `%${opts.orderNo.trim()}%`);

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function attachOrderToUser(input: {
  orderId: string;
  userId: string;
}): Promise<Order> {
  if (getDataMode() === "mock") {
    return updateOrder(input.orderId, { user_id: input.userId });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("orders")
    .update({ user_id: input.userId })
    .eq("id", input.orderId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

function mockInsertOrder(input: TablesInsert<"orders">): Order {
  const now = new Date().toISOString();
  const order: Order = {
    id: crypto.randomUUID(),
    order_no: input.order_no,
    user_id: input.user_id ?? null,
    guest_session_id: input.guest_session_id ?? null,
    profile_id: input.profile_id,
    product_id: input.product_id,
    source_result_id: input.source_result_id ?? null,
    amount: input.amount,
    currency: input.currency ?? "KRW",
    product_name_snapshot: input.product_name_snapshot ?? null,
    payment_method: input.payment_method ?? "BANK_TRANSFER",
    depositor_name: input.depositor_name ?? null,
    depositor_name_normalized: input.depositor_name_normalized ?? null,
    expires_at: input.expires_at ?? null,
    status: input.status ?? "PENDING",
    access_token_hash: input.access_token_hash ?? null,
    paid_at: input.paid_at ?? null,
    payment_check_requested_at: input.payment_check_requested_at ?? null,
    payment_check_notified_at: input.payment_check_notified_at ?? null,
    cancelled_at: input.cancelled_at ?? null,
    refunded_at: input.refunded_at ?? null,
    created_at: now,
    updated_at: now,
  };
  mockStore.orders.set(order.id, order);
  return order;
}

export async function markPaymentCheckRequested(orderId: string): Promise<Order> {
  const at = new Date().toISOString();
  return updateOrder(orderId, { payment_check_requested_at: at });
}

export async function markPaymentCheckNotified(orderId: string): Promise<Order> {
  const at = new Date().toISOString();
  return updateOrder(orderId, { payment_check_notified_at: at });
}

const GUEST_VISIBLE_STATUSES = [
  "PENDING",
  "PAID",
  "GENERATING",
  "COMPLETED",
  "FAILED",
] as const satisfies readonly Order["status"][];

/** Guest session orders for /my-results — excludes other guests. */
export async function listOrdersForGuestSession(
  guestSessionId: string,
  limit = 30
): Promise<Order[]> {
  if (getDataMode() === "mock") {
    return [...mockStore.orders.values()]
      .filter(
        (o) =>
          o.guest_session_id === guestSessionId &&
          (GUEST_VISIBLE_STATUSES as readonly string[]).includes(o.status)
      )
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limit);
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("orders")
    .select("*")
    .eq("guest_session_id", guestSessionId)
    .in("status", [...GUEST_VISIBLE_STATUSES])
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function countPendingBankTransferOrders(): Promise<number> {
  if (getDataMode() === "mock") {
    return [...mockStore.orders.values()].filter(
      (o) =>
        o.status === "PENDING" &&
        (o.payment_method ?? "BANK_TRANSFER") === "BANK_TRANSFER"
    ).length;
  }

  const admin = createAdminClient();
  const { count, error } = await admin
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("status", "PENDING")
    .eq("payment_method", "BANK_TRANSFER");

  if (error) throw error;
  return count ?? 0;
}

export async function listPendingBankTransferOrders(): Promise<Order[]> {
  if (getDataMode() === "mock") {
    return [...mockStore.orders.values()]
      .filter(
        (o) =>
          o.status === "PENDING" &&
          (o.payment_method ?? "BANK_TRANSFER") === "BANK_TRANSFER"
      )
      .sort((a, b) => {
        const ar = a.payment_check_requested_at ?? "";
        const br = b.payment_check_requested_at ?? "";
        if (ar && !br) return -1;
        if (!ar && br) return 1;
        if (ar !== br) return br.localeCompare(ar);
        return b.created_at.localeCompare(a.created_at);
      });
  }
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("orders")
    .select("*")
    .eq("status", "PENDING")
    .eq("payment_method", "BANK_TRANSFER")
    .order("payment_check_requested_at", {
      ascending: false,
      nullsFirst: false,
    })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function expireStaleBankOrders(now = new Date()): Promise<number> {
  const iso = now.toISOString();
  if (getDataMode() === "mock") {
    let n = 0;
    for (const [id, o] of mockStore.orders) {
      if (
        o.status === "PENDING" &&
        o.payment_method === "BANK_TRANSFER" &&
        o.expires_at &&
        o.expires_at < iso
      ) {
        mockStore.orders.set(id, {
          ...o,
          status: "EXPIRED",
          updated_at: iso,
        });
        n += 1;
      }
    }
    return n;
  }
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("orders")
    .update({ status: "EXPIRED" })
    .eq("status", "PENDING")
    .eq("payment_method", "BANK_TRANSFER")
    .lt("expires_at", iso)
    .select("id");
  if (error) throw error;
  return data?.length ?? 0;
}
