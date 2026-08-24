import { fortuneEngine } from "../src/lib/fortune-engine";
import { buildFortuneAiContext } from "../src/lib/ai/context";
import { buildMockFreeResult, buildMockPaidResult } from "../src/lib/ai/interpreters/mock-content";
import {
  buildInterpretationContextV2,
  getEngineCapabilityAudit,
} from "../src/lib/ai/interpretation-context-v2";
import {
  compareFreeVsPaidNovelty,
  comparePaidReportOverlap,
  evaluatePaidQualityV2,
} from "../src/lib/ai/validators/paid-quality-v2";

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
const free = buildMockFreeResult(ctx);
const money = buildMockPaidResult(ctx, "재물운 집중분석", {
  productSlug: "2026-money",
  chart,
});
const work = buildMockPaidResult(ctx, "직장·이직운", {
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

const v2 = buildInterpretationContextV2(ctx, chart);

console.log(
  JSON.stringify(
    {
      capability: getEngineCapabilityAudit(),
      context: {
        evidenceAxes: new Set(v2.evidenceRegistry.map((x) => x.axisId)).size,
        independentAxes:
          v2.identityAxes.length +
          v2.elementAxes.length +
          v2.tenGodAxes.length +
          v2.pillarAxes.length +
          v2.interactionAxes.length,
      },
      money: evaluatePaidQualityV2(money),
      work: evaluatePaidQualityV2(work),
      love: evaluatePaidQualityV2(love),
      total: evaluatePaidQualityV2(total),
      overlap: {
        freeVsMoney: compareFreeVsPaidNovelty(free, money),
        moneyVsWork: comparePaidReportOverlap(money, work),
        moneyVsLove: comparePaidReportOverlap(money, love),
        focusVsTotal: comparePaidReportOverlap(money, total),
      },
      counts: {
        totalContradictions: total.contradictions?.length ?? 0,
        totalStrengthShadow: total.strengthShadows?.length ?? 0,
        totalInsightFamilies: total.sections.length,
        moneyShareWorthy: money.shareableInsights?.length ?? 0,
        totalShareWorthy: total.shareableInsights?.length ?? 0,
      },
    },
    null,
    2
  )
);
