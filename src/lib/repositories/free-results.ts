import "server-only";

import { getDataMode } from "@/lib/repositories/data-mode";
import { createAdminClient } from "@/lib/supabase/admin";
import { mockStore, reloadMockStoreFromDisk } from "@/lib/mock-store";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/database.types";

export type FreeResult = Tables<"free_results">;

export async function getFreeResultById(id: string): Promise<FreeResult | null> {
  if (getDataMode() === "mock") {
    let row = mockStore.freeResults.get(id) ?? null;
    if (!row) {
      reloadMockStoreFromDisk();
      row = mockStore.freeResults.get(id) ?? null;
    }
    return row;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("free_results")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getFreeResultByGenerationKey(
  generationKey: string
): Promise<FreeResult | null> {
  if (getDataMode() === "mock") {
    for (const row of mockStore.freeResults.values()) {
      if (row.generation_key === generationKey) return row;
    }
    return null;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("free_results")
    .select("*")
    .eq("generation_key", generationKey)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createFreeResult(
  input: TablesInsert<"free_results">
): Promise<FreeResult> {
  if (getDataMode() === "mock") {
    if (input.generation_key) {
      const existing = await getFreeResultByGenerationKey(input.generation_key);
      if (existing) return existing;
    }
    const row: FreeResult = {
      id: crypto.randomUUID(),
      profile_id: input.profile_id,
      chart_id: input.chart_id,
      prompt_version_id: input.prompt_version_id ?? null,
      result_json: input.result_json ?? null,
      model: input.model ?? null,
      prompt_version: input.prompt_version ?? null,
      generation_status: input.generation_status ?? "PENDING",
      error_message: input.error_message ?? null,
      error_code: input.error_code ?? null,
      attempt_count: input.attempt_count ?? 0,
      input_tokens: input.input_tokens ?? null,
      output_tokens: input.output_tokens ?? null,
      total_tokens: input.total_tokens ?? null,
      provider_request_id: input.provider_request_id ?? null,
      generation_key: input.generation_key ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockStore.freeResults.set(row.id, row);
    return row;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("free_results")
    .insert(input)
    .select("*")
    .single();

  if (error) {
    if (input.generation_key && isUniqueViolation(error)) {
      const existing = await getFreeResultByGenerationKey(input.generation_key);
      if (existing) return existing;
    }
    throw error;
  }
  return data;
}

export async function updateFreeResult(
  id: string,
  input: TablesUpdate<"free_results">
): Promise<FreeResult> {
  if (getDataMode() === "mock") {
    const existing = mockStore.freeResults.get(id);
    if (!existing) throw new Error("Free result not found");
    const next: FreeResult = {
      ...existing,
      ...input,
      updated_at: new Date().toISOString(),
    } as FreeResult;
    mockStore.freeResults.set(id, next);
    return next;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("free_results")
    .update(input)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

function isUniqueViolation(error: { code?: string; message?: string }): boolean {
  return error.code === "23505" || /duplicate|unique/i.test(error.message ?? "");
}
