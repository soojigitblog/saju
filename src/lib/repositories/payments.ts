import "server-only";

import { getDataMode } from "@/lib/repositories/data-mode";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/database.types";

export type Payment = Tables<"payments">;

/**
 * Payment provider records are server/admin only.
 * Never select this table from Client Components or public DTOs.
 */
export async function createPayment(
  input: TablesInsert<"payments">
): Promise<Payment> {
  if (getDataMode() === "mock") {
    return {
      id: crypto.randomUUID(),
      order_id: input.order_id,
      provider: input.provider ?? "TOSS",
      payment_key: input.payment_key ?? null,
      payment_method: input.payment_method ?? null,
      provider_status: input.provider_status ?? null,
      amount: input.amount,
      approved_at: input.approved_at ?? null,
      cancelled_at: input.cancelled_at ?? null,
      raw_response: input.raw_response ?? {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
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
    throw new Error("Payment update requires Supabase configuration.");
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
  if (getDataMode() === "mock") return [];

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("payments")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}
