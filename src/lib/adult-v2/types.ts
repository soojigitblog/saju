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
  activation: DomainActivationScores;
  changePressure: ChangePressureScore;
  confidence: EvidenceCoverage;
};

/** Reserved for the later language layer. It must never contain calculation inputs. */
export type AIInterpretationData = {
  summary: string;
  activationExplanations: Partial<Record<ActivationDomain, string>>;
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

/** Calculation roles; none indicate real-world good/bad fortune. */
export type EvidenceEffect = "activation" | "context" | "change";
export type EvidenceType = "TEN_GOD" | "ELEMENT" | "CLASH";
export type ActivationDomain =
  | "money"
  | "career"
  | "relationship"
  | "loveFamily"
  | "condition";

export type FortuneEvidence = {
  id: string;
  type: EvidenceType;
  effect: EvidenceEffect;
  /** Only TEN_GOD evidence currently has a scored activation domain. */
  domain?: ActivationDomain;
  source: "annualStem" | "daeunStem" | "annualBranch" | "daeunBranch";
  detail: string;
  tenGod?: TenGodLabel;
  element?: ElementKey;
  relation?: "충";
};

export type DomainActivationScore = {
  domain: ActivationDomain;
  score: number;
  level: "low" | "normal" | "high" | "very_high";
  evidence: FortuneEvidence[];
};

export type DomainActivationScores = Record<ActivationDomain, DomainActivationScore>;

export type ChangePressureScore = {
  score: number;
  level: "low" | "normal" | "high";
  evidence: FortuneEvidence[];
};

/** Evidence coverage, not a forecast-accuracy probability. */
export type EvidenceCoverage = {
  score: number;
  level: "limited" | "moderate" | "strong";
  availableSources: Array<"natal" | "birthTime" | "annual" | "daeun">;
  missingSources: Array<"birthTime" | "daeun">;
};

/** Reserved only for a future, separately validated favorability engine. */
export type FavorabilityScore = {
  score: number;
  rationale: string[];
};
