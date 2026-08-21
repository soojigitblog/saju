import "server-only";

import { getDataMode } from "@/lib/repositories/data-mode";
import { createAdminClient } from "@/lib/supabase/admin";
import { mockStore } from "@/lib/mock-store";
import type { FeedbackTargetType } from "@/lib/feedback/constants";

export type FeedbackRow = {
  id: string;
  guest_session_id: string;
  user_id: string | null;
  target_type: FeedbackTargetType;
  target_id: string;
  rating: number | null;
  tags: string[];
  more_fun_than_saju_alone: "YES" | "NO" | null;
  most_resonant: "SAJU" | "TAROT" | "CROSS" | "SIMILAR" | null;
  created_at: string;
  updated_at: string;
};

export type FeedbackUpsertInput = {
  guestSessionId: string;
  userId?: string | null;
  targetType: FeedbackTargetType;
  targetId: string;
  rating?: number | null;
  tags?: string[];
  moreFunThanSajuAlone?: "YES" | "NO" | null;
  mostResonant?: "SAJU" | "TAROT" | "CROSS" | "SIMILAR" | null;
};

/** Untyped until db:types after migration 0010 — keep parity with tarot-readings. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function adminDb(): any {
  return createAdminClient();
}

function mockKey(
  guestSessionId: string,
  targetType: FeedbackTargetType,
  targetId: string
) {
  return `${guestSessionId}:${targetType}:${targetId}`;
}

export async function getFeedbackByGuestTarget(input: {
  guestSessionId: string;
  targetType: FeedbackTargetType;
  targetId: string;
}): Promise<FeedbackRow | null> {
  if (getDataMode() === "mock") {
    return (
      mockStore.feedbacks.get(
        mockKey(input.guestSessionId, input.targetType, input.targetId)
      ) ?? null
    );
  }

  const { data, error } = await adminDb()
    .from("feedbacks")
    .select("*")
    .eq("guest_session_id", input.guestSessionId)
    .eq("target_type", input.targetType)
    .eq("target_id", input.targetId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data) : null;
}

export async function upsertFeedback(
  input: FeedbackUpsertInput
): Promise<FeedbackRow> {
  const now = new Date().toISOString();
  const existing = await getFeedbackByGuestTarget({
    guestSessionId: input.guestSessionId,
    targetType: input.targetType,
    targetId: input.targetId,
  });

  if (existing) {
    const updated: FeedbackRow = {
      ...existing,
      user_id: input.userId !== undefined ? input.userId : existing.user_id,
      rating: input.rating !== undefined ? input.rating : existing.rating,
      tags: input.tags !== undefined ? input.tags : existing.tags,
      more_fun_than_saju_alone:
        input.moreFunThanSajuAlone !== undefined
          ? input.moreFunThanSajuAlone
          : existing.more_fun_than_saju_alone,
      most_resonant:
        input.mostResonant !== undefined
          ? input.mostResonant
          : existing.most_resonant,
      updated_at: now,
    };

    if (getDataMode() === "mock") {
      mockStore.feedbacks.set(
        mockKey(input.guestSessionId, input.targetType, input.targetId),
        updated
      );
      return updated;
    }

    const { data, error } = await adminDb()
      .from("feedbacks")
      .update({
        user_id: updated.user_id,
        rating: updated.rating,
        tags: updated.tags,
        more_fun_than_saju_alone: updated.more_fun_than_saju_alone,
        most_resonant: updated.most_resonant,
        updated_at: now,
      })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw error;
    return mapRow(data);
  }

  const row: FeedbackRow = {
    id: crypto.randomUUID(),
    guest_session_id: input.guestSessionId,
    user_id: input.userId ?? null,
    target_type: input.targetType,
    target_id: input.targetId,
    rating: input.rating ?? null,
    tags: input.tags ?? [],
    more_fun_than_saju_alone: input.moreFunThanSajuAlone ?? null,
    most_resonant: input.mostResonant ?? null,
    created_at: now,
    updated_at: now,
  };

  if (getDataMode() === "mock") {
    mockStore.feedbacks.set(
      mockKey(input.guestSessionId, input.targetType, input.targetId),
      row
    );
    return row;
  }

  const { data, error } = await adminDb()
    .from("feedbacks")
    .insert({
      id: row.id,
      guest_session_id: row.guest_session_id,
      user_id: row.user_id,
      target_type: row.target_type,
      target_id: row.target_id,
      rating: row.rating,
      tags: row.tags,
      more_fun_than_saju_alone: row.more_fun_than_saju_alone,
      most_resonant: row.most_resonant,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapRow(data);
}

function mapRow(data: Record<string, unknown>): FeedbackRow {
  return {
    id: data.id as string,
    guest_session_id: data.guest_session_id as string,
    user_id: (data.user_id as string | null) ?? null,
    target_type: data.target_type as FeedbackTargetType,
    target_id: data.target_id as string,
    rating: (data.rating as number | null) ?? null,
    tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
    more_fun_than_saju_alone:
      (data.more_fun_than_saju_alone as FeedbackRow["more_fun_than_saju_alone"]) ??
      null,
    most_resonant:
      (data.most_resonant as FeedbackRow["most_resonant"]) ?? null,
    created_at: data.created_at as string,
    updated_at: data.updated_at as string,
  };
}
