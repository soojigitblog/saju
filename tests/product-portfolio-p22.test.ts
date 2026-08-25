import { describe, expect, it } from "vitest";
import { fortuneEngine } from "@/lib/fortune-engine";
import { buildFortuneAiContext } from "@/lib/ai/context";
import { buildInterpretationContextV2 } from "@/lib/ai/interpretation-context-v2";
import { buildMockPaidResult } from "@/lib/ai/interpreters/mock-content";
import { comparePaidReportOverlap } from "@/lib/ai/validators/paid-quality-v2";
import {
  PRODUCT_ROLES,
  PRODUCT_CONFLICT_MATRIX,
  auditPriceLadder,
  getLaunchRecommendation,
  hasConflictInMatrix,
} from "@/lib/product/portfolio";
import {
  recommendPrimaryProduct,
  recommendNextBestProducts,
  alreadyPurchasedLabel,
} from "@/lib/product/recommendation";
import {
  buildInsightShareCard,
  assertInsightCardPrivacy,
} from "@/lib/product/share-insight-card";
import {
  validateAdditionalQuestion,
  ADDITIONAL_QUESTION_SCOPE,
} from "@/lib/product/additional-question";

const chart = fortuneEngine.calculate({
  gender: "female",
  calendarType: "solar",
  birthDate: "1990-05-15",
  birthTime: "10:30",
  birthTimeUnknown: false,
  lunarLeapMonth: false,
  timezone: "Asia/Seoul",
  countryCode: "KR",
});
const ctx = buildFortuneAiContext(chart);
const v2 = buildInterpretationContextV2(ctx, chart);

describe("PHASE P2.2 product portfolio", () => {
  it("keeps every product on a distinct primary question", () => {
    const questions = Object.values(PRODUCT_ROLES).map((r) => r.primaryQuestion);
    expect(new Set(questions).size).toBe(questions.length);
  });

  it("has no CONFLICT pairs in the matrix", () => {
    expect(hasConflictInMatrix()).toBe(false);
    expect(PRODUCT_CONFLICT_MATRIX.total.money).toBe("MINOR OVERLAP");
    expect(PRODUCT_CONFLICT_MATRIX.money.career).toBe("CLEAR");
    expect(PRODUCT_CONFLICT_MATRIX.money.tarot).toBe("CLEAR");
  });

  it("recommends a primary product without AI and explains why", () => {
    const rec = recommendPrimaryProduct(v2);
    expect(rec.arbitraryMoneyBiasRemoved).toBe(true);
    if (rec.needsUserIntent) {
      expect(rec.primary).toBeNull();
      expect(rec.tieBreak).toBe("two_way_intent");
    } else {
      expect(rec.primary).not.toBeNull();
      expect(["money", "career", "love", "total"]).toContain(rec.primary!.productId);
      expect(rec.explainability.length).toBeGreaterThan(20);
    }
  });

  it("suppresses already purchased products from next-best primary list", () => {
    const money = buildMockPaidResult(ctx, "재물운 집중분석", {
      productSlug: "2026-money",
      chart,
    });
    const next = recommendNextBestProducts({
      purchased: ["money"],
      possibleNextQuestions: money.possibleNextQuestions,
    });
    expect(next.suppressed).toContain("money");
    expect(next.next.every((x) => x.productId !== "money")).toBe(true);
    expect(alreadyPurchasedLabel()).toBe("이미 본 리포트");
  });

  it("keeps focus vs total overlap below cannibalization fail threshold", () => {
    const money = buildMockPaidResult(ctx, "재물운 집중분석", {
      productSlug: "2026-money",
      chart,
    });
    const career = buildMockPaidResult(ctx, "직장·이직운", {
      productSlug: "2026-career",
      chart,
    });
    const love = buildMockPaidResult(ctx, "연애운", {
      productSlug: "2026-love",
      chart,
    });
    const total = buildMockPaidResult(ctx, "종합 사주 리포트", {
      productSlug: "2026-total",
      chart,
    });
    expect(comparePaidReportOverlap(total, money).verdict).toBe("CLEAR");
    expect(comparePaidReportOverlap(total, career).verdict).toBe("CLEAR");
    expect(comparePaidReportOverlap(total, love).verdict).toBe("CLEAR");
    expect(comparePaidReportOverlap(money, career).verdict).toBe("CLEAR");
    expect(comparePaidReportOverlap(money, love).verdict).toBe("CLEAR");
    expect(comparePaidReportOverlap(career, love).verdict).toBe("CLEAR");
  });

  it("defines privacy-safe insight share card schema", () => {
    const card = buildInsightShareCard({
      domainLabel: "일",
      insightLine: "조용히 듣는 건 동의가 아니라, 정리 중이라는 뜻일 수 있다.",
    });
    expect(assertInsightCardPrivacy(card).ok).toBe(true);
    expect(card.privacy.includesBirthDate).toBe(false);
    expect(card.cta.href).toBe("/");
  });

  it("scopes additional question as single follow-up, not full regen", () => {
    expect(ADDITIONAL_QUESTION_SCOPE.regeneratesFullReport).toBe(false);
    expect(ADDITIONAL_QUESTION_SCOPE.reusesInterpretationContextV2).toBe(true);
    expect(validateAdditionalQuestion("일할 때 사람과 부딪히는 이유를 더 깊게 보고 싶어요").ok).toBe(
      true
    );
    expect(validateAdditionalQuestion("올해 몇 월에 이직할까요").ok).toBe(false);
  });

  it("audits price ladder without inventing checkout prices", () => {
    const ladder = auditPriceLadder();
    expect(ladder.focusSale).toBe(6900);
    expect(ladder.totalSale).toBe(12900);
    expect(ladder.tarotPaidRecommended).toBe(4900);
    expect(ladder.additionalRecommended).toBe(2900);
    expect(ladder.verdict).toBe("PASS");
    const launch = getLaunchRecommendation();
    expect(launch.entryPaidProduct).toBe("money");
    expect(launch.bestRepurchaseProduct).toBe("tarot_paid");
  });
});
