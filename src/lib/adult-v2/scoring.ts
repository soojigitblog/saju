import type {
  ActivationDomain,
  ChangePressureScore,
  DomainActivationScore,
  DomainActivationScores,
  EvidenceCoverage,
  FortuneEvidence,
} from "./types";

export const ACTIVATION_DOMAINS: readonly ActivationDomain[] = [
  "money", "career", "relationship", "loveFamily", "condition",
] as const;

/**
 * These weights express how much calculation evidence activates a topic.
 * They are not favorability weights and must not be rendered as fortune,
 * success, income, health, or relationship outcome scores.
 */
export const ACTIVATION_SCORE_WEIGHTS = {
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

function activationLevel(score: number): DomainActivationScore["level"] {
  if (score >= 75) return "very_high";
  if (score >= 50) return "high";
  if (score >= 25) return "normal";
  return "low";
}

function activationWeight(item: FortuneEvidence): number {
  if (item.type !== "TEN_GOD" || item.effect !== "activation") return 0;
  if (item.source === "annualStem") return ACTIVATION_SCORE_WEIGHTS.tenGod.annualStem;
  if (item.source === "daeunStem") return ACTIVATION_SCORE_WEIGHTS.tenGod.daeunStem;
  return 0;
}

function activationFor(
  domain: ActivationDomain,
  allEvidence: FortuneEvidence[]
): DomainActivationScore {
  const evidence = allEvidence.filter(
    (item) => item.effect === "activation" && item.domain === domain
  );
  const score = clamp(
    ACTIVATION_SCORE_WEIGHTS.base + evidence.reduce((sum, item) => sum + activationWeight(item), 0),
    ACTIVATION_SCORE_WEIGHTS.range.min,
    ACTIVATION_SCORE_WEIGHTS.range.max
  );
  return { domain, score, level: activationLevel(score), evidence };
}

/** Deterministic domain-topic intensity; deliberately not a fortune rating. */
export function calculateDomainActivation(evidence: FortuneEvidence[]): DomainActivationScores {
  return Object.fromEntries(
    ACTIVATION_DOMAINS.map((domain) => [domain, activationFor(domain, evidence)])
  ) as DomainActivationScores;
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

export function calculateEvidenceCoverage(input: {
  birthTimeKnown: boolean;
  hasDaeun: boolean;
}): EvidenceCoverage {
  const availableSources: EvidenceCoverage["availableSources"] = ["natal", "annual"];
  const missingSources: EvidenceCoverage["missingSources"] = [];
  let score = 55;
  if (input.birthTimeKnown) {
    availableSources.push("birthTime");
    score += 20;
  } else {
    missingSources.push("birthTime");
  }
  if (input.hasDaeun) {
    availableSources.push("daeun");
    score += 25;
  } else {
    missingSources.push("daeun");
  }
  const normalized = clamp(score, 0, 100);
  return {
    score: normalized,
    level: normalized >= 75 ? "strong" : normalized >= 55 ? "moderate" : "limited",
    availableSources,
    missingSources,
  };
}
