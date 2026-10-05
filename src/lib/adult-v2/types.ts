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
  themeActivation: TenGodThemeActivations;
  changePressure: ChangePressureScore;
  analysisCoverage: AnalysisCoverage;
  validationStatus: CalculationValidationStatus;
};

/** Reserved for the later language layer. It must never contain calculation inputs. */
export type AIInterpretationData = {
  summary: string;
  themeExplanations: Partial<Record<TenGodTheme, string>>;
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
export type TenGodTheme =
  | "wealthResource"
  | "responsibilityRole"
  | "learningSupport"
  | "expressionOutput"
  | "selfPeerCompetition";

export type FortuneEvidence = {
  id: string;
  type: EvidenceType;
  effect: EvidenceEffect;
  /** Only TEN_GOD evidence currently has a scored theme. */
  theme?: TenGodTheme;
  source: "annualStem" | "daeunStem" | "annualBranch" | "daeunBranch";
  detail: string;
  tenGod?: TenGodLabel;
  element?: ElementKey;
  relation?: "충";
};

export type TenGodThemeActivation = {
  theme: TenGodTheme;
  score: number;
  level: "low" | "normal" | "high" | "very_high";
  evidence: FortuneEvidence[];
};

export type TenGodThemeActivations = Record<TenGodTheme, TenGodThemeActivation>;

export type ChangePressureScore = {
  score: number;
  level: "low" | "normal" | "high";
  evidence: FortuneEvidence[];
};

/** Analysis input coverage, not a forecast-accuracy probability. */
export type AnalysisCoverage = {
  score: number;
  level: "limited" | "normal" | "sufficient";
  availableSources: Array<"natal" | "birthTime" | "annual" | "daeun">;
  missingSources: Array<"birthTime" | "daeun">;
};

/** Internal QA metadata. It must not be represented as customer-facing accuracy. */
export type CalculationValidationStatus = {
  natal: "validated";
  solarTerm: "validated";
  daeun: "provider_verified";
  daeunExternal: "pending";
};

/** Reserved only for a future, separately validated favorability engine. */
export type FavorabilityScore = {
  score: number;
  rationale: string[];
};
