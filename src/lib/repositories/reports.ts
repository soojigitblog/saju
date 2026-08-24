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
      estimated_ai_cost_usd: input.estimated_ai_cost_usd ?? null,
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

export type AdminReportListRow = Report & {
  order_no?: string | null;
  product_name?: string | null;
};

/** Admin list — no result_json / PII bodies. */
export async function listReportsForAdmin(limit = 80): Promise<
  {
    id: string;
    order_id: string;
    order_no: string | null;
    product_name: string | null;
    generation_status: Report["generation_status"];
    model: string | null;
    error_code: string | null;
    attempt_count: number;
    created_at: string;
    generated_at: string | null;
    paid_at: string | null;
  }[]
> {
  if (getDataMode() === "mock") {
    const reports = [...mockStore.reports.values()];
    return reports
      .map((r) => {
        const order = mockStore.orders.get(r.order_id);
        return {
          id: r.id,
          order_id: r.order_id,
          order_no: order?.order_no ?? null,
          product_name: order?.product_name_snapshot ?? null,
          generation_status: r.generation_status,
          model: r.model,
          error_code: r.error_code,
          attempt_count: r.attempt_count,
          created_at: r.created_at,
          generated_at: r.generated_at,
          paid_at: order?.paid_at ?? null,
        };
      })
      .sort((a, b) => {
        const af = a.generation_status === "FAILED" ? 0 : 1;
        const bf = b.generation_status === "FAILED" ? 0 : 1;
        if (af !== bf) return af - bf;
        return b.created_at.localeCompare(a.created_at);
      })
      .slice(0, limit);
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("reports")
    .select(
      "id, order_id, generation_status, model, error_code, attempt_count, created_at, generated_at, orders(order_no, product_name_snapshot, paid_at)"
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;

  type Joined = {
    id: string;
    order_id: string;
    generation_status: Report["generation_status"];
    model: string | null;
    error_code: string | null;
    attempt_count: number;
    created_at: string;
    generated_at: string | null;
    orders:
      | {
          order_no: string;
          product_name_snapshot: string | null;
          paid_at: string | null;
        }
      | {
          order_no: string;
          product_name_snapshot: string | null;
          paid_at: string | null;
        }[]
      | null;
  };

  const rows = ((data ?? []) as unknown as Joined[]).map((r) => {
    const ord = Array.isArray(r.orders) ? r.orders[0] : r.orders;
    return {
      id: r.id,
      order_id: r.order_id,
      order_no: ord?.order_no ?? null,
      product_name: ord?.product_name_snapshot ?? null,
      generation_status: r.generation_status,
      model: r.model,
      error_code: r.error_code,
      attempt_count: r.attempt_count,
      created_at: r.created_at,
      generated_at: r.generated_at,
      paid_at: ord?.paid_at ?? null,
    };
  });

  return rows.sort((a, b) => {
    const af = a.generation_status === "FAILED" ? 0 : 1;
    const bf = b.generation_status === "FAILED" ? 0 : 1;
    if (af !== bf) return af - bf;
    return b.created_at.localeCompare(a.created_at);
  });
}
