import "server-only";

import { getDataMode } from "@/lib/repositories/data-mode";
import { createAdminClient } from "@/lib/supabase/admin";
import { mockStore } from "@/lib/mock-store";
import type { Tables, TablesInsert, TablesUpdate, Json } from "@/types/database.types";

export type Payment = Tables<"payments">;

/**
 * Payment provider records are server/admin only.
 * Never select this table from Client Components or public DTOs.
 */
export async function createPayment(
  input: TablesInsert<"payments">
): Promise<Payment> {
  if (getDataMode() === "mock") {
    return mockInsertPayment(input);
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("payments")
    .insert(input)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updatePayment(
  id: string,
  input: TablesUpdate<"payments">
): Promise<Payment> {
  if (getDataMode() === "mock") {
    const existing = mockStore.payments.get(id);
    if (!existing) throw new Error("Payment not found");
    const next = {
      ...existing,
      ...input,
      updated_at: new Date().toISOString(),
    } as Payment;
    mockStore.payments.set(id, next);
    return next;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("payments")
    .update(input)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function getPaymentsByOrderId(
  orderId: string
): Promise<Payment[]> {
  if (getDataMode() === "mock") {
    return [...mockStore.payments.values()]
      .filter((p) => p.order_id === orderId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("payments")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getPaymentByPaymentKey(
  paymentKey: string
): Promise<Payment | null> {
  if (getDataMode() === "mock") {
    for (const p of mockStore.payments.values()) {
      if (p.payment_key === paymentKey) return p;
    }
    return null;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("payments")
    .select("*")
    .eq("payment_key", paymentKey)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Insert payment; on unique(payment_key) race, re-read existing row.
 */
export async function createPaymentIdempotent(
  input: TablesInsert<"payments">
): Promise<{ payment: Payment; created: boolean }> {
  if (input.payment_key) {
    const existing = await getPaymentByPaymentKey(input.payment_key);
    if (existing) return { payment: existing, created: false };
  }

  try {
    const payment = await createPayment(input);
    return { payment, created: true };
  } catch (error) {
    if (input.payment_key) {
      const again = await getPaymentByPaymentKey(input.payment_key);
      if (again) return { payment: again, created: false };
    }
    throw error;
  }
}

function mockInsertPayment(input: TablesInsert<"payments">): Payment {
  if (input.payment_key) {
    for (const p of mockStore.payments.values()) {
      if (p.payment_key === input.payment_key) {
        const err = new Error("duplicate payment_key");
        throw err;
      }
    }
  }
  const now = new Date().toISOString();
  const payment: Payment = {
    id: crypto.randomUUID(),
    order_id: input.order_id,
    provider: input.provider ?? "TOSS",
    payment_key: input.payment_key ?? null,
    payment_method: input.payment_method ?? null,
    provider_status: input.provider_status ?? null,
    amount: input.amount,
    requested_amount: input.requested_amount ?? null,
    approved_amount: input.approved_amount ?? null,
    provider_order_id: input.provider_order_id ?? null,
    approved_at: input.approved_at ?? null,
    cancelled_at: input.cancelled_at ?? null,
    raw_response: (input.raw_response ?? {}) as Json,
    created_at: now,
    updated_at: now,
  };
  mockStore.payments.set(payment.id, payment);
  return payment;
}
