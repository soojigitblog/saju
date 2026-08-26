import { describe, expect, it } from "vitest";
import { fortuneEngine } from "@/lib/fortune-engine";
import { buildFortuneAiContext } from "@/lib/ai/context";
import { buildInterpretationContextV2 } from "@/lib/ai/interpretation-context-v2";
import { buildMockPaidResult } from "@/lib/ai/interpreters/mock-content";
import {
  countLevel3,
  enrichConsultingGrade,
} from "@/lib/ai/interpreters/mock-consulting-grade";
import {
  buildPaidReportPdfHtmlConsulting,
  findConsultingGenericAdvice,
  findConsultingParticleErrors,
  findInternalCustomerTerms,
} from "@/lib/report/paid-report-pdf-consulting";
import { buildConsultingPack } from "@/lib/report/v5/consulting-value-pack";

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

function reportFor(slug: string, name: string) {
  return enrichConsultingGrade(
    buildMockPaidResult(ctx, name, { productSlug: slug, chart })
  );
}

function htmlFor(slug: string, name: string) {
  return buildPaidReportPdfHtmlConsulting({
    nickname: "수지",
    productName: name,
    productSlug: slug,
    report: buildMockPaidResult(ctx, name, { productSlug: slug, chart }),
    ctx,
    v2,
  });
}

describe("CONSULTING-GRADE paid product", () => {
  it("Focus products have >=4 Level3 discoveries and contradictions", () => {
    for (const [slug, name] of [
      ["2026-money", "나의 돈 사용설명서"],
      ["2026-career", "나의 일 사용설명서"],
      ["2026-love", "나의 연애 사용설명서"],
    ] as const) {
      const r = reportFor(slug, name);
      expect(countLevel3(r)).toBeGreaterThanOrEqual(4);
      expect(r.contradictions?.length ?? 0).toBeGreaterThanOrEqual(2);
      expect(r.actionItems.every((a) => a.when && a.what && a.why)).toBe(true);
      const withChain = r.sections.filter((s) => (s.reactionChain?.length ?? 0) >= 4);
      expect(withChain.length).toBeGreaterThanOrEqual(3);
      const withMis = r.sections.filter(
        (s) => s.selfInterpretation && s.outsideInterpretation
      );
      expect(withMis.length).toBeGreaterThanOrEqual(3);
      const withSelfMis = r.sections.filter((s) => !!s.selfMisread);
      expect(withSelfMis.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("Total has Level3, cross-domain, pattern chains, contradictions", () => {
    const r = reportFor("2026-total", "나의 사주 사용설명서");
    expect(countLevel3(r)).toBeGreaterThanOrEqual(7);
    expect(r.crossDomainLinks?.length ?? 0).toBeGreaterThanOrEqual(4);
    expect(r.patternChains?.length ?? 0).toBeGreaterThanOrEqual(3);
    expect(r.contradictions?.length ?? 0).toBeGreaterThanOrEqual(4);
    expect(r.strengthShadows?.length ?? 0).toBeGreaterThanOrEqual(3);
    expect(r.actionItems.length).toBeGreaterThanOrEqual(6);
  });

  it("consulting HTML bans generic advice and internal jargon", () => {
    for (const [slug, name] of [
      ["2026-money", "나의 돈 사용설명서"],
      ["2026-career", "나의 일 사용설명서"],
      ["2026-love", "나의 연애 사용설명서"],
      ["2026-total", "나의 사주 사용설명서"],
    ] as const) {
      const html = htmlFor(slug, name);
      expect(findConsultingGenericAdvice(html)).toEqual([]);
      expect(findConsultingParticleErrors(html)).toEqual([]);
      expect(findInternalCustomerTerms(html)).toEqual([]);
      expect(html).toMatch(/WHEN/);
      expect(html).toMatch(/BECAUSE/);
      expect((html.match(/class="ev-block"/g) ?? []).length).toBeLessThanOrEqual(
        /total/i.test(slug) ? 4 : 3
      );
    }
  });

  it("Focus stays ~7 pages and Total ~11 pages", () => {
    expect(
      (htmlFor("2026-money", "나의 돈 사용설명서").match(/class="page /g) ?? []).length
    ).toBe(7);
    expect(
      (htmlFor("2026-career", "나의 일 사용설명서").match(/class="page /g) ?? []).length
    ).toBe(7);
    expect(
      (htmlFor("2026-love", "나의 연애 사용설명서").match(/class="page /g) ?? []).length
    ).toBe(7);
    expect(
      (htmlFor("2026-total", "나의 사주 사용설명서").match(/class="page /g) ?? []).length
    ).toBe(11);
  });

  it("consulting pack exposes Level3 narratives and chains", () => {
    const money = buildConsultingPack(
      "money",
      buildMockPaidResult(ctx, "나의 돈 사용설명서", {
        productSlug: "2026-money",
        chart,
      })
    );
    expect(money.level3Count).toBeGreaterThanOrEqual(4);
    expect(money.discoveries.some((d) => d.chain.length >= 4)).toBe(true);
    expect(money.discoveries.some((d) => d.selfMisread)).toBe(true);
  });
});
