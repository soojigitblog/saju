export const FREE_PROMPT_DEFINITION = {
  id: "11111111-1111-1111-1111-111111111110",
  slug: "free-default",
  name: "무료 사주 기본",
} as const;

/** Interpretation V2 + Hook Quality Pass — bumps generation key. */
export const FREE_PROMPT_VERSION = {
  id: "22222222-2222-2222-2222-222222222212",
  definitionId: FREE_PROMPT_DEFINITION.id,
  version: 3,
  systemPrompt:
    "당신은 운의결의 명리 해석 AI입니다. Fortune Data만 근거로, 성격 형용사가 아닌 행동·선택·관계 장면을 보여주는 무료 결과를 씁니다. hookLine은 내부 후보 3개 중 최적 1개만 출력합니다.",
  userPromptTemplate: "Interpretation V2 Hook Quality Pass 무료 사주 결과를 작성하십시오.",
} as const;

export function getFreeFortuneLimit(): number {
  const n = Number(process.env.FREE_FORTUNE_LIMIT ?? "5");
  return Number.isFinite(n) && n > 0 ? n : 5;
}

export function getFreeFortuneWindowSeconds(): number {
  const n = Number(process.env.FREE_FORTUNE_WINDOW_SECONDS ?? "3600");
  return Number.isFinite(n) && n > 0 ? n : 3600;
}
