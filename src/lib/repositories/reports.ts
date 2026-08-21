import "server-only";

import { getDataMode } from "@/lib/repositories/data-mode";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { mockStore } from "@/lib/mock-store";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/database.types";

export type Report = Tables<"reports">;

export async function getReportById(id: string): Promise<Report | null> {
  if (getDataMode() === "mock") {
    return mockStore.reports.get(id) ?? null;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("reports")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getReportByOrderId(
  orderId: string
): Promise<Report | null> {
  if (getDataMode() === "mock") {
    for (const r of mockStore.reports.values()) {
      if (r.order_id === orderId) return r;
    }
    return null;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("reports")
    .select("*")
    .eq("order_id", orderId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Idempotent create: unique(order_id) prevents duplicate AI generation rows.
 */
export async function createReportIfAbsent(
  input: TablesInsert<"reports">
): Promise<Report> {
  const existing = await getReportByOrderId(input.order_id);
  if (existing) return existing;

  if (getDataMode() === "mock") {
    const now = new Date().toISOString();
    const row: Report = {
      id: crypto.randomUUID(),
      order_id: input.order_id,
      profile_id: input.profile_id,
      product_id: input.product_id,
      prompt_version_id: input.prompt_version_id ?? null,
      prompt_version: input.prompt_version ?? null,
      model: input.model ?? null,
      result_json: input.result_json ?? null,
      html_url: input.html_url ?? null,
      pdf_url: input.pdf_url ?? null,
      generation_status: input.generation_status ?? "PENDING",
      error_message: input.error_message ?? null,
      error_code: input.error_code ?? null,
      attempt_count: input.attempt_count ?? 0,
      input_tokens: input.input_tokens ?? null,
      output_tokens: input.output_tokens ?? null,
      total_tokens: input.total_tokens ?? null,
      provider_request_id: input.provider_request_id ?? null,
      generation_key: input.generation_key ?? null,
      generated_at: input.generated_at ?? null,
      created_at: now,
      updated_at: now,
    };
    mockStore.reports.set(row.id, row);
    return row;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("reports")
    .insert(input)
    .select("*")
    .single();

  if (error) {
    const again = await getReportByOrderId(input.order_id);
    if (again) return again;
    throw error;
  }

  return data;
}

export async function updateReport(
  id: string,
  input: TablesUpdate<"reports">
): Promise<Report> {
  if (getDataMode() === "mock") {
    const existing = mockStore.reports.get(id);
    if (!existing) throw new Error("Report not found");
    const next = {
      ...existing,
      ...input,
      updated_at: new Date().toISOString(),
    } as Report;
    mockStore.reports.set(id, next);
    return next;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("reports")
    .update(input)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

/** Unused user client helper kept for authenticated report reads later. */
export async function getReportByIdForUser(
  id: string
): Promise<Report | null> {
  if (getDataMode() === "mock") return getReportById(id);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}
