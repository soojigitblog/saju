import type { AdultV2PreviewData } from "./preview-sample";
import type { AdultV2ReportData } from "./report-data";

function prominence(score: number): "quiet" | "steady" | "rising" | "focused" | "turning" {
  if (score >= 70) return "focused";
  if (score >= 55) return "rising";
  if (score >= 40) return "turning";
  if (score >= 25) return "steady";
  return "quiet";
}

/** Presentation-only adapter. It never reaches calculation or AI generation. */
export function adultV2ReportToPresentation(data: AdultV2ReportData): AdultV2PreviewData {
  const yearlyCopy = new Map(data.interpretation.years.map((item) => [item.year, item]));
  const flowCopy = new Map(data.interpretation.lifeFlow.map((item) => [item.startAge, item]));
  const strongest = data.calculation.themes.slice(0, 2).map((item) => item.label);
  return {
    subject: data.subject,
    year: data.calculation.generatedForYear,
    subtitle: data.interpretation.subtitle,
    coreWords: data.interpretation.coreWords,
    portrait: {
      ...data.interpretation.portrait,
      context: "이 리포트는 계산으로 확인된 신호와, 그 신호가 생활에서 보일 수 있는 장면을 함께 읽습니다.",
    },
    tendencies: data.interpretation.tendencies,
    lifeFlow: data.calculation.lifeFlow.map((fact) => ({
      ageRange: `${fact.startAge}–${fact.endAge}`,
      theme: flowCopy.get(fact.startAge)?.title ?? `${fact.themes[0]?.label ?? "현재 테마"}이 드러나는 구간`,
      change: fact.changePressure.label,
      prominence: prominence(fact.themes[0]?.score ?? 0),
      current: fact.current,
    })),
    years: data.calculation.nextFiveYears.map((fact, index) => {
      const copy = yearlyCopy.get(fact.year)!;
      return {
        year: String(fact.year),
        headline: copy.headline,
        primaryTheme: `${fact.primaryTheme.label} 테마 ${fact.primaryTheme.level}`,
        secondaryTheme: `${fact.secondaryTheme.label} 테마 ${fact.secondaryTheme.level}`,
        changePressure: fact.changePressure.label,
        keywords: copy.keywords.map((item) => `#${item.replace(/^#/, "")}`),
        interpretation: copy.interpretation,
        current: index === 0,
      };
    }),
    themes: data.calculation.themes.slice(0, 4).map((item) => ({
      label: item.label,
      level: item.level,
      width: `${Math.max(8, item.score)}%`,
    })),
    relationship: data.interpretation.relationships,
    family: data.interpretation.family,
    actionGuide: data.interpretation.actionGuide,
    lifeMap: {
      axes: [
        { label: "자원", x: 150, y: 27 }, { label: "역할", x: 272, y: 116 },
        { label: "표현", x: 225, y: 260 }, { label: "관계", x: 75, y: 260 },
        { label: "변화", x: 28, y: 116 },
      ],
      strongestThemes: `${strongest.join(", ")}이 현재 가장 전면에 나타나는 두 가지 주제입니다. ${data.calculation.current.changePressure.label} 신호는 변화의 속도와 우선순위를 점검하는 데 참고할 수 있습니다.`,
    },
    crossReading: [{ label: "사주 × 타로 교차리딩", body: data.crossReading.message }],
    tarotCardLabel: null,
  };
}
