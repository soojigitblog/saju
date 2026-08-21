/** Friend-test feedback constants — labels stored as-is; codes for analytics only. */

export const FEEDBACK_TARGET_TYPES = [
  "FORTUNE",
  "TAROT",
  "CROSS_READING",
] as const;

export type FeedbackTargetType = (typeof FEEDBACK_TARGET_TYPES)[number];

export const FORTUNE_FEEDBACK_TAGS = [
  "소름 돋게 맞았어요",
  "꽤 맞는 편이에요",
  "반반이에요",
  "너무 일반적인 이야기 같아요",
  "나와는 달라요",
] as const;

export type FortuneFeedbackTag = (typeof FORTUNE_FEEDBACK_TAGS)[number];

export const TAROT_FEEDBACK_LABELS = [
  "정확해서 놀랐어요",
  "어느 정도 맞아요",
  "너무 일반적이에요",
  "잘 모르겠어요",
  "나와는 달라요",
] as const;

export type TarotFeedbackLabel = (typeof TAROT_FEEDBACK_LABELS)[number];

export const MORE_FUN_CHOICES = ["YES", "NO"] as const;
export type MoreFunChoice = (typeof MORE_FUN_CHOICES)[number];

export const MOST_RESONANT_CHOICES = [
  "SAJU",
  "TAROT",
  "CROSS",
  "SIMILAR",
] as const;
export type MostResonantChoice = (typeof MOST_RESONANT_CHOICES)[number];

export const MOST_RESONANT_LABELS: Record<MostResonantChoice, string> = {
  SAJU: "사주",
  TAROT: "타로",
  CROSS: "사주 × 타로 교차해석",
  SIMILAR: "비슷했어요",
};

/** Analytics metadata tag codes — never send Korean free text as event body. */
export const FORTUNE_TAG_CODES: Record<FortuneFeedbackTag, string> = {
  "소름 돋게 맞았어요": "chilling",
  "꽤 맞는 편이에요": "quite_fit",
  "반반이에요": "mixed",
  "너무 일반적인 이야기 같아요": "too_generic",
  "나와는 달라요": "different",
};

export const TAROT_TAG_CODES: Record<TarotFeedbackLabel, string> = {
  "정확해서 놀랐어요": "accurate_surprise",
  "어느 정도 맞아요": "somewhat_fit",
  "너무 일반적이에요": "too_generic",
  "잘 모르겠어요": "unsure",
  "나와는 달라요": "different",
};

export function isFortuneTag(value: string): value is FortuneFeedbackTag {
  return (FORTUNE_FEEDBACK_TAGS as readonly string[]).includes(value);
}

export function isTarotLabel(value: string): value is TarotFeedbackLabel {
  return (TAROT_FEEDBACK_LABELS as readonly string[]).includes(value);
}

export function fortuneTagCodes(tags: string[]): string[] {
  return tags
    .filter(isFortuneTag)
    .map((t) => FORTUNE_TAG_CODES[t]);
}

export function tarotTagCodes(tags: string[]): string[] {
  return tags
    .filter(isTarotLabel)
    .map((t) => TAROT_TAG_CODES[t]);
}
