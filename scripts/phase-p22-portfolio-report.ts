/**
 * PHASE P2.2 — Portfolio audit report (no PDF, no DB rename).
 */
import { fortuneEngine } from "../src/lib/fortune-engine";
import { buildFortuneAiContext } from "../src/lib/ai/context";
import { buildMockPaidResult } from "../src/lib/ai/interpreters/mock-content";
import { buildInterpretationContextV2 } from "../src/lib/ai/interpretation-context-v2";
import { comparePaidReportOverlap } from "../src/lib/ai/validators/paid-quality-v2";
import {
  PRODUCT_ROLES,
  PRODUCT_CONFLICT_MATRIX,
  CURRENT_ACTIVE_PRODUCT_AUDIT,
  CURRENT_INACTIVE_PRODUCT_AUDIT,
  PORTFOLIO_KPI_DEFINITIONS,
  auditPriceLadder,
  getLaunchRecommendation,
  productLadderText,
  hasConflictInMatrix,
} from "../src/lib/product/portfolio";
import {
  recommendPrimaryProduct,
  recommendNextBestProducts,
} from "../src/lib/product/recommendation";
import { buildInsightShareCard, assertInsightCardPrivacy } from "../src/lib/product/share-insight-card";

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

const overlap = {
  moneyVsCareer: comparePaidReportOverlap(money, career),
  moneyVsLove: comparePaidReportOverlap(money, love),
  careerVsLove: comparePaidReportOverlap(career, love),
  totalVsMoney: comparePaidReportOverlap(total, money),
  totalVsCareer: comparePaidReportOverlap(total, career),
  totalVsLove: comparePaidReportOverlap(total, love),
};

const primary = recommendPrimaryProduct(v2);
const nextAfterMoney = recommendNextBestProducts({
  purchased: ["money"],
  possibleNextQuestions: money.possibleNextQuestions,
});
const share = buildInsightShareCard({
  domainLabel: "돈",
  insightLine: money.shareableInsights?.[0] ?? money.signatureStatement,
});

console.log(
  JSON.stringify(
    {
      productAudit: {
        active: CURRENT_ACTIVE_PRODUCT_AUDIT,
        inactive: CURRENT_INACTIVE_PRODUCT_AUDIT,
      },
      roles: Object.fromEntries(
        Object.values(PRODUCT_ROLES).map((r) => [
          r.id,
          {
            question: r.primaryQuestion,
            uvp: r.uvp,
            currentName: r.currentName,
            recommendedName: r.recommendedName,
            status: r.currentStatus,
            price: r.currentSalePrice,
          },
        ])
      ),
      ladder: productLadderText(),
      priceLadder: auditPriceLadder(),
      launch: getLaunchRecommendation(),
      conflictHasAny: hasConflictInMatrix(),
      conflictMatrix: PRODUCT_CONFLICT_MATRIX,
      overlap,
      cannibalization: {
        totalDoesNotReplaceFocus:
          overlap.totalVsMoney.overlapRatio < 0.6 &&
          overlap.totalVsCareer.overlapRatio < 0.6 &&
          overlap.totalVsLove.overlapRatio < 0.6,
        focusThreeDoNotReplaceTotal:
          "Total keeps connection/contradiction/strength-shadow monopoly by design",
      },
      recommendation: {
        primary,
        nextAfterMoney,
      },
      shareCard: {
        card: share,
        privacy: assertInsightCardPrivacy(share),
      },
      sectionDepth: {
        money: money.sections.length,
        career: career.sections.length,
        love: love.sections.length,
        total: total.sections.length,
      },
      kpiIds: PORTFOLIO_KPI_DEFINITIONS.map((k) => k.id),
    },
    null,
    2
  )
);
