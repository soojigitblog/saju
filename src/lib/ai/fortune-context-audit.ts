import type { FortuneAiContext } from "@/lib/ai/types";

/**
 * PHASE P1.4 — Interpretation axes available from FortuneAiContext (engine truth).
 * NOT supported: 대운, 세운, 월운, 용신, 신강/신약, element interactions beyond counts.
 */
export const ENGINE_NOT_SUPPORTED = [
  "대운 (daeun)",
  "세운 (saeun)",
  "월운",
  "용신",
  "신강/신약",
  "합/충/형/파/해 (unless explicitly added to engine later)",
] as const;

export type InterpretationAxisId =
  | "day_master"
  | "yin_yang"
  | "day_element"
  | "five_elements"
  | "ten_gods_month"
  | "ten_gods_year"
  | "ten_gods_day"
  | "ten_gods_hour"
  | "pillar_year"
  | "pillar_month"
  | "pillar_day"
  | "pillar_hour"
  | "gender";

export type InterpretationAxis = {
  id: InterpretationAxisId;
  label: string;
  source: string;
  available: (ctx: FortuneAiContext) => boolean;
};

export const INTERPRETATION_AXES: InterpretationAxis[] = [
  {
    id: "day_master",
    label: "日干 · Day Master",
    source: "dayMaster.stem / hangul / element / yinYang",
    available: () => true,
  },
  {
    id: "yin_yang",
    label: "음양",
    source: "dayMaster.yinYang",
    available: () => true,
  },
  {
    id: "day_element",
    label: "일간 오행",
    source: "dayMaster.element",
    available: () => true,
  },
  {
    id: "five_elements",
    label: "오행 분포",
    source: "fiveElements.{wood,fire,earth,metal,water}",
    available: () => true,
  },
  {
    id: "ten_gods_month",
    label: "월주 십성",
    source: "tenGods.month.stem / branch",
    available: () => true,
  },
  {
    id: "ten_gods_year",
    label: "년주 십성",
    source: "tenGods.year.stem / branch",
    available: () => true,
  },
  {
    id: "ten_gods_day",
    label: "일주 십성",
    source: "tenGods.day.stem / branch",
    available: () => true,
  },
  {
    id: "ten_gods_hour",
    label: "시주 십성",
    source: "tenGods.hour.stem / branch",
    available: (ctx) => !ctx.birthTimeUnknown && ctx.tenGods.hour != null,
  },
  {
    id: "pillar_year",
    label: "年柱",
    source: "pillars.year stem/branch/ganji",
    available: () => true,
  },
  {
    id: "pillar_month",
    label: "月柱",
    source: "pillars.month stem/branch/ganji",
    available: () => true,
  },
  {
    id: "pillar_day",
    label: "日柱",
    source: "pillars.day stem/branch/ganji",
    available: () => true,
  },
  {
    id: "pillar_hour",
    label: "時柱",
    source: "pillars.hour stem/branch/ganji",
    available: (ctx) => !ctx.birthTimeUnknown && ctx.pillars.hour != null,
  },
  {
    id: "gender",
    label: "성별 (해석 맥락)",
    source: "gender",
    available: () => true,
  },
];

/** Map evidence key prefix → interpretation axis for diversity metrics. */
export function evidenceToAxis(key: string): InterpretationAxisId | "unknown" {
  const k = key.split("=")[0]?.trim() ?? key;
  if (k.startsWith("dayMaster")) return "day_master";
  if (k.startsWith("fiveElements")) return "five_elements";
  if (k.startsWith("tenGods.month")) return "ten_gods_month";
  if (k.startsWith("tenGods.year")) return "ten_gods_year";
  if (k.startsWith("tenGods.day")) return "ten_gods_day";
  if (k.startsWith("tenGods.hour")) return "ten_gods_hour";
  if (k.startsWith("pillars.year")) return "pillar_year";
  if (k.startsWith("pillars.month")) return "pillar_month";
  if (k.startsWith("pillars.day")) return "pillar_day";
  if (k.startsWith("pillars.hour")) return "pillar_hour";
  if (k === "hourUnknown") return "unknown";
  if (k.startsWith("gender")) return "gender";
  return "unknown";
}

export function countEvidenceAxes(evidenceKeys: string[]): Map<InterpretationAxisId | "unknown", number> {
  const m = new Map<InterpretationAxisId | "unknown", number>();
  for (const k of evidenceKeys) {
    const axis = evidenceToAxis(k);
    m.set(axis, (m.get(axis) ?? 0) + 1);
  }
  return m;
}

export function availableAxes(ctx: FortuneAiContext): InterpretationAxis[] {
  return INTERPRETATION_AXES.filter((a) => a.available(ctx));
}

/** Product name candidates (DB not changed until user approval). */
export const MONEY_PRODUCT_NAME_CANDIDATES = [
  "재물 사주 분석",
  "돈의 성향 리포트",
  "나의 재물 사용설명서",
  "돈을 대하는 나",
  "재물 사주 사용설명서",
] as const;

/** Recommended: avoids “운/시기” expectation without 대운·세운. */
export const RECOMMENDED_MONEY_PRODUCT_NAME = "나의 재물 사용설명서";
