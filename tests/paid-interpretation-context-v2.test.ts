import { describe, expect, it } from "vitest";
import { fortuneEngine } from "@/lib/fortune-engine";
import { buildFortuneAiContext } from "@/lib/ai/context";
import {
  buildInterpretationContextV2,
  getEngineCapabilityAudit,
} from "@/lib/ai/interpretation-context-v2";
import { buildMockFreeResult, buildMockPaidResult } from "@/lib/ai/interpreters/mock-content";
import { validatePaidSemantics } from "@/lib/ai/validators/semantic-validator";
import {
  compareFreeVsPaidNovelty,
  comparePaidReportOverlap,
  evaluatePaidQualityV2,
} from "@/lib/ai/validators/paid-quality-v2";

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

describe("PHASE P2 interpretation context V2", () => {
  it("audits engine capability from implemented code only", () => {
    const audit = getEngineCapabilityAudit();
    expect(audit.dayMaster).toBe("SUPPORTED");
    expect(audit.fiveElements).toBe("SUPPORTED");
    expect(audit.tenGods).toBe("SUPPORTED");
    expect(audit.hiddenStems).toBe("PARTIAL");
    expect(audit.stemInteractions).toBe("NOT SUPPORTED");
    expect(audit.branchInteractions).toBe("NOT SUPPORTED");
    expect(audit.daeun).toBe("NOT SUPPORTED");
    expect(audit.saeun).toBe("NOT SUPPORTED");
  });

  it("builds deterministic interpretation context with multiple evidence axes", () => {
    const ctx = buildFortuneAiContext(chart);
    const v2 = buildInterpretationContextV2(ctx, chart);

    expect(v2.contextVersion).toBe("v2");
    expect(v2.evidenceRegistry.length).toBeGreaterThanOrEqual(8);
    expect(v2.behaviorHypotheses.length).toBeGreaterThanOrEqual(3);
    expect(v2.tensions.length).toBeGreaterThanOrEqual(2);
    expect(v2.strengthShadowPairs.length).toBeGreaterThanOrEqual(3);
    expect(v2.domainSignals.map((x) => x.domain)).toEqual(
      expect.arrayContaining(["free", "money", "work", "love", "total", "cross"])
    );
  });

  it("produces distinct paid reports across products without unsupported claims", () => {
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

    validatePaidSemantics(money, ctx, { productSlug: "2026-money" });
    validatePaidSemantics(work, ctx, { productSlug: "2026-career" });
    validatePaidSemantics(love, ctx, { productSlug: "2026-love" });
    validatePaidSemantics(total, ctx, { productSlug: "2026-total" });

    const moneyQ = evaluatePaidQualityV2(money);
    const workQ = evaluatePaidQualityV2(work);
    const loveQ = evaluatePaidQualityV2(love);
    const totalQ = evaluatePaidQualityV2(total);

    expect(moneyQ.strongPersonalDiscoveries).toBeGreaterThanOrEqual(3);
    expect(moneyQ.behaviorInsights).toBeGreaterThanOrEqual(5);
    expect(moneyQ.evidenceDiversity).toBe("PASS");
    expect(moneyQ.referralReadiness === "YES" || moneyQ.referralReadiness === "STRONG").toBe(true);
    expect(moneyQ.repurchaseReadiness === "YES" || moneyQ.repurchaseReadiness === "STRONG").toBe(true);

    expect(totalQ.strongPersonalDiscoveries).toBeGreaterThanOrEqual(5);
    expect(totalQ.behaviorInsights).toBeGreaterThanOrEqual(8);
    expect(totalQ.evidenceAxesUsed).toBeGreaterThanOrEqual(4);
    expect(totalQ.maxAxisConcentration).toBeLessThan(70);
    expect(totalQ.evidenceDiversity).toBe("PASS");
    expect(totalQ.insightDiversity).toBe("PASS");
    expect(totalQ.referralReadiness === "YES" || totalQ.referralReadiness === "STRONG").toBe(true);
    expect(totalQ.repurchaseReadiness === "YES" || totalQ.repurchaseReadiness === "STRONG").toBe(true);

    expect(moneyQ.genericAdvice).toBe("NONE");
    expect(workQ.genericAdvice).toBe("NONE");
    expect(loveQ.genericAdvice).toBe("NONE");
    expect(totalQ.genericAdvice).toBe("NONE");
    expect(moneyQ.mixedLanguageErrors).toBe(0);
    expect(totalQ.mixedLanguageErrors).toBe(0);
    expect(moneyQ.nameDayMasterSafety).toBe("SEPARATED");
    expect(totalQ.nameDayMasterSafety).toBe("SEPARATED");

    expect(compareFreeVsPaidNovelty(free, money).verdict).toBe("CLEAR");
    expect(comparePaidReportOverlap(money, work).verdict).toBe("CLEAR");
    expect(comparePaidReportOverlap(money, love).verdict).toBe("CLEAR");
    expect(comparePaidReportOverlap(money, total).verdict).toBe("CLEAR");
  });
});
