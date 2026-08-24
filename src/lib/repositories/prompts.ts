import "server-only";

import { getDataMode } from "@/lib/repositories/data-mode";
import { createClient } from "@/lib/supabase/server";
import type { Tables, TablesInsert } from "@/types/database.types";

export type PromptDefinition = Tables<"prompt_definitions">;
export type PromptVersion = Tables<"prompt_versions">;

export async function listPromptDefinitions(): Promise<PromptDefinition[]> {
  if (getDataMode() === "mock") {
    return [
      {
        id: "11111111-1111-1111-1111-111111111101",
        name: "종합 사주 리포트",
        slug: "2026-total",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "11111111-1111-1111-1111-111111111102",
        name: "재물운 집중분석",
        slug: "money",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "11111111-1111-1111-1111-111111111103",
        name: "직장·이직운",
        slug: "career",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "11111111-1111-1111-1111-111111111104",
        name: "연애운",
        slug: "love",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prompt_definitions")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function listPromptVersions(
  definitionId: string
): Promise<PromptVersion[]> {
  if (getDataMode() === "mock") {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prompt_versions")
    .select("*")
    .eq("prompt_definition_id", definitionId)
    .order("version", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getActivePromptVersion(
  definitionId: string
): Promise<PromptVersion | null> {
  if (getDataMode() === "mock") {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prompt_versions")
    .select("*")
    .eq("prompt_definition_id", definitionId)
    .eq("status", "ACTIVE")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createPromptDefinition(
  input: TablesInsert<"prompt_definitions">
): Promise<PromptDefinition> {
  if (getDataMode() === "mock") {
    throw new Error("Prompt create requires Supabase configuration.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prompt_definitions")
    .insert(input)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function createPromptVersion(
  input: TablesInsert<"prompt_versions">
): Promise<PromptVersion> {
  if (getDataMode() === "mock") {
    throw new Error("Prompt version create requires Supabase configuration.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prompt_versions")
    .insert(input)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
