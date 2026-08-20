import "server-only";

import { getDataMode } from "@/lib/repositories/data-mode";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/database.types";

export type Order = Tables<"orders">;

/** Customer-safe order fields (no payment secrets). */
export type OrderPublicDTO = Pick<
  Order,
  | "id"
  | "order_no"
  | "profile_id"
  | "product_id"
  | "amount"
  | "status"
  | "paid_at"
  | "cancelled_at"
  | "refunded_at"
  | "created_at"
  | "updated_at"
>;

export function toOrderPublicDTO(order: Order): OrderPublicDTO {
  return {
    id: order.id,
    order_no: order.order_no,
    profile_id: order.profile_id,
    product_id: order.product_id,
    amount: order.amount,
    status: order.status,
    paid_at: order.paid_at,
    cancelled_at: order.cancelled_at,
    refunded_at: order.refunded_at,
    created_at: order.created_at,
    updated_at: order.updated_at,
  };
}

export async function getOrderById(id: string): Promise<Order | null> {
  if (getDataMode() === "mock") return null;

  const supabase = await createClient();
  const { data, error } = await supabase
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
  if (getDataMode() === "mock") return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("order_no", orderNo)
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
  if (getDataMode() === "mock") return mockOrder(input);

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
 * Does not treat guest_session_id as report authentication (use access_token_hash).
 */
export async function createGuestOrder(
  input: TablesInsert<"orders"> & { guest_session_id: string }
): Promise<Order> {
  if (getDataMode() === "mock") return mockOrder(input);

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
    throw new Error("Order update requires Supabase configuration.");
  }

  // Payment confirmation / status machine — trusted backend only.
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

export async function listOrdersForAdmin(limit = 50): Promise<Order[]> {
  if (getDataMode() === "mock") return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

/**
 * Attach guest order to auth user after identity verification (future login).
 */
export async function attachOrderToUser(input: {
  orderId: string;
  userId: string;
}): Promise<Order> {
  if (getDataMode() === "mock") {
    throw new Error("attachOrderToUser requires Supabase");
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

function mockOrder(input: TablesInsert<"orders">): Order {
  return {
    id: crypto.randomUUID(),
    order_no: input.order_no,
    user_id: input.user_id ?? null,
    guest_session_id: input.guest_session_id ?? null,
    profile_id: input.profile_id,
    product_id: input.product_id,
    amount: input.amount,
    status: input.status ?? "PENDING",
    access_token_hash: input.access_token_hash ?? null,
    paid_at: input.paid_at ?? null,
    cancelled_at: input.cancelled_at ?? null,
    refunded_at: input.refunded_at ?? null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}
