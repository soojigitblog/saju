import "server-only";

import { FreeFlowError } from "@/lib/services/free-flow-errors";
import { getFreeResultById } from "@/lib/repositories/free-results";
import { getProfileById } from "@/lib/repositories/profiles";
import { getFortuneChartById } from "@/lib/repositories/fortune-charts";
import {
  createTarotReading,
  getTarotReadingById,
  updateTarotReading,
  replaceTarotDraws,
  listTarotDraws,
  countCompletedTarotForGuest,
} from "@/lib/repositories/tarot-readings";
import {
  shuffleDeck,
  pickPresentationSlots,
  resolveDrawsFromSlots,
  buildTarotAiContext,
  getCardById,
} from "@/lib/tarot";
import { validateTarotQuestion } from "@/lib/tarot/question-guard";
import {
  CROSS_PROMPT_VERSION,
  generateCrossReading,
} from "@/lib/ai/cross-reading";
import { AiEngineError } from "@/lib/ai/errors";
import type { FortuneChart } from "@/lib/fortune-engine/types";
import type { Json } from "@/types/database.types";
import { createAiGeneration, updateAiGeneration } from "@/lib/repositories/ai-generations";
import { resolveAiProviderForFree, getAiModelFree } from "@/lib/ai/config";
import { FORTUNE_RELEASE_MANIFEST } from "@/lib/fortune-engine/release-manifest";
import { submitTarotFeedbackViaGate } from "@/lib/services/submit-feedback";

export function getFreeTarotLimit(): number {
  const n = Number(process.env.FREE_TAROT_LIMIT ?? "1");
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export function getFreeTarotWindowSeconds(): number {
  const n = Number(process.env.FREE_TAROT_WINDOW_SECONDS ?? "86400");
  return Number.isFinite(n) && n > 0 ? n : 86400;
}

export async function startTarotReading(input: {
  guestSessionId: string;
  freeResultId: string;
  questionCategory: string;
  questionText?: string | null;
}) {
  const q = validateTarotQuestion({
    category: input.questionCategory,
    questionText: input.questionText,
  });
  if (!q.ok) {
    throw new FreeFlowError(q.code, q.message, q.code === "UNSAFE_QUESTION" ? 400 : 400);
  }

  const free = await getFreeResultById(input.freeResultId);
  if (!free || free.generation_status !== "COMPLETED") {
    throw new FreeFlowError("NOT_FOUND", "사주 결과를 찾을 수 없습니다.", 404);
  }

  const profile = await getProfileById(free.profile_id);
  if (!profile || profile.guest_session_id !== input.guestSessionId) {
    throw new FreeFlowError("FORBIDDEN", "접근 권한이 없습니다.", 403);
  }

  const completed = await countCompletedTarotForGuest(
    input.guestSessionId,
    getFreeTarotWindowSeconds()
  );
  if (completed >= getFreeTarotLimit()) {
    throw new FreeFlowError(
      "RATE_LIMITED",
      "오늘은 무료 타로 체험을 모두 사용했어요.",
      429
    );
  }

  const shuffled = shuffleDeck();
  const presentation = pickPresentationSlots(shuffled, 15);

  const reading = await createTarotReading({
    guestSessionId: input.guestSessionId,
    profileId: profile.id,
    fortuneChartId: free.chart_id,
    freeResultId: free.id,
    questionCategory: input.questionCategory,
    questionText: q.questionText,
    shuffledDeck: shuffled,
    presentationSlots: presentation,
  });

  return {
    readingId: reading.id,
    questionCategory: reading.question_category,
    presentationSlots: presentation.map((s) => ({
      slotIndex: s.slotIndex,
      // never leak cardId to client before select — only opaque backs
    })),
  };
}

export async function selectTarotCards(input: {
  guestSessionId: string;
  readingId: string;
  slotIndices: [number, number, number];
}) {
  const reading = await getOwnedReading(input.readingId, input.guestSessionId);
  if (reading.generation_status !== "PENDING") {
    throw new FreeFlowError("INVALID_STATE", "이미 카드가 선택된 리딩입니다.", 409);
  }

  const maxSlot = reading.presentation_slots.length - 1;
  for (const idx of input.slotIndices) {
    if (idx < 0 || idx > maxSlot) {
      throw new FreeFlowError(
        "VALIDATION_ERROR",
        "선택한 카드가 올바르지 않습니다.",
        400
      );
    }
  }

  const draws = resolveDrawsFromSlots(
    reading.shuffled_deck,
    input.slotIndices
  );
  await replaceTarotDraws(reading.id, draws);
  await updateTarotReading(reading.id, { generation_status: "DRAWN" });

  return {
    readingId: reading.id,
    draws: draws.map((d) => ({
      position: d.position,
      positionIndex: d.positionIndex,
      cardId: d.cardId,
      slug: d.slug,
      nameEn: d.nameEn,
      nameKo: d.nameKo,
      orientation: d.orientation,
      canonicalMeaning: d.canonicalMeaning,
      keywords: d.keywords,
    })),
  };
}

export async function generateTarotCrossReading(input: {
  guestSessionId: string;
  readingId: string;
}) {
  const reading = await getOwnedReading(input.readingId, input.guestSessionId);
  if (reading.generation_status === "COMPLETED" && reading.result_json) {
    return {
      readingId: reading.id,
      status: "COMPLETED" as const,
      result: reading.result_json,
    };
  }
  if (reading.generation_status !== "DRAWN" && reading.generation_status !== "FAILED") {
    throw new FreeFlowError(
      "INVALID_STATE",
      "카드를 먼저 선택해 주세요.",
      409
    );
  }

  const drawRows = await listTarotDraws(reading.id);
  if (drawRows.length !== 3) {
    throw new FreeFlowError("INVALID_STATE", "카드 선택이 완료되지 않았습니다.", 409);
  }

  const chartRow = await getFortuneChartById(reading.fortune_chart_id);
  if (!chartRow?.chart && !chartRow?.raw_chart_json) {
    throw new FreeFlowError("NOT_FOUND", "사주 명식을 찾을 수 없습니다.", 404);
  }
  const chart = (chartRow.chart ??
    (chartRow.raw_chart_json as unknown as FortuneChart)) as FortuneChart;

  const draws = drawRows.map((r) => {
    const card = getCardById(r.card_id);
    if (!card) throw new FreeFlowError("UNKNOWN", "카드 데이터를 찾을 수 없습니다.", 500);
    const upright = r.orientation === "UPRIGHT";
    return {
      position: r.position as "CURRENT" | "BLOCK" | "DIRECTION",
      positionIndex: r.position_index as 1 | 2 | 3,
      cardId: r.card_id,
      slug: r.card_slug,
      nameEn: card.nameEn,
      nameKo: card.nameKo,
      orientation: r.orientation as "UPRIGHT" | "REVERSED",
      canonicalMeaning: upright
        ? card.shortMeaningUpright
        : card.shortMeaningReversed,
      keywords: upright ? card.keywordsUpright : card.keywordsReversed,
    };
  });

  const tarotContext = buildTarotAiContext({
    questionCategory: reading.question_category,
    questionText: reading.question_text,
    draws,
  });

  const attempt = reading.attempt_count + 1;
  await updateTarotReading(reading.id, {
    generation_status: "GENERATING",
    attempt_count: attempt,
    error_code: null,
    error_message: null,
  });

  let generationId: string | null = null;
  const model = getAiModelFree();
  try {
    const gen = await createAiGeneration({
      generation_key: `tarot:${reading.id}:attempt:${attempt}`,
      result_type: "tarot_cross",
      profile_id: reading.profile_id,
      chart_id: reading.fortune_chart_id,
      prompt_version_id: null,
      engine_version: FORTUNE_RELEASE_MANIFEST.engineVersion,
      provider_version: FORTUNE_RELEASE_MANIFEST.provider.version,
      provider: resolveAiProviderForFree(),
      model,
      status: "GENERATING",
      attempt_count: attempt,
      started_at: new Date().toISOString(),
    });
    generationId = gen.id;
  } catch {
    /* ledger best-effort until migration applied */
  }

  try {
    const result = await generateCrossReading({
      chart,
      tarotContext,
      readingId: reading.id,
    });

    await updateTarotReading(reading.id, {
      generation_status: "COMPLETED",
      result_json: result as unknown as Json,
      model: result.meta.model,
      prompt_version: String(CROSS_PROMPT_VERSION.version),
      prompt_version_id: CROSS_PROMPT_VERSION.id,
      generation_key: result.meta.generationKey,
      error_code: null,
      error_message: null,
    });

    if (generationId) {
      try {
        await updateAiGeneration(generationId, {
          status: "COMPLETED",
          input_tokens: result.meta.usage?.inputTokens ?? null,
          output_tokens: result.meta.usage?.outputTokens ?? null,
          total_tokens: result.meta.usage?.totalTokens ?? null,
          provider_request_id: result.meta.providerRequestId ?? null,
          completed_at: new Date().toISOString(),
        });
      } catch {
        /* ignore */
      }
    }

    return {
      readingId: reading.id,
      status: "COMPLETED" as const,
      result,
      draws,
    };
  } catch (error) {
    const code =
      error instanceof AiEngineError ? error.code : "AI_GENERATION_FAILED";
    const message =
      "교차 리딩 생성 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";
    await updateTarotReading(reading.id, {
      generation_status: "FAILED",
      error_code: code,
      error_message: message,
    });
    throw new FreeFlowError(code, message, 502);
  }
}

export async function getTarotReadingForOwner(input: {
  guestSessionId: string;
  readingId: string;
}) {
  const reading = await getOwnedReading(input.readingId, input.guestSessionId);
  const draws = await listTarotDraws(reading.id);
  return { reading, draws };
}

export async function submitTarotFeedback(input: {
  guestSessionId: string;
  readingId: string;
  score: number;
  label: string;
}) {
  await submitTarotFeedbackViaGate(input);
  return { ok: true };
}

async function getOwnedReading(readingId: string, guestSessionId: string) {
  const reading = await getTarotReadingById(readingId);
  if (!reading) {
    throw new FreeFlowError("NOT_FOUND", "리딩을 찾을 수 없습니다.", 404);
  }
  if (reading.guest_session_id !== guestSessionId) {
    throw new FreeFlowError("FORBIDDEN", "접근 권한이 없습니다.", 403);
  }
  return reading;
}
