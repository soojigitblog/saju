import { STEMS } from "@/lib/fortune-engine/constants";
import { tenGodForTarget } from "@/lib/fortune-engine/calculators/ten-gods";
import type { ElementKey, FortuneChart, StemInfo, TenGodLabel } from "@/lib/fortune-engine/types";
import type { AnnualFortune, DaeunPeriod, FortuneEvidence, ScoreArea } from "./types";

const CLASH_PAIRS = new Map<number, number>([
  [0, 6], [6, 0], // 子-午
  [1, 7], [7, 1], // 丑-未
  [2, 8], [8, 2], // 寅-申
  [3, 9], [9, 3], // 卯-酉
  [4, 10], [10, 4], // 辰-戌
  [5, 11], [11, 5], // 巳-亥
]);

function tenGodTarget(tenGod: TenGodLabel): ScoreArea {
  if (tenGod === "편재" || tenGod === "정재") return "money";
  if (tenGod === "편관" || tenGod === "정관") return "career";
  if (tenGod === "편인" || tenGod === "정인") return "condition";
  if (tenGod === "비견" || tenGod === "겁재") return "relationship";
  if (tenGod === "식신" || tenGod === "상관") return "loveFamily";
  return "overall";
}

function evidenceForStem(input: {
  id: string;
  source: "annualStem" | "daeunStem";
  sourceLabel: string;
  dayMaster: StemInfo;
  stem: StemInfo;
}): FortuneEvidence {
  const tenGod = tenGodForTarget(input.dayMaster, input.stem);
  return {
    id: input.id,
    type: "TEN_GOD",
    // This means a deterministic domain indicator is present, not that a
    // real-world outcome is guaranteed. Strength/useful-god inference is
    // deliberately excluded from the rule.
    effect: "positive",
    target: tenGodTarget(tenGod),
    source: input.source,
    tenGod,
    detail: `${input.sourceLabel} 천간 ${input.stem.hanja}은(는) 일간 ${input.dayMaster.hanja} 기준 ${tenGod}입니다.`,
  };
}

function elementEvidence(input: {
  id: string;
  source: "annualStem" | "daeunStem";
  sourceLabel: string;
  element: ElementKey;
  visibleCount: number;
}): FortuneEvidence | null {
  if (input.visibleCount > 1 && input.visibleCount < 3) return null;
  const state = input.visibleCount <= 1 ? "적게 나타나는" : "많이 나타나는";
  return {
    id: input.id,
    type: "ELEMENT",
    // Visible counts are facts, but favorable/unfavorable balance cannot be
    // concluded without a separately validated strength/useful-god engine.
    effect: "neutral",
    target: "overall",
    source: input.source,
    element: input.element,
    detail: `원국의 표면 오행 집계에서 ${input.element}은(는) ${input.visibleCount}회(${state} 편)이고, ${input.sourceLabel} 천간도 ${input.element}입니다.`,
  };
}

function branchClashes(input: {
  source: "annualBranch" | "daeunBranch";
  sourceLabel: string;
  sourceBranch: { index: number; hanja: string };
  chart: FortuneChart;
}): FortuneEvidence[] {
  const natalBranches = [
    ["년지", input.chart.pillars.year.branch],
    ["월지", input.chart.pillars.month.branch],
    ["일지", input.chart.pillars.day.branch],
    ...(input.chart.pillars.hour ? [["시지", input.chart.pillars.hour.branch] as const] : []),
  ] as const;
  return natalBranches.flatMap(([label, branch]) => {
    if (CLASH_PAIRS.get(input.sourceBranch.index) !== branch.index) return [];
    return [{
      id: `clash:${input.source}:${input.sourceBranch.index}:${branch.index}:${label}`,
      type: "CLASH" as const,
      effect: "caution" as const,
      target: "relationship" as const,
      source: input.source,
      relation: "충" as const,
      detail: `${input.sourceLabel} 지지 ${input.sourceBranch.hanja}와 원국 ${label} ${branch.hanja}는 육충 관계입니다.`,
    }];
  });
}

/**
 * Creates only reproducible relationship facts. No 합·형·파·해, 신강/신약,
 * or 용신 inference is present because this release has no validated engine
 * for those concepts.
 */
export function buildFortuneEvidence(input: {
  chart: FortuneChart;
  annual: AnnualFortune;
  daeun: DaeunPeriod | null;
}): FortuneEvidence[] {
  const { chart, annual, daeun } = input;
  const elementCounts = chart.fiveElements;
  const evidence: FortuneEvidence[] = [
    evidenceForStem({
      id: `ten-god:annual:${annual.year}`,
      source: "annualStem",
      sourceLabel: `${annual.year} 세운`,
      dayMaster: chart.dayMaster,
      stem: annual.pillar.stem,
    }),
    ...branchClashes({
      source: "annualBranch",
      sourceLabel: `${annual.year} 세운`,
      sourceBranch: annual.pillar.branch,
      chart,
    }),
  ];
  const annualElement = annual.pillar.stem.element;
  const annualElementFact = elementEvidence({
    id: `element:annual:${annual.year}:${annualElement}`,
    source: "annualStem",
    sourceLabel: `${annual.year} 세운`,
    element: annualElement,
    visibleCount: elementCounts[annualElement],
  });
  if (annualElementFact) evidence.push(annualElementFact);

  if (daeun) {
    evidence.push(
      evidenceForStem({
        id: `ten-god:daeun:${daeun.index}`,
        source: "daeunStem",
        sourceLabel: `${daeun.index}번째 대운`,
        dayMaster: chart.dayMaster,
        stem: daeun.stem,
      }),
      ...branchClashes({
        source: "daeunBranch",
        sourceLabel: `${daeun.index}번째 대운`,
        sourceBranch: daeun.branch,
        chart,
      })
    );
    const daeunElementFact = elementEvidence({
      id: `element:daeun:${daeun.index}:${daeun.stem.element}`,
      source: "daeunStem",
      sourceLabel: `${daeun.index}번째 대운`,
      element: daeun.stem.element,
      visibleCount: elementCounts[daeun.stem.element],
    });
    if (daeunElementFact) evidence.push(daeunElementFact);
  }
  return evidence;
}

/** Exported for fixture-level checks and future verified rule additions. */
export const SIX_CLASH_BRANCH_PAIRS = CLASH_PAIRS;
export const BRANCH_MAIN_STEMS = STEMS;
