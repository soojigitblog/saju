import "server-only";

import { getDataMode } from "@/lib/repositories/data-mode";
import { createAdminClient } from "@/lib/supabase/admin";
import { mockStore } from "@/lib/mock-store";
import type { Json, Tables, TablesInsert } from "@/types/database.types";

export type ClientIssue = Tables<"client_issues">;
export type ClientIssueKind = ClientIssue["kind"];

export async function insertClientIssue(
  input: TablesInsert<"client_issues">
): Promise<ClientIssue> {
  if (getDataMode() === "mock") {
    const row: ClientIssue = {
      id: crypto.randomUUID(),
      kind: input.kind,
      guest_session_id: input.guest_session_id ?? null,
      analytics_session_id: input.analytics_session_id ?? null,
      path: input.path ?? null,
      user_agent: input.user_agent ?? null,
      message: input.message,
      details: input.details ?? null,
      metadata: (input.metadata ?? {}) as Json,
      created_at: new Date().toISOString(),
    };
    mockStore.clientIssues.set(row.id, row);
    return row;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("client_issues")
    .insert(input)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function listClientIssuesForAdmin(
  limit = 80
): Promise<ClientIssue[]> {
  if (getDataMode() === "mock") {
    return [...mockStore.clientIssues.values()]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limit);
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("client_issues")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}
