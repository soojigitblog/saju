import "server-only";

import { z } from "zod";
import { calculateAdultV2Data } from "@/lib/adult-v2";
import type {
  CalculatedFortuneData,
  FortuneEvidence,
  TenGodTheme,
} from "@/lib/adult-v2/types";
import type { FortuneChart } from "@/lib/fortune-engine/types";

export const ADULT_V2_REPORT_VERSION = "adult-v2" as const;
export const ADULT_V2_INTERPRETATION_PROMPT_VERSION = "adult-v2-interpretation-v1" as const;

const themeLabels: Record<TenGodTheme, string> = {
  wealthResource: "자원과 선택",
  responsibilityRole: "역할과 책임",
  learningSupport: "배움과 지원",
  expressionOutput: "표현과 실행",
  selfPeerCompetition: "관계와 경쟁",
};

type ActivationLevel = "강하게 드러남" | "비교적 드러남" | "평균적" | "잔잔함";

export type AdultV2Theme = {
  key: TenGodTheme;
  label: string;
  score: number;
  level: ActivationLevel;
  evidence: FortuneEvidence[];
};

export type AdultV2YearFact = {
  year: number;
  primaryTheme: AdultV2Theme;
  secondaryTheme: AdultV2Theme;
  changePressure: { score: number; label: string; evidence: FortuneEvidence[] };
  evidence: FortuneEvidence[];
};

export type AdultV2LifeFlowFact = {
  startAge: number;
  endAge: number;
  startYear: number;
  endYear: number;
  ganji: string;
  current: boolean;
  themes: AdultV2Theme[];
  changePressure: { score: number; label: string; evidence: FortuneEvidence[] };
};

/**
 * Deterministic fact layer persisted with the report. It intentionally omits
 * natal.input (birth date/time) so the paid report does not duplicate PII.
 */
export type AdultV2CalculationSnapshot = {
  engineVersion: string;
  generatedForYear: number;
  dayMaster: { hanja: string; hangul: string; element: string };
  fiveElements: FortuneChart["fiveElements"];
  themes: AdultV2Theme[];
  current: {
    year: number;
    selectedDaeun: { startAge: number; endAge: number; ganji: string } | null;
    changePressure: { score: number; label: string; evidence: FortuneEvidence[] };
    analysisCoverage: CalculatedFortuneData["analysisCoverage"];
    validationStatus: CalculatedFortuneData["validationStatus"];
    evidence: FortuneEvidence[];
  };
  lifeFlow: AdultV2LifeFlowFact[];
  nextFiveYears: AdultV2YearFact[];
};

const text = (min: number, max: number) => z.string().trim().min(min).max(max);

/** AI language only. It cannot add dates, scores, or fortunes to the fact layer. */
export const adultV2InterpretationSchema = z.object({
  subtitle: text(20, 120),
  coreWords: z.array(text(2, 30)).min(2).max(4),
  portrait: z.object({ lead: text(40, 280), outward: text(40, 320), inward: text(40, 320) }),
  tendencies: z.object({
    primary: z.object({ title: text(8, 70), body: text(50, 360) }),
    supporting: z.array(z.object({ title: text(5, 60), body: text(40, 260) })).min(2).max(2),
  }),
  lifeFlow: z.array(z.object({ startAge: z.number().int(), title: text(8, 100) })).min(1).max(5),
  years: z.array(z.object({
    year: z.number().int(),
    headline: text(12, 120),
    keywords: z.array(text(2, 20)).min(2).max(3),
    interpretation: text(40, 360),
  })).length(5),
  moneyAndCareer: text(60, 360),
  relationships: z.object({
    opening: text(50, 320),
    insights: z.array(z.object({ title: text(5, 60), body: text(50, 320) })).length(3),
  }),
  family: text(40, 280),
  actionGuide: z.array(z.object({ title: text(5, 60), body: text(40, 260) })).min(3).max(5),
});

export type AdultV2Interpretation = z.infer<typeof adultV2InterpretationSchema>;

export type AdultV2ReportData = {
  reportVersion: typeof ADULT_V2_REPORT_VERSION;
  kind: "adult_v2";
  subject: string;
  calculation: AdultV2CalculationSnapshot;
  interpretation: AdultV2Interpretation;
  crossReading: { status: "unavailable"; message: string };
  meta: {
    interpretationPromptVersion: typeof ADULT_V2_INTERPRETATION_PROMPT_VERSION;
    calculationVersion: string;
    generatedAt: string;
    provider: "gemini" | "openai" | "mock";
    model: string;
  };
};

/** Runtime boundary for persisted JSON. Reject malformed reports instead of rendering placeholders. */
export function isAdultV2ReportData(value: unknown): value is AdultV2ReportData {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AdultV2ReportData>;
  if (candidate.reportVersion !== ADULT_V2_REPORT_VERSION || candidate.kind !== "adult_v2") return false;
  if (typeof candidate.subject !== "string" || !candidate.calculation || !candidate.meta) return false;
  return adultV2InterpretationSchema.safeParse(candidate.interpretation).success;
}

function activationLevel(score: number): ActivationLevel {
  if (score >= 70) return "강하게 드러남";
  if (score >= 50) return "비교적 드러남";
  if (score >= 30) return "평균적";
  return "잔잔함";
}

function changeLabel(score: number): string {
  if (score >= 60) return "변화 압력 높음";
  if (score >= 35) return "변화 압력 보통";
  return "변화 압력 낮음";
}

function themesFrom(data: CalculatedFortuneData): AdultV2Theme[] {
  return Object.values(data.themeActivation)
    .map((theme) => ({
      key: theme.theme,
      label: themeLabels[theme.theme],
      score: theme.score,
      level: activationLevel(theme.score),
      evidence: theme.evidence,
    }))
    .sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));
}

function currentAge(chart: FortuneChart, year: number): number {
  const birthYear = Number(chart.input.birthDate.slice(0, 4));
  return Number.isFinite(birthYear) ? Math.max(0, year - birthYear) : 0;
}

/** Maps only deterministic engine output to a serializable product fact layer. */
export function buildAdultV2CalculationSnapshot(input: {
  chart: FortuneChart;
  year: number;
}): AdultV2CalculationSnapshot {
  const current = calculateAdultV2Data(input.chart, input.year);
  const currentAgeValue = currentAge(input.chart, input.year);
  const periods = current.daeun.periods;
  const selectedIndex = Math.max(0, periods.findIndex((period) => period.index === current.selectedDaeun?.index));
  const flowPeriods = periods.slice(selectedIndex, selectedIndex + 5);
  const lifeFlow = flowPeriods.map((period) => {
    const periodData = calculateAdultV2Data(input.chart, period.startYear);
    return {
      startAge: period.startAge,
      endAge: period.endAge,
      startYear: period.startYear,
      endYear: period.endYear,
      ganji: period.ganji.hanja,
      current: currentAgeValue >= period.startAge && currentAgeValue <= period.endAge,
      themes: themesFrom(periodData).slice(0, 2),
      changePressure: {
        score: periodData.changePressure.score,
        label: changeLabel(periodData.changePressure.score),
        evidence: periodData.changePressure.evidence,
      },
    };
  });
  const nextFiveYears = Array.from({ length: 5 }, (_, offset) => {
    const year = input.year + offset;
    const data = calculateAdultV2Data(input.chart, year);
    const themes = themesFrom(data);
    return {
      year,
      primaryTheme: themes[0]!,
      secondaryTheme: themes[1]!,
      changePressure: {
        score: data.changePressure.score,
        label: changeLabel(data.changePressure.score),
        evidence: data.changePressure.evidence,
      },
      evidence: data.evidence,
    };
  });

  return {
    engineVersion: `${input.chart.engine.name}@${input.chart.engine.version}`,
    generatedForYear: input.year,
    dayMaster: {
      hanja: input.chart.dayMaster.hanja,
      hangul: input.chart.dayMaster.hangul,
      element: input.chart.dayMaster.element,
    },
    fiveElements: input.chart.fiveElements,
    themes: themesFrom(current),
    current: {
      year: input.year,
      selectedDaeun: current.selectedDaeun
        ? { startAge: current.selectedDaeun.startAge, endAge: current.selectedDaeun.endAge, ganji: current.selectedDaeun.ganji.hanja }
        : null,
      changePressure: {
        score: current.changePressure.score,
        label: changeLabel(current.changePressure.score),
        evidence: current.changePressure.evidence,
      },
      analysisCoverage: current.analysisCoverage,
      validationStatus: current.validationStatus,
      evidence: current.evidence,
    },
    lifeFlow,
    nextFiveYears,
  };
}

/** Reject incomplete or fabricated AI output before it can be persisted. */
export function assertAdultV2Interpretation(input: unknown, facts: AdultV2CalculationSnapshot): AdultV2Interpretation {
  const parsed = adultV2InterpretationSchema.parse(input);
  const expectedYears = facts.nextFiveYears.map((item) => item.year).join(",");
  const actualYears = parsed.years.map((item) => item.year).join(",");
  if (expectedYears !== actualYears) throw new Error("ADULT_V2_YEAR_EVIDENCE_MISMATCH");
  const expectedAges = new Set(facts.lifeFlow.map((item) => item.startAge));
  if (parsed.lifeFlow.some((item) => !expectedAges.has(item.startAge))) {
    throw new Error("ADULT_V2_LIFE_FLOW_EVIDENCE_MISMATCH");
  }
  const allCopy = JSON.stringify(parsed);
  if (/(반드시|무조건|큰돈을\s*번|돈이\s*들어온|이직한|결혼한|헤어진|임신한|사고가\s*난|건강이\s*나빠|성공한|실패한)/.test(allCopy)) {
    throw new Error("ADULT_V2_UNSUPPORTED_CERTAINTY");
  }
  return parsed;
}
