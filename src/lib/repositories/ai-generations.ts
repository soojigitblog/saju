import "server-only";

import { getDataMode } from "@/lib/repositories/data-mode";
import { createAdminClient } from "@/lib/supabase/admin";
import { mockStore } from "@/lib/mock-store";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/database.types";

export type AiGeneration = Tables<"ai_generations">;

export async function getAiGenerationByKey(
  generationKey: string
): Promise<AiGeneration | null> {
  if (getDataMode() === "mock") {
    return mockStore.aiGenerations.get(generationKey) ?? null;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("ai_generations")
    .select("*")
    .eq("generation_key", generationKey)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createAiGeneration(
  input: TablesInsert<"ai_generations">
): Promise<AiGeneration> {
  if (getDataMode() === "mock") {
    const row: AiGeneration = {
      id: crypto.randomUUID(),
      generation_key: input.generation_key,
      result_type: input.result_type,
      profile_id: input.profile_id ?? null,
      chart_id: input.chart_id ?? null,
      order_id: input.order_id ?? null,
      prompt_version_id: input.prompt_version_id ?? null,
      engine_version: input.engine_version,
      provider_version: input.provider_version ?? null,
      provider: input.provider ?? "mock",
      model: input.model,
      status: input.status ?? "PENDING",
      input_tokens: input.input_tokens ?? null,
      output_tokens: input.output_tokens ?? null,
      total_tokens: input.total_tokens ?? null,
      provider_request_id: input.provider_request_id ?? null,
      error_code: input.error_code ?? null,
      error_message: input.error_message ?? null,
      attempt_count: input.attempt_count ?? 0,
      started_at: input.started_at ?? null,
      completed_at: input.completed_at ?? null,
      latency_ms: input.latency_ms ?? null,
      estimated_ai_cost_usd: input.estimated_ai_cost_usd ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockStore.aiGenerations.set(row.generation_key, row);
    mockStore.aiGenerations.set(row.id, row);
    return row;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("ai_generations")
    .insert(input)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateAiGeneration(
  id: string,
  input: TablesUpdate<"ai_generations">
): Promise<AiGeneration> {
  if (getDataMode() === "mock") {
    const existing = mockStore.aiGenerations.get(id);
    if (!existing) throw new Error("AI generation not found");
    const next = {
      ...existing,
      ...input,
      updated_at: new Date().toISOString(),
    } as AiGeneration;
    mockStore.aiGenerations.set(id, next);
    mockStore.aiGenerations.set(next.generation_key, next);
    return next;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("ai_generations")
    .update(input)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function listAiGenerationsForAdmin(opts?: {
  status?: "FAILED" | "COMPLETED" | "PENDING" | "GENERATING";
  limit?: number;
}): Promise<
  {
    id: string;
    result_type: string;
    provider: string | null;
    model: string;
    status: string;
    error_code: string | null;
    attempt_count: number;
    input_tokens: number | null;
    output_tokens: number | null;
    total_tokens: number | null;
    estimated_ai_cost_usd: number | null;
    latency_ms: number | null;
    created_at: string;
    completed_at: string | null;
  }[]
> {
  const limit = opts?.limit ?? 80;
  if (getDataMode() === "mock") {
    const seen = new Set<string>();
    const rows: AiGeneration[] = [];
    for (const g of mockStore.aiGenerations.values()) {
      if (seen.has(g.id)) continue;
      seen.add(g.id);
      if (opts?.status && g.status !== opts.status) continue;
      rows.push(g);
    }
    return rows
      .sort((a, b) => {
        const af = a.status === "FAILED" ? 0 : 1;
        const bf = b.status === "FAILED" ? 0 : 1;
        if (af !== bf) return af - bf;
        return b.created_at.localeCompare(a.created_at);
      })
      .slice(0, limit)
      .map((g) => ({
        id: g.id,
        result_type: g.result_type,
        provider: g.provider,
        model: g.model,
        status: g.status,
        error_code: g.error_code,
        attempt_count: g.attempt_count,
        input_tokens: g.input_tokens,
        output_tokens: g.output_tokens,
        total_tokens: g.total_tokens,
        estimated_ai_cost_usd: g.estimated_ai_cost_usd,
        latency_ms: g.latency_ms,
        created_at: g.created_at,
        completed_at: g.completed_at,
      }));
  }

  const admin = createAdminClient();
  let q = admin
    .from("ai_generations")
    .select(
      "id, result_type, provider, model, status, error_code, attempt_count, input_tokens, output_tokens, total_tokens, estimated_ai_cost_usd, latency_ms, created_at, completed_at"
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (opts?.status) q = q.eq("status", opts.status);
  const { data, error } = await q;
  if (error) throw error;

  return ((data ?? []) as AiGeneration[]).map((g) => ({
    id: g.id,
    result_type: g.result_type,
    provider: g.provider,
    model: g.model,
    status: g.status,
    error_code: g.error_code,
    attempt_count: g.attempt_count,
    input_tokens: g.input_tokens,
    output_tokens: g.output_tokens,
    total_tokens: g.total_tokens,
    estimated_ai_cost_usd: g.estimated_ai_cost_usd,
    latency_ms: g.latency_ms,
    created_at: g.created_at,
    completed_at: g.completed_at,
  }));
}
