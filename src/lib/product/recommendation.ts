/**
 * PHASE P2.3 — Rule-based product recommendation (no extra AI call).
 *
 * - Strong domain → that Focus
 * - Two-way tie → user intent selection (NOT arbitrary Money)
 * - Three-way tie → Total
 * - Business priority must not distort recommendation
 */

import type { InterpretationContextV2 } from "@/lib/ai/interpretation-context-v2";
import type { PortfolioProductId } from "@/lib/product/portfolio";
import { PRODUCT_ROLES } from "@/lib/product/portfolio";
import { USER_INTENT_OPTIONS } from "@/lib/product/monetization-p23";

export type PaidFocusId = "money" | "career" | "love" | "total";

export type ProductRecommendation = {
  productId: PortfolioProductId;
  slug: string | null;
  reason: string;
  score: number;
  /** Normalized 0–1 for explainability */
  scoreNormalized: number;
  source:
    | "domain_signal"
    | "user_intent"
    | "next_question"
    | "fallback_catalog"
    | "suppressed";
};

export type TieBreakMode = "strong" | "two_way_intent" | "three_way_total";

export type PrimaryRecommendationResult = {
  primary: ProductRecommendation | null;
  alternatives: ProductRecommendation[];
  explainability: string;
  tieBreak: TieBreakMode;
  needsUserIntent: boolean;
  intentOptions: typeof USER_INTENT_OPTIONS;
  /** true when Money-first launch bias is NOT used */
  arbitraryMoneyBiasRemoved: true;
};

export type NextBestResult = {
  next: ProductRecommendation[];
  suppressed: PaidFocusId[];
};

const CONFIDENCE_SCORE = { high: 3, medium: 2, low: 1 } as const;

const SLUG: Record<PaidFocusId, string> = {
  money: "2026-money",
  career: "2026-career",
  love: "2026-love",
  total: "2026-total",
};

export type FocusScore = {
  id: Exclude<PaidFocusId, "total">;
  score: number;
  scoreNormalized: number;
  hook: string;
};

export function computeFocusScores(v2: InterpretationContextV2): FocusScore[] {
  const moneyCard = v2.behaviorHypotheses.find((c) => c.id === "money-threshold");
  const workCard = v2.behaviorHypotheses.find((c) => c.id === "work-environment");
  const loveCard = v2.behaviorHypotheses.find((c) => c.id === "love-distance");
  const moneyDomain = v2.domainSignals.find((d) => d.domain === "money");
  const workDomain = v2.domainSignals.find((d) => d.domain === "work");
  const loveDomain = v2.domainSignals.find((d) => d.domain === "love");

  const scoreFrom = (
    card: typeof moneyCard,
    domain: typeof moneyDomain
  ): number => {
    if (!card) return 0;
    const conf = CONFIDENCE_SCORE[card.confidence] ?? 1;
    const axes = card.evidenceAxisIds.length;
    const domainBoost = domain?.signalSummary.length ?? 0;
    return conf * 10 + axes * 3 + domainBoost * 2 + card.triggerConditions.length;
  };

  const raw = [
    {
      id: "money" as const,
      score: scoreFrom(moneyCard, moneyDomain),
      hook: moneyDomain?.signalSummary[0] ?? moneyCard?.shareableLine ?? "돈 판단 패턴",
    },
    {
      id: "career" as const,
      score: scoreFrom(workCard, workDomain),
      hook: workDomain?.signalSummary[0] ?? workCard?.shareableLine ?? "일 환경 패턴",
    },
    {
      id: "love" as const,
      score: scoreFrom(loveCard, loveDomain),
      hook: loveDomain?.signalSummary[0] ?? loveCard?.shareableLine ?? "관계 패턴",
    },
  ];
  const max = Math.max(...raw.map((r) => r.score), 1);
  return raw.map((r) => ({
    ...r,
    scoreNormalized: Number((r.score / max).toFixed(2)),
  }));
}

function reasonForFocus(id: PaidFocusId, hook: string): string {
  switch (id) {
    case "money":
      return `이번 결과에서는 돈 판단·사각지대 신호가 분명해, 재물 분석을 먼저 추천합니다. (${hook})`;
    case "career":
      return `이번 결과에서는 일을 맡고 끝내는 방식에서 강한 특징이 보여, 커리어 분석을 먼저 추천합니다. (${hook})`;
    case "love":
      return `이번 결과에서는 관계가 깊어질수록 달라지는 패턴이 보여, 연애·관계 분석을 먼저 추천합니다. (${hook})`;
    case "total":
      return "영역별 신호가 고르게 보여, 연결형 종합 리포트를 먼저 추천합니다.";
  }
}

function toRec(
  id: PaidFocusId,
  score: number,
  scoreNormalized: number,
  hook: string,
  source: ProductRecommendation["source"]
): ProductRecommendation {
  return {
    productId: id,
    slug: SLUG[id],
    reason: reasonForFocus(id, hook),
    score,
    scoreNormalized,
    source,
  };
}

/**
 * Free 결과 이후 Primary.
 * UX: two-way tie → “지금 더 궁금한 건?” 선택 (대안 A 채택).
 * three-way → Total.
 * Money 강제 우선순위 제거.
 */
export function recommendPrimaryProduct(
  v2: InterpretationContextV2,
  options?: {
    closeGap?: number;
    /** Normalized gap; used when scores are passed as ratios */
    closeGapNormalized?: number;
    userIntent?: Exclude<PaidFocusId, never> | null;
  }
): PrimaryRecommendationResult {
  const closeGap = options?.closeGap ?? 4;
  const closeGapNorm = options?.closeGapNormalized ?? 0.12;
  const ranked = computeFocusScores(v2).sort((a, b) => b.score - a.score);
  const top = ranked[0]!;
  const nearTop = ranked.filter(
    (r) =>
      top.score - r.score < closeGap ||
      top.scoreNormalized - r.scoreNormalized < closeGapNorm
  );

  const intentOptions = USER_INTENT_OPTIONS;
  const alternativesBase: ProductRecommendation[] = ranked.map((r) =>
    toRec(r.id, r.score, r.scoreNormalized, r.hook, "domain_signal")
  );

  // User already chose intent
  if (options?.userIntent) {
    const intent = options.userIntent;
    const meta = ranked.find((r) => r.id === intent);
    const primary =
      intent === "total"
        ? toRec("total", top.score, 1, "전체적인 나", "user_intent")
        : toRec(
            intent,
            meta?.score ?? top.score,
            meta?.scoreNormalized ?? 1,
            meta?.hook ?? top.hook,
            "user_intent"
          );
    return {
      primary,
      alternatives: alternativesBase.filter((a) => a.productId !== intent),
      explainability: primary.reason,
      tieBreak: nearTop.length >= 3 ? "three_way_total" : nearTop.length >= 2 ? "two_way_intent" : "strong",
      needsUserIntent: false,
      intentOptions,
      arbitraryMoneyBiasRemoved: true,
    };
  }

  if (nearTop.length >= 3) {
    const primary = toRec("total", top.score, 1, "영역 신호가 고름", "fallback_catalog");
    return {
      primary,
      alternatives: alternativesBase,
      explainability: primary.reason,
      tieBreak: "three_way_total",
      needsUserIntent: false,
      intentOptions,
      arbitraryMoneyBiasRemoved: true,
    };
  }

  if (nearTop.length >= 2) {
    return {
      primary: null,
      alternatives: alternativesBase,
      explainability:
        "돈·일·관계 중 신호가 비슷한 영역이 있어, 지금 더 궁금한 쪽을 고르는 편이 만족도가 높습니다.",
      tieBreak: "two_way_intent",
      needsUserIntent: true,
      intentOptions,
      arbitraryMoneyBiasRemoved: true,
    };
  }

  const primary = toRec(top.id, top.score, top.scoreNormalized, top.hook, "domain_signal");
  const alternatives = [
    ...alternativesBase.filter((a) => a.productId !== top.id),
    {
      productId: "total" as const,
      slug: SLUG.total,
      reason: PRODUCT_ROLES.total.uvp,
      score: Math.max(0, top.score - 5),
      scoreNormalized: Number(((top.score - 5) / Math.max(top.score, 1)).toFixed(2)),
      source: "fallback_catalog" as const,
    },
  ];

  return {
    primary,
    alternatives,
    explainability: primary.reason,
    tieBreak: "strong",
    needsUserIntent: false,
    intentOptions,
    arbitraryMoneyBiasRemoved: true,
  };
}

const QUESTION_HINTS: Array<{ pattern: RegExp; product: PortfolioProductId }> = [
  { pattern: /돈|재물|지출|수입|정산/, product: "money" },
  { pattern: /일|직장|이직|위임|조직|업무|커리어/, product: "career" },
  { pattern: /연애|관계|사랑|거리|확신/, product: "love" },
  { pattern: /연결|전체|종합|영역|충돌/, product: "total" },
  { pattern: /타로|지금|고민|제안|이 사람|이 문제|받아야/, product: "tarot_paid" },
  { pattern: /더 깊게|한 가지|추가|묻/, product: "additional" },
];

function mapQuestionToProduct(q: string): PortfolioProductId | null {
  for (const h of QUESTION_HINTS) {
    if (h.pattern.test(q)) return h.product;
  }
  return null;
}

const DEFAULT_NEXT: Record<PaidFocusId, PortfolioProductId[]> = {
  money: ["career", "tarot_paid", "total"],
  career: ["tarot_paid", "money", "total"],
  love: ["tarot_paid", "total", "additional"],
  total: ["tarot_paid", "additional", "money", "career", "love"],
};

/**
 * 구매 후 Next Best — 이미 산 상품 Primary 재노출 금지.
 * Upsell은 결과 소비 후(report_end / my-results)에만.
 */
export function recommendNextBestProducts(input: {
  purchased: PaidFocusId[];
  possibleNextQuestions?: string[];
  limit?: number;
}): NextBestResult {
  const limit = input.limit ?? 3;
  const suppressed = [...input.purchased];
  const purchasedSet = new Set<PortfolioProductId>(input.purchased);
  const scored = new Map<PortfolioProductId, { score: number; reason: string }>();

  for (const q of input.possibleNextQuestions ?? []) {
    const p = mapQuestionToProduct(q);
    if (!p || purchasedSet.has(p as PaidFocusId)) continue;
    const prev = scored.get(p);
    scored.set(p, {
      score: (prev?.score ?? 0) + 5,
      reason: prev?.reason ?? `다음 질문에서 자연스럽게 이어집니다: “${q.slice(0, 40)}”`,
    });
  }

  const lastPurchased = input.purchased[input.purchased.length - 1];
  if (lastPurchased) {
    for (const cand of DEFAULT_NEXT[lastPurchased]) {
      if (purchasedSet.has(cand as PaidFocusId)) continue;
      if (!scored.has(cand)) {
        const label =
          PRODUCT_ROLES[cand as keyof typeof PRODUCT_ROLES]?.recommendedName ??
          cand;
        scored.set(cand, {
          score: 2,
          reason:
            lastPurchased === "total" && (cand === "money" || cand === "career" || cand === "love")
              ? `${label} — 전체에서 본 패턴 중 이 영역만 2~3배 깊게.`
              : lastPurchased !== "total" && cand === "total" && input.purchased.length >= 2
                ? "이미 본 영역들이 내 안에서 어떻게 연결·충돌하는지."
                : `${PRODUCT_ROLES[lastPurchased].recommendedName} 다음으로 이어지기 쉬운 질문입니다.`,
        });
      }
    }
  }

  const next: ProductRecommendation[] = [...scored.entries()]
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, limit)
    .map(([productId, meta]) => ({
      productId,
      slug:
        productId === "money" ||
        productId === "career" ||
        productId === "love" ||
        productId === "total"
          ? SLUG[productId]
          : null,
      reason: meta.reason,
      score: meta.score,
      scoreNormalized: 1,
      source: "next_question",
    }));

  return { next, suppressed };
}

export function alreadyPurchasedLabel(): string {
  return "이미 본 리포트";
}

/** Two-way UX choice: intent picker over forcing Total (A > B for two-way). */
export function twoWayTieUxRecommendation(): {
  preferred: "user_intent";
  alternative: "total";
  reason: string;
} {
  return {
    preferred: "user_intent",
    alternative: "total",
    reason:
      "두 Domain만 강할 때 Total로 보내면 관심 없는 영역까지 사게 되어 만족도가 떨어질 수 있다. ‘지금 더 궁금한 건?’ 한 번이 전환·만족 모두에 낫다.",
  };
}
