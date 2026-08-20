import "server-only";

import { getDataMode } from "@/lib/repositories/data-mode";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/database.types";

export type Report = Tables<"reports">;

export async function getReportById(id: string): Promise<Report | null> {
  if (getDataMode() === "mock") {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
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
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
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
  if (getDataMode() === "mock") {
    return {
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
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  const existing = await getReportByOrderId(input.order_id);
  if (existing) return existing;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("reports")
    .insert(input)
    .select("*")
    .single();

  if (error) {
    // concurrent insert race → unique violation → re-read
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
    throw new Error("Report update requires Supabase configuration.");
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
