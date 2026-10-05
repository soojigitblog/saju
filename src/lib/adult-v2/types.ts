import type {
  BranchInfo,
  ElementKey,
  FortuneChart,
  GanjiInfo,
  Pillar,
  StemInfo,
  TenGodLabel,
} from "@/lib/fortune-engine/types";

/** V2 calculation data. This is intentionally separate from AI-authored copy. */
export type CalculatedFortuneData = {
  natal: FortuneChart;
  daeun: DaeunCalculation;
  annual: AnnualFortune;
  selectedDaeun: DaeunPeriod | null;
  evidence: FortuneEvidence[];
  scores: LifeMapScores;
};

/** Reserved for the later language layer. It must never contain calculation inputs. */
export type AIInterpretationData = {
  summary: string;
  scoreExplanations: Partial<Record<ScoreArea, string>>;
};

export type AdultReportV2 = {
  reportVersion: "adult-v2";
  engineVersion: string;
  calculated: CalculatedFortuneData;
  interpretation?: AIInterpretationData;
};

export type DaeunDirection = "forward" | "backward";

export type DaeunPeriod = {
  index: number;
  ganji: GanjiInfo;
  stem: StemInfo;
  branch: BranchInfo;
  startAge: number;
  endAge: number;
  startYear: number;
  endYear: number;
};

export type DaeunCalculation = {
  direction: DaeunDirection;
  startAge: number;
  startAgeExact: { years: number; months: number; days: number };
  /** Calendar display derived from manseryeok's start components, not a second calculation. */
  startDate: string;
  method: "manseryeok_luck_pillars";
  caveats: string[];
  periods: DaeunPeriod[];
};

export type AnnualFortune = {
  year: number;
  pillar: Pillar;
  /** Se-un year boundary is the exact Lichun instant, never January 1. */
  startsAtKst: string;
  method: "manseryeok_lichun_year_pillar";
};

export type EvidenceEffect = "positive" | "caution" | "neutral";
export type EvidenceType = "TEN_GOD" | "ELEMENT" | "CLASH";
export type ScoreArea =
  | "overall"
  | "money"
  | "career"
  | "relationship"
  | "loveFamily"
  | "condition";

export type FortuneEvidence = {
  id: string;
  type: EvidenceType;
  effect: EvidenceEffect;
  target: ScoreArea;
  source: "annualStem" | "daeunStem" | "annualBranch" | "daeunBranch";
  detail: string;
  tenGod?: TenGodLabel;
  element?: ElementKey;
  relation?: "충";
};

export type FortuneScore = {
  score: number;
  level: "caution" | "steady" | "strong";
  evidence: FortuneEvidence[];
  positiveFactors: FortuneEvidence[];
  cautionFactors: FortuneEvidence[];
};

export type LifeMapScores = Record<ScoreArea, FortuneScore>;
