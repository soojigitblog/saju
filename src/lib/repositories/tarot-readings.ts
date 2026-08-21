import "server-only";

import { getDataMode } from "@/lib/repositories/data-mode";
import { createAdminClient } from "@/lib/supabase/admin";
import { mockStore } from "@/lib/mock-store";
import type { DrawnCard, ShuffledDeckSlot } from "@/lib/tarot/types";
import type { Json } from "@/types/database.types";

export type TarotReadingStatus =
  | "PENDING"
  | "DRAWN"
  | "GENERATING"
  | "COMPLETED"
  | "FAILED";

export type TarotReadingRow = {
  id: string;
  guest_session_id: string;
  profile_id: string | null;
  fortune_chart_id: string;
  free_result_id: string | null;
  question_category: string;
  question_text: string | null;
  spread_type: string;
  shuffled_deck: ShuffledDeckSlot[];
  presentation_slots: Array<{ slotIndex: number; cardId: string }>;
  generation_status: TarotReadingStatus;
  result_json: Json | null;
  model: string | null;
  prompt_version: string | null;
  prompt_version_id: string | null;
  generation_key: string | null;
  error_code: string | null;
  error_message: string | null;
  attempt_count: number;
  feedback_score: number | null;
  feedback_label: string | null;
  created_at: string;
  updated_at: string;
};

export type TarotDrawRow = {
  id: string;
  reading_id: string;
  position_index: number;
  position: string;
  card_id: string;
  card_slug: string;
  orientation: string;
  created_at: string;
};

/** Untyped until `npm run db:types` after migration 0009. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function adminDb(): any {
  return createAdminClient();
}

export async function createTarotReading(input: {
  guestSessionId: string;
  profileId: string | null;
  fortuneChartId: string;
  freeResultId: string | null;
  questionCategory: string;
  questionText: string | null;
  shuffledDeck: ShuffledDeckSlot[];
  presentationSlots: Array<{ slotIndex: number; cardId: string }>;
}): Promise<TarotReadingRow> {
  const now = new Date().toISOString();
  const row: TarotReadingRow = {
    id: crypto.randomUUID(),
    guest_session_id: input.guestSessionId,
    profile_id: input.profileId,
    fortune_chart_id: input.fortuneChartId,
    free_result_id: input.freeResultId,
    question_category: input.questionCategory,
    question_text: input.questionText,
    spread_type: "THREE_ADVICE",
    shuffled_deck: input.shuffledDeck,
    presentation_slots: input.presentationSlots,
    generation_status: "PENDING",
    result_json: null,
    model: null,
    prompt_version: null,
    prompt_version_id: null,
    generation_key: null,
    error_code: null,
    error_message: null,
    attempt_count: 0,
    feedback_score: null,
    feedback_label: null,
    created_at: now,
    updated_at: now,
  };

  if (getDataMode() === "mock") {
    mockStore.tarotReadings.set(row.id, row);
    return row;
  }

  const { data, error } = await adminDb()
    .from("tarot_readings")
    .insert({
      id: row.id,
      guest_session_id: row.guest_session_id,
      profile_id: row.profile_id,
      fortune_chart_id: row.fortune_chart_id,
      free_result_id: row.free_result_id,
      question_category: row.question_category,
      question_text: row.question_text,
      spread_type: row.spread_type,
      shuffled_deck: row.shuffled_deck,
      presentation_slots: row.presentation_slots,
      generation_status: row.generation_status,
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapReading(data);
}

export async function getTarotReadingById(
  id: string
): Promise<TarotReadingRow | null> {
  if (getDataMode() === "mock") {
    return mockStore.tarotReadings.get(id) ?? null;
  }
  const { data, error } = await adminDb()
    .from("tarot_readings")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapReading(data) : null;
}

export async function updateTarotReading(
  id: string,
  patch: Partial<TarotReadingRow>
): Promise<TarotReadingRow> {
  if (getDataMode() === "mock") {
    const existing = mockStore.tarotReadings.get(id);
    if (!existing) throw new Error("Tarot reading not found");
    const next = {
      ...existing,
      ...patch,
      updated_at: new Date().toISOString(),
    };
    mockStore.tarotReadings.set(id, next);
    return next;
  }

  const { data, error } = await adminDb()
    .from("tarot_readings")
    .update({
      generation_status: patch.generation_status,
      result_json: patch.result_json,
      model: patch.model,
      prompt_version: patch.prompt_version,
      prompt_version_id: patch.prompt_version_id,
      generation_key: patch.generation_key,
      error_code: patch.error_code,
      error_message: patch.error_message,
      attempt_count: patch.attempt_count,
      feedback_score: patch.feedback_score,
      feedback_label: patch.feedback_label,
      shuffled_deck: patch.shuffled_deck,
      presentation_slots: patch.presentation_slots,
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return mapReading(data);
}

export async function replaceTarotDraws(
  readingId: string,
  draws: DrawnCard[]
): Promise<TarotDrawRow[]> {
  const now = new Date().toISOString();
  const rows: TarotDrawRow[] = draws.map((d) => ({
    id: crypto.randomUUID(),
    reading_id: readingId,
    position_index: d.positionIndex,
    position: d.position,
    card_id: d.cardId,
    card_slug: d.slug,
    orientation: d.orientation,
    created_at: now,
  }));

  if (getDataMode() === "mock") {
    mockStore.tarotDraws.set(readingId, rows);
    return rows;
  }

  const db = adminDb();
  await db.from("tarot_draws").delete().eq("reading_id", readingId);
  const { data, error } = await db
    .from("tarot_draws")
    .insert(
      rows.map((r) => ({
        id: r.id,
        reading_id: r.reading_id,
        position_index: r.position_index,
        position: r.position,
        card_id: r.card_id,
        card_slug: r.card_slug,
        orientation: r.orientation,
      }))
    )
    .select("*");
  if (error) throw error;
  return (data ?? []).map(mapDraw);
}

export async function listTarotDraws(
  readingId: string
): Promise<TarotDrawRow[]> {
  if (getDataMode() === "mock") {
    return mockStore.tarotDraws.get(readingId) ?? [];
  }
  const { data, error } = await adminDb()
    .from("tarot_draws")
    .select("*")
    .eq("reading_id", readingId)
    .order("position_index", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapDraw);
}

export async function countCompletedTarotForGuest(
  guestSessionId: string,
  windowSeconds: number
): Promise<number> {
  const since = new Date(Date.now() - windowSeconds * 1000).toISOString();
  if (getDataMode() === "mock") {
    let n = 0;
    for (const r of mockStore.tarotReadings.values()) {
      if (
        r.guest_session_id === guestSessionId &&
        r.generation_status === "COMPLETED" &&
        r.created_at >= since
      ) {
        n += 1;
      }
    }
    return n;
  }

  const { count, error } = await adminDb()
    .from("tarot_readings")
    .select("id", { count: "exact", head: true })
    .eq("guest_session_id", guestSessionId)
    .eq("generation_status", "COMPLETED")
    .gte("created_at", since);
  if (error) throw error;
  return count ?? 0;
}

function mapReading(data: Record<string, unknown>): TarotReadingRow {
  return {
    id: data.id as string,
    guest_session_id: data.guest_session_id as string,
    profile_id: (data.profile_id as string | null) ?? null,
    fortune_chart_id: data.fortune_chart_id as string,
    free_result_id: (data.free_result_id as string | null) ?? null,
    question_category: data.question_category as string,
    question_text: (data.question_text as string | null) ?? null,
    spread_type: data.spread_type as string,
    shuffled_deck: data.shuffled_deck as ShuffledDeckSlot[],
    presentation_slots: data.presentation_slots as Array<{
      slotIndex: number;
      cardId: string;
    }>,
    generation_status: data.generation_status as TarotReadingStatus,
    result_json: (data.result_json as Json | null) ?? null,
    model: (data.model as string | null) ?? null,
    prompt_version: (data.prompt_version as string | null) ?? null,
    prompt_version_id: (data.prompt_version_id as string | null) ?? null,
    generation_key: (data.generation_key as string | null) ?? null,
    error_code: (data.error_code as string | null) ?? null,
    error_message: (data.error_message as string | null) ?? null,
    attempt_count: (data.attempt_count as number) ?? 0,
    feedback_score: (data.feedback_score as number | null) ?? null,
    feedback_label: (data.feedback_label as string | null) ?? null,
    created_at: data.created_at as string,
    updated_at: data.updated_at as string,
  };
}

function mapDraw(d: Record<string, unknown>): TarotDrawRow {
  return {
    id: d.id as string,
    reading_id: d.reading_id as string,
    position_index: d.position_index as number,
    position: d.position as string,
    card_id: d.card_id as string,
    card_slug: d.card_slug as string,
    orientation: d.orientation as string,
    created_at: d.created_at as string,
  };
}
