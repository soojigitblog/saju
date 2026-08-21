/** Pure Tarot types — no AI / Next / Supabase imports. */

export type TarotArcana = "major" | "minor";
export type TarotSuit = "wands" | "cups" | "swords" | "pentacles" | null;
export type TarotOrientation = "UPRIGHT" | "REVERSED";
export type TarotSpreadPosition = "CURRENT" | "BLOCK" | "DIRECTION";

export type TarotCardDefinition = {
  id: string;
  slug: string;
  nameEn: string;
  nameKo: string;
  arcana: TarotArcana;
  suit: TarotSuit;
  number: number | null;
  keywordsUpright: string[];
  keywordsReversed: string[];
  shortMeaningUpright: string;
  shortMeaningReversed: string;
  themes: string[];
  /** Relative path under /public — swappable later for artwork */
  imageFrontPath: string | null;
  imageBackPath: string;
};

export type DrawnCard = {
  position: TarotSpreadPosition;
  positionIndex: 1 | 2 | 3;
  cardId: string;
  slug: string;
  nameEn: string;
  nameKo: string;
  orientation: TarotOrientation;
  canonicalMeaning: string;
  keywords: string[];
};

export type TarotSpreadType = "THREE_ADVICE";

export type ShuffledDeckSlot = {
  deckIndex: number;
  cardId: string;
  orientation: TarotOrientation;
};

export const SPREAD_POSITIONS: Array<{
  position: TarotSpreadPosition;
  positionIndex: 1 | 2 | 3;
  labelKo: string;
}> = [
  { position: "CURRENT", positionIndex: 1, labelKo: "현재 상황" },
  { position: "BLOCK", positionIndex: 2, labelKo: "걸림돌 / 놓치고 있는 점" },
  { position: "DIRECTION", positionIndex: 3, labelKo: "지금 필요한 방향" },
];

export const QUESTION_CATEGORIES = [
  "money",
  "career",
  "love",
  "relationships",
  "advice",
  "custom",
] as const;

export type QuestionCategory = (typeof QUESTION_CATEGORIES)[number];

export const QUESTION_CATEGORY_LABELS: Record<QuestionCategory, string> = {
  money: "돈 · 재물",
  career: "직장 · 이직",
  love: "연애 · 관계",
  relationships: "인간관계",
  advice: "지금 나에게 필요한 조언",
  custom: "직접 질문",
};
