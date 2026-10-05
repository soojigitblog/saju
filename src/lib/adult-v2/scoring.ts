import type { FortuneEvidence, FortuneScore, LifeMapScores, ScoreArea } from "./types";

export const SCORE_AREAS: readonly ScoreArea[] = [
  "overall",
  "money",
  "career",
  "relationship",
  "loveFamily",
  "condition",
] as const;

/**
 * V2 uses deliberately narrow weights: a ten-god weight denotes a
 * deterministic domain indicator, not a promised real-world outcome. Only
 * validated six-clash relations subtract points. This keeps normal results in
 * the 35–85 operating range.
 */
export const FORTUNE_SCORE_WEIGHTS = {
  base: 50,
  positive: { TEN_GOD: 3, ELEMENT: 2, CLASH: 0 },
  caution: { TEN_GOD: 0, ELEMENT: 0, CLASH: -6 },
  overallSecondary: { positive: 1, caution: -2 },
  softRange: { min: 35, max: 85 },
  absoluteRange: { min: 0, max: 100 },
} as const;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function evidenceWeight(evidence: FortuneEvidence): number {
  if (evidence.effect === "positive") return FORTUNE_SCORE_WEIGHTS.positive[evidence.type];
  if (evidence.effect === "caution") return FORTUNE_SCORE_WEIGHTS.caution[evidence.type];
  return 0;
}

function levelFor(score: number): FortuneScore["level"] {
  if (score >= 65) return "strong";
  if (score <= 45) return "caution";
  return "steady";
}

function scoreFor(area: ScoreArea, allEvidence: FortuneEvidence[]): FortuneScore {
  const evidence = allEvidence.filter(
    (item) => item.target === area || (area === "overall" && item.target !== "overall")
  );
  const rawDelta = evidence.reduce((sum, item) => {
    const direct = evidenceWeight(item);
    if (area === "overall" && item.target !== "overall") {
      if (item.effect === "positive") return sum + FORTUNE_SCORE_WEIGHTS.overallSecondary.positive;
      if (item.effect === "caution") return sum + FORTUNE_SCORE_WEIGHTS.overallSecondary.caution;
    }
    return sum + direct;
  }, 0);
  // The soft clamp is intentional: outside values require future strong,
  // independently validated evidence rules rather than a single interaction.
  const score = clamp(
    clamp(FORTUNE_SCORE_WEIGHTS.base + rawDelta, FORTUNE_SCORE_WEIGHTS.softRange.min, FORTUNE_SCORE_WEIGHTS.softRange.max),
    FORTUNE_SCORE_WEIGHTS.absoluteRange.min,
    FORTUNE_SCORE_WEIGHTS.absoluteRange.max
  );
  return {
    score,
    level: levelFor(score),
    evidence,
    positiveFactors: evidence.filter((item) => item.effect === "positive"),
    cautionFactors: evidence.filter((item) => item.effect === "caution"),
  };
}

/** Deterministic: same Evidence array always produces the same result. */
export function calculateLifeMapScores(evidence: FortuneEvidence[]): LifeMapScores {
  return Object.fromEntries(SCORE_AREAS.map((area) => [area, scoreFor(area, evidence)])) as LifeMapScores;
}
