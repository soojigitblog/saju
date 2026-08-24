import { describe, expect, it } from "vitest";
import { fortuneEngine } from "@/lib/fortune-engine";
import { buildFortuneAiContext } from "@/lib/ai/context";
import { buildMockPaidResult } from "@/lib/ai/interpreters/mock-content";
import { validatePaidSemantics } from "@/lib/ai/validators/semantic-validator";
import { scorePaidReportQuality } from "@/lib/ai/validators/paid-quality";
import {
  resolvePaidProductKind,
  requiredSectionKeysForProduct,
} from "@/lib/ai/schemas/paid-report";
import { RECOMMENDED_MONEY_PRODUCT_NAME } from "@/lib/ai/fortune-context-audit";

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

describe("PHASE P1.4 paid premium V4", () => {
  it("resolves V4 section keys", () => {
    expect(resolvePaidProductKind("2026-money")).toBe("money");
    expect(requiredSectionKeysForProduct("2026-money")).toHaveLength(6);
    expect(requiredSectionKeysForProduct("2026-total")).toHaveLength(9);
    expect(RECOMMENDED_MONEY_PRODUCT_NAME).toBe("나의 재물 사용설명서");
  });

  it("generates V4 mocks with evidence diversity", () => {
    const ctx = buildFortuneAiContext(chart);
    const money = buildMockPaidResult(ctx, "재물운 집중분석", {
      productSlug: "2026-money",
    });
    const total = buildMockPaidResult(ctx, "종합 사주 리포트", {
      productSlug: "2026-total",
    });

    validatePaidSemantics(money, ctx, { productSlug: "2026-money" });
    validatePaidSemantics(total, ctx, { productSlug: "2026-total" });

    expect(money.reportVersion).toBe("v4");
    expect(total.reportVersion).toBe("v4");
    expect(money.sections).toHaveLength(6);
    expect(total.sections).toHaveLength(9);
    expect(money.profileScales!.length).toBeLessThanOrEqual(3);
    expect(money.finalSummary.portraitNarrative!.length).toBeGreaterThanOrEqual(2);

    const mq = scorePaidReportQuality(money, { productSlug: "2026-money" });
    const tq = scorePaidReportQuality(total, { productSlug: "2026-total" });
    expect(mq.pass).toBe(true);
    expect(tq.pass).toBe(true);
    expect(mq.metrics.evidenceAxisCount).toBeGreaterThanOrEqual(3);
    expect(tq.metrics.evidenceAxisCount).toBeGreaterThanOrEqual(4);
    expect(mq.metrics.factAssertionHits).toBe(0);
  });
});
