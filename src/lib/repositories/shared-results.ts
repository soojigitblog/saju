import "server-only";

import { getDataMode } from "@/lib/repositories/data-mode";
import { createAdminClient } from "@/lib/supabase/admin";
import { mockStore } from "@/lib/mock-store";
import type { Json } from "@/types/database.types";
import type { ShareSnapshot } from "@/lib/dto/share-public";

export type SharedResultRow = {
  id: string;
  share_token: string;
  resource_type: "FREE_RESULT" | "TAROT_READING";
  resource_id: string;
  snapshot_json: ShareSnapshot;
  display_nickname: string | null;
  display_birth_year_label: string | null;
  revoked_at: string | null;
  expires_at: string | null;
  created_at: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function adminDb(): any {
  return createAdminClient();
}

export async function getSharedResultByToken(
  shareToken: string
): Promise<SharedResultRow | null> {
  if (getDataMode() === "mock") {
    for (const row of mockStore.sharedResults.values()) {
      if (row.share_token === shareToken) return row;
    }
    return null;
  }

  const { data, error } = await adminDb()
    .from("shared_results")
    .select("*")
    .eq("share_token", shareToken)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data) : null;
}

export async function getActiveShareForResource(input: {
  resourceType: "FREE_RESULT" | "TAROT_READING";
  resourceId: string;
}): Promise<SharedResultRow | null> {
  if (getDataMode() === "mock") {
    for (const row of mockStore.sharedResults.values()) {
      if (
        row.resource_type === input.resourceType &&
        row.resource_id === input.resourceId &&
        !row.revoked_at
      ) {
        return row;
      }
    }
    return null;
  }

  const { data, error } = await adminDb()
    .from("shared_results")
    .select("*")
    .eq("resource_type", input.resourceType)
    .eq("resource_id", input.resourceId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data) : null;
}

export async function createSharedResult(input: {
  shareToken: string;
  resourceType: "FREE_RESULT" | "TAROT_READING";
  resourceId: string;
  snapshot: ShareSnapshot;
  displayNickname: string;
  displayBirthYearLabel: string | null;
}): Promise<SharedResultRow> {
  const now = new Date().toISOString();
  const row: SharedResultRow = {
    id: crypto.randomUUID(),
    share_token: input.shareToken,
    resource_type: input.resourceType,
    resource_id: input.resourceId,
    snapshot_json: input.snapshot,
    display_nickname: input.displayNickname,
    display_birth_year_label: input.displayBirthYearLabel,
    revoked_at: null,
    expires_at: null,
    created_at: now,
  };

  if (getDataMode() === "mock") {
    mockStore.sharedResults.set(row.id, row);
    return row;
  }

  const { data, error } = await adminDb()
    .from("shared_results")
    .insert({
      id: row.id,
      share_token: row.share_token,
      resource_type: row.resource_type,
      resource_id: row.resource_id,
      snapshot_json: row.snapshot_json as unknown as Json,
      display_nickname: row.display_nickname,
      display_birth_year_label: row.display_birth_year_label,
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapRow(data);
}

function mapRow(data: Record<string, unknown>): SharedResultRow {
  return {
    id: data.id as string,
    share_token: data.share_token as string,
    resource_type: data.resource_type as "FREE_RESULT" | "TAROT_READING",
    resource_id: data.resource_id as string,
    snapshot_json: data.snapshot_json as ShareSnapshot,
    display_nickname: (data.display_nickname as string | null) ?? null,
    display_birth_year_label: (data.display_birth_year_label as string | null) ?? null,
    revoked_at: (data.revoked_at as string | null) ?? null,
    expires_at: (data.expires_at as string | null) ?? null,
    created_at: data.created_at as string,
  };
}
