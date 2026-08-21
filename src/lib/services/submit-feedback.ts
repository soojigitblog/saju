import "server-only";

import {
  FEEDBACK_TARGET_TYPES,
  FORTUNE_FEEDBACK_TAGS,
  MORE_FUN_CHOICES,
  MOST_RESONANT_CHOICES,
  TAROT_FEEDBACK_LABELS,
  fortuneTagCodes,
  isFortuneTag,
  isTarotLabel,
  tarotTagCodes,
  type FeedbackTargetType,
  type MoreFunChoice,
  type MostResonantChoice,
} from "@/lib/feedback/constants";
import {
  getFeedbackByGuestTarget,
  upsertFeedback,
  type FeedbackRow,
} from "@/lib/repositories/feedbacks";
import { getFreeResultById } from "@/lib/repositories/free-results";
import { getProfileById } from "@/lib/repositories/profiles";
import { getTarotReadingById } from "@/lib/repositories/tarot-readings";
import { updateTarotReading } from "@/lib/repositories/tarot-readings";
import { FreeFlowError } from "@/lib/services/free-flow-errors";

export type SubmitFeedbackInput = {
  guestSessionId: string;
  targetType: FeedbackTargetType;
  targetId: string;
  rating?: number | null;
  tags?: string[];
  moreFunThanSajuAlone?: MoreFunChoice | null;
  mostResonant?: MostResonantChoice | null;
};

export type FeedbackPublicDTO = {
  targetType: FeedbackTargetType;
  targetId: string;
  rating: number | null;
  tags: string[];
  moreFunThanSajuAlone: MoreFunChoice | null;
  mostResonant: MostResonantChoice | null;
  submitted: boolean;
};

export function toFeedbackPublicDTO(row: FeedbackRow | null): FeedbackPublicDTO | null {
  if (!row) return null;
  return {
    targetType: row.target_type,
    targetId: row.target_id,
    rating: row.rating,
    tags: row.tags,
    moreFunThanSajuAlone: row.more_fun_than_saju_alone,
    mostResonant: row.most_resonant,
    submitted: true,
  };
}

export async function getFeedbackForOwner(input: {
  guestSessionId: string;
  targetType: FeedbackTargetType;
  targetId: string;
}): Promise<FeedbackPublicDTO | null> {
  await assertTargetOwnership(input);
  const row = await getFeedbackByGuestTarget(input);
  return toFeedbackPublicDTO(row);
}

export async function submitFeedback(
  input: SubmitFeedbackInput
): Promise<{ ok: true; feedback: FeedbackPublicDTO; analytics: FeedbackAnalyticsMeta }> {
  if (!FEEDBACK_TARGET_TYPES.includes(input.targetType)) {
    throw new FreeFlowError("VALIDATION_ERROR", "대상 유형을 확인해 주세요.", 400);
  }

  await assertTargetOwnership({
    guestSessionId: input.guestSessionId,
    targetType: input.targetType,
    targetId: input.targetId,
  });

  const validated = validatePayload(input);

  const row = await upsertFeedback({
    guestSessionId: input.guestSessionId,
    targetType: input.targetType,
    targetId: input.targetId,
    rating: validated.rating,
    tags: validated.tags,
    moreFunThanSajuAlone: validated.moreFunThanSajuAlone,
    mostResonant: validated.mostResonant,
  });

  // Keep legacy tarot_readings columns in sync for existing GET consumers.
  if (input.targetType === "TAROT" && validated.rating != null && validated.tags[0]) {
    await updateTarotReading(input.targetId, {
      feedback_score: validated.rating,
      feedback_label: validated.tags[0],
    });
  }

  return {
    ok: true,
    feedback: toFeedbackPublicDTO(row)!,
    analytics: buildAnalyticsMeta(input.targetType, validated),
  };
}

/** Legacy tarot path — writes shared feedbacks + legacy columns. */
export async function submitTarotFeedbackViaGate(input: {
  guestSessionId: string;
  readingId: string;
  score: number;
  label: string;
}) {
  return submitFeedback({
    guestSessionId: input.guestSessionId,
    targetType: "TAROT",
    targetId: input.readingId,
    rating: input.score,
    tags: [input.label],
  });
}

type ValidatedPayload = {
  rating: number | null;
  tags: string[];
  moreFunThanSajuAlone: MoreFunChoice | null;
  mostResonant: MostResonantChoice | null;
};

export type FeedbackAnalyticsMeta = {
  rating?: number;
  tagCodes?: string[];
  moreFunThanSajuAlone?: MoreFunChoice;
  mostResonant?: MostResonantChoice;
};

function validatePayload(input: SubmitFeedbackInput): ValidatedPayload {
  switch (input.targetType) {
    case "FORTUNE": {
      if (input.rating == null || input.rating < 1 || input.rating > 5) {
        throw new FreeFlowError("VALIDATION_ERROR", "점수를 확인해 주세요.", 400);
      }
      const tags = input.tags ?? [];
      if (tags.length < 1 || tags.length > FORTUNE_FEEDBACK_TAGS.length) {
        throw new FreeFlowError("VALIDATION_ERROR", "선택지를 확인해 주세요.", 400);
      }
      if (!tags.every(isFortuneTag)) {
        throw new FreeFlowError("VALIDATION_ERROR", "선택지를 확인해 주세요.", 400);
      }
      const unique = [...new Set(tags)];
      return {
        rating: input.rating,
        tags: unique,
        moreFunThanSajuAlone: null,
        mostResonant: null,
      };
    }
    case "TAROT": {
      if (input.rating == null || input.rating < 1 || input.rating > 5) {
        throw new FreeFlowError("VALIDATION_ERROR", "점수를 확인해 주세요.", 400);
      }
      const label = input.tags?.[0];
      if (!label || !isTarotLabel(label) || (input.tags?.length ?? 0) !== 1) {
        throw new FreeFlowError("VALIDATION_ERROR", "선택지를 확인해 주세요.", 400);
      }
      return {
        rating: input.rating,
        tags: [label],
        moreFunThanSajuAlone: null,
        mostResonant: null,
      };
    }
    case "CROSS_READING": {
      const more = input.moreFunThanSajuAlone;
      if (!more || !(MORE_FUN_CHOICES as readonly string[]).includes(more)) {
        throw new FreeFlowError("VALIDATION_ERROR", "선택지를 확인해 주세요.", 400);
      }
      let most: MostResonantChoice | null = null;
      if (input.mostResonant != null) {
        if (!(MOST_RESONANT_CHOICES as readonly string[]).includes(input.mostResonant)) {
          throw new FreeFlowError("VALIDATION_ERROR", "선택지를 확인해 주세요.", 400);
        }
        most = input.mostResonant;
      }
      return {
        rating: null,
        tags: [],
        moreFunThanSajuAlone: more,
        mostResonant: most,
      };
    }
    default:
      throw new FreeFlowError("VALIDATION_ERROR", "대상 유형을 확인해 주세요.", 400);
  }
}

function buildAnalyticsMeta(
  targetType: FeedbackTargetType,
  validated: ValidatedPayload
): FeedbackAnalyticsMeta {
  if (targetType === "FORTUNE") {
    return {
      rating: validated.rating ?? undefined,
      tagCodes: fortuneTagCodes(validated.tags),
    };
  }
  if (targetType === "TAROT") {
    return {
      rating: validated.rating ?? undefined,
      tagCodes: tarotTagCodes(validated.tags),
    };
  }
  return {
    moreFunThanSajuAlone: validated.moreFunThanSajuAlone ?? undefined,
    mostResonant: validated.mostResonant ?? undefined,
  };
}

async function assertTargetOwnership(input: {
  guestSessionId: string;
  targetType: FeedbackTargetType;
  targetId: string;
}) {
  if (input.targetType === "FORTUNE") {
    const row = await getFreeResultById(input.targetId);
    if (!row) {
      throw new FreeFlowError("NOT_FOUND", "결과를 찾을 수 없습니다.", 404);
    }
    const profile = await getProfileById(row.profile_id);
    if (!profile || profile.guest_session_id !== input.guestSessionId) {
      throw new FreeFlowError("FORBIDDEN", "접근 권한이 없습니다.", 403);
    }
    if (row.generation_status !== "COMPLETED") {
      throw new FreeFlowError("INVALID_STATE", "완료된 결과만 피드백할 수 있습니다.", 409);
    }
    return;
  }

  // TAROT + CROSS_READING both own via tarot_readings.id
  const reading = await getTarotReadingById(input.targetId);
  if (!reading) {
    throw new FreeFlowError("NOT_FOUND", "리딩을 찾을 수 없습니다.", 404);
  }
  if (reading.guest_session_id !== input.guestSessionId) {
    throw new FreeFlowError("FORBIDDEN", "접근 권한이 없습니다.", 403);
  }
  if (reading.generation_status !== "COMPLETED") {
    throw new FreeFlowError("INVALID_STATE", "완료된 리딩만 피드백할 수 있습니다.", 409);
  }
}

// Re-export allowed label lists for tests
export { FORTUNE_FEEDBACK_TAGS, TAROT_FEEDBACK_LABELS };
