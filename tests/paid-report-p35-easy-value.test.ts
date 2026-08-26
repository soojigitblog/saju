import { describe, expect, it } from "vitest";
import { fortuneEngine } from "@/lib/fortune-engine";
import { buildFortuneAiContext } from "@/lib/ai/context";
import { buildInterpretationContextV2 } from "@/lib/ai/interpretation-context-v2";
import { buildMockPaidResult } from "@/lib/ai/interpreters/mock-content";
import {
  buildPaidReportPdfHtmlV5,
  findInternalCustomerTerms,
  findParticleErrors,
} from "@/lib/report/paid-report-pdf-v5";
import { CUSTOMER_SCOPE_EASY } from "@/lib/report/v5/easy-korean";
import {
  buildCareerValuePack,
  buildLoveValuePack,
  buildMoneyValuePack,
  countValueMetrics,
} from "@/lib/report/v5/easy-value-pack";

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

function htmlFor(slug: string, name: string) {
  return buildPaidReportPdfHtmlV5({
    nickname: "수지",
    productName: name,
    productSlug: slug,
    report: buildMockPaidResult(ctx, name, { productSlug: slug, chart }),
    ctx,
    v2,
  });
}

describe("PHASE P3.5 easy value + easy Korean", () => {
  it("expands Focus to ~7 pages and Total to ~11", () => {
    const money = htmlFor("2026-money", "나의 돈 사용설명서");
    const career = htmlFor("2026-career", "나의 일 사용설명서");
    const love = htmlFor("2026-love", "나의 연애 사용설명서");
    const total = htmlFor("2026-total", "나의 사주 사용설명서");
    const count = (html: string) => (html.match(/class="page /g) ?? []).length;
    expect(count(money)).toBeGreaterThanOrEqual(6);
    expect(count(money)).toBeLessThanOrEqual(8);
    expect(count(career)).toBeGreaterThanOrEqual(6);
    expect(count(career)).toBeLessThanOrEqual(8);
    expect(count(love)).toBeGreaterThanOrEqual(6);
    expect(count(love)).toBeLessThanOrEqual(8);
    expect(count(total)).toBeGreaterThanOrEqual(10);
    expect(count(total)).toBeLessThanOrEqual(12);
  });

  it("uses question-first reading order and glossary/scope", () => {
    const money = htmlFor("2026-money", "나의 돈 사용설명서");
    expect(money).toMatch(/class="insight"/);
    expect(money).toMatch(/사주에서는 왜 이렇게 보는지/);
    expect(money).toMatch(/사주 용어, 이것만 알면 돼요/);
    expect(money).toContain(CUSTOMER_SCOPE_EASY.slice(0, 24));
    expect(findInternalCustomerTerms(money)).toEqual([]);
    expect(findParticleErrors(money)).toEqual([]);
  });

  it("meets focus value metrics from packs", () => {
    const moneyReport = buildMockPaidResult(ctx, "돈", { productSlug: "2026-money", chart });
    const careerReport = buildMockPaidResult(ctx, "일", { productSlug: "2026-career", chart });
    const loveReport = buildMockPaidResult(ctx, "연애", { productSlug: "2026-love", chart });
    const m = countValueMetrics(buildMoneyValuePack(moneyReport, ctx, v2));
    const c = countValueMetrics(buildCareerValuePack(careerReport, ctx, v2));
    const l = countValueMetrics(buildLoveValuePack(loveReport, ctx, v2));
    expect(m.questionsAnswered).toBeGreaterThanOrEqual(8);
    expect(c.questionsAnswered).toBeGreaterThanOrEqual(8);
    expect(l.questionsAnswered).toBeGreaterThanOrEqual(8);
    expect(m.behaviorMoments).toBeGreaterThanOrEqual(7);
    expect(c.behaviorMoments).toBeGreaterThanOrEqual(7);
    expect(l.behaviorMoments).toBeGreaterThanOrEqual(7);
  });

  it("keeps signature maps", () => {
    const money = htmlFor("2026-money", "나의 돈 사용설명서");
    const career = htmlFor("2026-career", "나의 일 사용설명서");
    const love = htmlFor("2026-love", "나의 연애 사용설명서");
    expect(money).toMatch(/돈의 반응 Map/);
    expect(career).toMatch(/Work Environment Map/);
    expect(love).toMatch(/Relationship Tempo/);
  });
});
