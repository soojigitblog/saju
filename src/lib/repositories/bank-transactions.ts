import "server-only";

import { getDataMode } from "@/lib/repositories/data-mode";
import { createAdminClient } from "@/lib/supabase/admin";
import { mockStore } from "@/lib/mock-store";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/database.types";

export type BankTransactionRow = Tables<"bank_transactions">;

export async function getBankTransactionByFingerprint(
  fingerprint: string
): Promise<BankTransactionRow | null> {
  if (getDataMode() === "mock") {
    for (const row of mockStore.bankTransactions.values()) {
      if (row.fingerprint === fingerprint) return row;
    }
    return null;
  }
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("bank_transactions")
    .select("*")
    .eq("fingerprint", fingerprint)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function insertBankTransactionIfAbsent(
  input: TablesInsert<"bank_transactions">
): Promise<{ row: BankTransactionRow; created: boolean }> {
  const existing = await getBankTransactionByFingerprint(input.fingerprint);
  if (existing) return { row: existing, created: false };

  if (getDataMode() === "mock") {
    const now = new Date().toISOString();
    const row: BankTransactionRow = {
      id: crypto.randomUUID(),
      provider: input.provider ?? "HANA",
      external_transaction_id: input.external_transaction_id ?? null,
      fingerprint: input.fingerprint,
      occurred_at: input.occurred_at,
      amount: input.amount,
      depositor_name_masked: input.depositor_name_masked ?? null,
      match_status: input.match_status ?? "UNMATCHED",
      matched_order_id: input.matched_order_id ?? null,
      manual_approved_by: input.manual_approved_by ?? null,
      manual_approved_at: input.manual_approved_at ?? null,
      manual_reason: input.manual_reason ?? null,
      created_at: now,
      updated_at: now,
    };
    mockStore.bankTransactions.set(row.id, row);
    return { row, created: true };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("bank_transactions")
    .insert(input)
    .select("*")
    .single();
  if (error) {
    const again = await getBankTransactionByFingerprint(input.fingerprint);
    if (again) return { row: again, created: false };
    throw error;
  }
  return { row: data, created: true };
}

export async function updateBankTransaction(
  id: string,
  input: TablesUpdate<"bank_transactions">
): Promise<BankTransactionRow> {
  if (getDataMode() === "mock") {
    const existing = mockStore.bankTransactions.get(id);
    if (!existing) throw new Error("bank tx not found");
    const next = {
      ...existing,
      ...input,
      updated_at: new Date().toISOString(),
    } as BankTransactionRow;
    mockStore.bankTransactions.set(id, next);
    return next;
  }
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("bank_transactions")
    .update(input)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function listBankTransactionsForAdmin(
  limit = 50
): Promise<BankTransactionRow[]> {
  if (getDataMode() === "mock") {
    return [...mockStore.bankTransactions.values()]
      .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))
      .slice(0, limit);
  }
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("bank_transactions")
    .select("*")
    .order("occurred_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export type BankPollerHealthStatus =
  | "IDLE"
  | "RUNNING"
  | "ERROR"
  | "SESSION_EXPIRED";

export async function upsertBankPollerHealth(input: {
  status: BankPollerHealthStatus;
  lastSuccessAt?: string | null;
  /** Pass `null` to clear; omit to preserve previous value */
  lastErrorSafe?: string | null;
  lastFetchedCount?: number;
  lastMatchedCount?: number;
  lastAmbiguousCount?: number;
}): Promise<void> {
  const prev = getDataMode() === "mock" ? mockStore.bankPollerHealth : null;

  if (getDataMode() === "mock") {
    const clearError = Object.prototype.hasOwnProperty.call(input, "lastErrorSafe");
    mockStore.bankPollerHealth = {
      id: "hana",
      status: input.status,
      last_success_at:
        input.lastSuccessAt !== undefined
          ? input.lastSuccessAt
          : (prev?.last_success_at ?? null),
      last_error_safe: clearError
        ? (input.lastErrorSafe ?? null)
        : (prev?.last_error_safe ?? null),
      last_fetched_count:
        input.lastFetchedCount ?? prev?.last_fetched_count ?? 0,
      last_matched_count:
        input.lastMatchedCount ?? prev?.last_matched_count ?? 0,
      last_ambiguous_count:
        input.lastAmbiguousCount ?? prev?.last_ambiguous_count ?? 0,
      updated_at: new Date().toISOString(),
    };
    return;
  }

  const admin = createAdminClient();
  const existing = await getBankPollerHealth();
  const clearError = Object.prototype.hasOwnProperty.call(input, "lastErrorSafe");

  await admin.from("bank_poller_health").upsert({
    id: "hana",
    status: input.status,
    last_success_at:
      input.lastSuccessAt !== undefined
        ? input.lastSuccessAt
        : (existing?.last_success_at ?? null),
    last_error_safe: clearError
      ? (input.lastErrorSafe ?? null)
      : (existing?.last_error_safe ?? null),
    last_fetched_count:
      input.lastFetchedCount ?? existing?.last_fetched_count ?? 0,
    last_matched_count:
      input.lastMatchedCount ?? existing?.last_matched_count ?? 0,
    last_ambiguous_count:
      input.lastAmbiguousCount ?? existing?.last_ambiguous_count ?? 0,
    updated_at: new Date().toISOString(),
  });
}

export async function getBankPollerHealth() {
  if (getDataMode() === "mock") {
    return mockStore.bankPollerHealth;
  }
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("bank_poller_health")
    .select("*")
    .eq("id", "hana")
    .maybeSingle();
  if (error) throw error;
  return data;
}
