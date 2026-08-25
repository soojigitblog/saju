/**
 * PHASE P2.2 — Additional Question product design (not wired to checkout).
 *
 * Cost model: reuse chart + InterpretationContextV2; only the user question
 * triggers a narrow Gemini call. Do NOT regenerate a full paid report.
 */

import type { InterpretationContextV2 } from "@/lib/ai/interpretation-context-v2";

export type AdditionalQuestionInput = {
  /** Existing fortune chart id / payload reference */
  chartRef: string;
  /** Prior paid product slug if any */
  priorProductSlug?: string;
  /** User's single follow-up question */
  question: string;
  /** Reused interpretation context — required for cost control */
  interpretationContext: InterpretationContextV2;
};

export type AdditionalQuestionScope = {
  maxQuestions: 1;
  regeneratesFullReport: false;
  reusesInterpretationContextV2: true;
  mayCallGemini: true;
  forbidden: string[];
};

export const ADDITIONAL_QUESTION_SCOPE: AdditionalQuestionScope = {
  maxQuestions: 1,
  regeneratesFullReport: false,
  reusesInterpretationContextV2: true,
  mayCallGemini: true,
  forbidden: [
    "새 Focus/Total 리포트 전체 재생성",
    "대운·세운 기반 시기 예언",
    "무관한 영역으로 질문 확장",
    "공포성 미래 단정",
  ],
};

const MAX_QUESTION_LEN = 200;

export function validateAdditionalQuestion(question: string): {
  ok: boolean;
  reason?: string;
} {
  const q = question.trim();
  if (q.length < 8) return { ok: false, reason: "질문이 너무 짧습니다." };
  if (q.length > MAX_QUESTION_LEN) {
    return { ok: false, reason: "한 질문에 집중해 주세요." };
  }
  if (/언제\s*(이직|연애|결혼|재회)|몇\s*월|올해\s*운/.test(q)) {
    return {
      ok: false,
      reason: "시기 확정 예언 질문은 지원하지 않습니다.",
    };
  }
  return { ok: true };
}

/**
 * Design-time cost note — no price hardcoded into payment paths.
 * Suggested band for future pricing decision only.
 */
export const ADDITIONAL_QUESTION_PRICE_GUIDANCE = {
  relativeToFirstFocus: "lower",
  suggestedBandKrw: "1900-3900",
  recommendedKrw: 2900,
  wiredToCheckout: false,
  note: "한 가지 더 묻기 — 첫 Focus보다 낮게. DB/결제 연결은 별도 Phase(2차 출시).",
} as const;

export function buildAdditionalQuestionPromptSkeleton(
  input: AdditionalQuestionInput
): {
  systemRole: string;
  constraints: string[];
  userPayloadKeys: string[];
} {
  void input;
  return {
    systemRole:
      "기존 해석 맥락을 재사용해 사용자 한 질문에만 답하는 편집자. 새 종합 분석을 만들지 않는다.",
    constraints: [
      "InterpretationContextV2 evidence만 사용",
      "질문 범위 밖 확장 금지",
      "대운·세운·월운 예언 금지",
      "이미 본 Focus 내용을 고의로 숨기지 않되, 반복 나열하지 않음",
    ],
    userPayloadKeys: [
      "question",
      "priorProductSlug",
      "interpretationContext.domainSignals",
      "interpretationContext.behaviorHypotheses",
      "interpretationContext.tensions",
      "interpretationContext.strengthShadowPairs",
    ],
  };
}
