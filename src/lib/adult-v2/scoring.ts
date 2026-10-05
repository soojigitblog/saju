import type {
  AnalysisCoverage,
  ChangePressureScore,
  FortuneEvidence,
  TenGodTheme,
  TenGodThemeActivation,
  TenGodThemeActivations,
} from "./types";

export const TEN_GOD_THEMES: readonly TenGodTheme[] = [
  "wealthResource", "responsibilityRole", "learningSupport", "expressionOutput", "selfPeerCompetition",
] as const;

/**
 * These weights express how much calculation evidence activates a topic.
 * They are not favorability weights and must not be rendered as fortune,
 * success, income, health, or relationship outcome scores.
 */
export const THEME_ACTIVATION_WEIGHTS = {
  base: 20,
  tenGod: { annualStem: 30, daeunStem: 25 },
  range: { min: 0, max: 100 },
} as const;

/** A clash is change/friction evidence, not an unfavorable forecast. */
export const CHANGE_PRESSURE_WEIGHTS = {
  annualBranchClash: 35,
  daeunBranchClash: 25,
  range: { min: 0, max: 100 },
} as const;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function activationLevel(score: number): TenGodThemeActivation["level"] {
  if (score >= 75) return "very_high";
  if (score >= 50) return "high";
  if (score >= 25) return "normal";
  return "low";
}

function activationWeight(item: FortuneEvidence): number {
  if (item.type !== "TEN_GOD" || item.effect !== "activation") return 0;
  if (item.source === "annualStem") return THEME_ACTIVATION_WEIGHTS.tenGod.annualStem;
  if (item.source === "daeunStem") return THEME_ACTIVATION_WEIGHTS.tenGod.daeunStem;
  return 0;
}

function activationFor(
  theme: TenGodTheme,
  allEvidence: FortuneEvidence[]
): TenGodThemeActivation {
  const evidence = allEvidence.filter(
    (item) => item.effect === "activation" && item.theme === theme
  );
  const score = clamp(
    THEME_ACTIVATION_WEIGHTS.base + evidence.reduce((sum, item) => sum + activationWeight(item), 0),
    THEME_ACTIVATION_WEIGHTS.range.min,
    THEME_ACTIVATION_WEIGHTS.range.max
  );
  return { theme, score, level: activationLevel(score), evidence };
}

/** This index measures signal prominence, not fortune favorability. */
export function calculateTenGodThemeActivation(evidence: FortuneEvidence[]): TenGodThemeActivations {
  return Object.fromEntries(
    TEN_GOD_THEMES.map((theme) => [theme, activationFor(theme, evidence)])
  ) as TenGodThemeActivations;
}

export function calculateChangePressure(evidence: FortuneEvidence[]): ChangePressureScore {
  const clashEvidence = evidence.filter((item) => item.type === "CLASH" && item.effect === "change");
  const score = clamp(clashEvidence.reduce((sum, item) => {
    if (item.source === "annualBranch") return sum + CHANGE_PRESSURE_WEIGHTS.annualBranchClash;
    if (item.source === "daeunBranch") return sum + CHANGE_PRESSURE_WEIGHTS.daeunBranchClash;
    return sum;
  }, 0), CHANGE_PRESSURE_WEIGHTS.range.min, CHANGE_PRESSURE_WEIGHTS.range.max);
  return {
    score,
    level: score >= 50 ? "high" : score >= 20 ? "normal" : "low",
    evidence: clashEvidence,
  };
}

export function calculateAnalysisCoverage(input: {
  birthTimeKnown: boolean;
  hasDaeun: boolean;
}): AnalysisCoverage {
  const availableSources: AnalysisCoverage["availableSources"] = ["natal", "annual"];
  const missingSources: AnalysisCoverage["missingSources"] = [];
  let score = 50;
  if (input.birthTimeKnown) {
    availableSources.push("birthTime");
    score += 20;
  } else {
    missingSources.push("birthTime");
  }
  if (input.hasDaeun) {
    availableSources.push("daeun");
    score += 20;
  } else {
    missingSources.push("daeun");
  }
  const normalized = clamp(score, 0, 100);
  return {
    score: normalized,
    // Missing time materially limits the usable natal chart even where the
    // remaining evidence is internally consistent.
    level: !input.birthTimeKnown ? "limited" : normalized >= 70 ? "sufficient" : "normal",
    availableSources,
    missingSources,
  };
}

/** QA-only: provider data is tested, but independent daeun validation is pending. */
export function getCalculationValidationStatus() {
  return {
    natal: "validated",
    solarTerm: "validated",
    daeun: "provider_verified",
    daeunExternal: "pending",
  } as const;
}
