import "server-only";

import { getCardById } from "@/lib/tarot/deck/cards";
import {
  buildTarotAiContext,
  resolveDrawsFromSlots,
  shuffleDeck,
  type TarotAiContext,
} from "@/lib/tarot/engine/draw";
import {
  getTarotReadingById,
  listTarotDraws,
  type TarotReadingRow,
} from "@/lib/repositories/tarot-readings";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDataMode } from "@/lib/repositories/data-mode";

/**
 * Resolve cards + question for Paid Tarot fulfillment.
 * Prefer linked free reading; else latest COMPLETED/DRAWN for free_result; else server draw.
 */
export async function resolvePaidTarotContext(input: {
  sourceTarotReadingId?: string | null;
  freeResultId?: string | null;
  questionCategoryFallback?: string;
}): Promise<{ tarotContext: TarotAiContext; sourceReadingId: string | null }> {
  let reading: TarotReadingRow | null = null;

  if (input.sourceTarotReadingId) {
    reading = await getTarotReadingById(input.sourceTarotReadingId);
  }

  if (!reading && input.freeResultId) {
    reading = await findLatestDrawnOrCompletedTarot(input.freeResultId);
  }

  if (
    reading &&
    (reading.generation_status === "COMPLETED" ||
      reading.generation_status === "DRAWN")
  ) {
    const draws = await listTarotDraws(reading.id);
    if (draws.length === 3) {
      const ordered = [...draws].sort(
        (a, b) => a.position_index - b.position_index
      );
      const resolved = ordered.map((d) => {
        const card = getCardById(d.card_id);
        const upright = d.orientation === "UPRIGHT";
        return {
          position: d.position as "CURRENT" | "BLOCK" | "DIRECTION",
          positionIndex: d.position_index as 1 | 2 | 3,
          cardId: d.card_id,
          slug: d.card_slug,
          nameEn: card?.nameEn ?? d.card_slug,
          nameKo: card?.nameKo ?? d.card_slug,
          orientation: d.orientation as "UPRIGHT" | "REVERSED",
          canonicalMeaning: upright
            ? (card?.shortMeaningUpright ?? "")
            : (card?.shortMeaningReversed ?? ""),
          keywords: upright
            ? (card?.keywordsUpright ?? [])
            : (card?.keywordsReversed ?? []),
        };
      });
      return {
        tarotContext: buildTarotAiContext({
          questionCategory: reading.question_category,
          questionText: reading.question_text,
          draws: resolved,
        }),
        sourceReadingId: reading.id,
      };
    }
  }

  const shuffled = shuffleDeck();
  const draws = resolveDrawsFromSlots(shuffled, [0, 1, 2]);
  return {
    tarotContext: buildTarotAiContext({
      questionCategory: input.questionCategoryFallback ?? "advice",
      questionText: null,
      draws,
    }),
    sourceReadingId: null,
  };
}

async function findLatestDrawnOrCompletedTarot(
  freeResultId: string
): Promise<TarotReadingRow | null> {
  if (getDataMode() === "mock") return null;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("tarot_readings")
    .select("*")
    .eq("free_result_id", freeResultId)
    .in("generation_status", ["COMPLETED", "DRAWN"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as TarotReadingRow;
}
