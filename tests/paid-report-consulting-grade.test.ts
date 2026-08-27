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
  findConsultingFrameworkLabels,
  findConsultingGarbledText,
  findConsultingGenericAdvice,
  findConsultingGenericCoaching,
  findConsultingHardKoreanErrors,
  findConsultingParticleErrors,
  findInternalCustomerTerms,
  snapshotFields,
} from "@/lib/report/paid-report-pdf-consulting";
import { generatePaidReportPdf } from "@/lib/report/generate-paid-report-pdf";
import { buildConsultingPack } from "@/lib/report/v5/consulting-value-pack";
import { validateEvidenceMappings } from "@/lib/report/v5/consulting-evidence";

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
  return generatePaidReportPdf({
    nickname: "수지",
    productName: name,
    productSlug: slug,
    report: buildMockPaidResult(ctx, name, { productSlug: slug, chart }),
    chart,
    live: false,
  }).html;
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

  it("consulting HTML bans generic advice, framework labels, and hard Korean", () => {
    for (const [slug, name] of [
      ["2026-money", "나의 돈 사용설명서"],
      ["2026-career", "나의 일 사용설명서"],
      ["2026-love", "나의 연애 사용설명서"],
      ["2026-total", "나의 사주 사용설명서"],
    ] as const) {
      const html = htmlFor(slug, name);
      const text = html.replace(/<[^>]+>/g, " ");
      expect(findConsultingGenericAdvice(html)).toEqual([]);
      expect(findConsultingParticleErrors(html)).toEqual([]);
      expect(findInternalCustomerTerms(html)).toEqual([]);
      expect(findConsultingFrameworkLabels(html)).toEqual([]);
      expect(findConsultingHardKoreanErrors(text)).toEqual([]);
      expect(html).toMatch(/이럴 때/);
      expect(html).toMatch(/왜 이게 맞냐면/);
      expect(html).not.toMatch(/\bWHEN\b|\bBECAUSE\b|\bTRIGGER\b/);
      expect((html.match(/class="ev-block"/g) ?? []).length).toBeLessThanOrEqual(3);
    }
  });

  it("Focus stays at least 7 pages; playbook split avoids single-page overflow", () => {
    for (const [slug, name] of [
      ["2026-money", "나의 돈 사용설명서"],
      ["2026-career", "나의 일 사용설명서"],
      ["2026-love", "나의 연애 사용설명서"],
    ] as const) {
      const html = htmlFor(slug, name);
      const pages = (html.match(/class="page /g) ?? []).length;
      expect(pages).toBeGreaterThanOrEqual(8);
      expect(html).toContain("page-playbook");
      expect(html).toContain("page-final");
    }
  });

  it("Total allows extra playbook pages for no-clipping render", () => {
    const html = htmlFor("2026-total", "나의 사주 사용설명서");
    expect((html.match(/class="page /g) ?? []).length).toBeGreaterThanOrEqual(13);
    expect(html).toContain("page-playbook");
    expect(html).toContain("page-final");
  });

  it("snapshot mapping separates career and love fields", () => {
    const career = buildConsultingPack(
      "career",
      enrichConsultingGrade(
        buildMockPaidResult(ctx, "나의 일 사용설명서", { productSlug: "2026-career", chart })
      )
    );
    const love = buildConsultingPack(
      "love",
      enrichConsultingGrade(
        buildMockPaidResult(ctx, "나의 연애 사용설명서", { productSlug: "2026-love", chart })
      )
    );
    const c = snapshotFields(career, "career");
    const l = snapshotFields(love, "love");
    expect(c.strength.label).toBe("잘 맞는 구조");
    expect(c.caution.label).toBe("지치는 구조");
    expect(c.misread).toContain("상사");
    expect(l.strength.label).toMatch(/확신 전|끌림/);
    expect(l.caution.label).not.toBe("확신 후");
    expect(l.caution.value).toBe("관찰 기간이 길어짐");
    expect(l.misread).toContain("마음");
    expect(l.caution.value).not.toBe(l.misread);
    expect(l.strength.value).not.toBe(l.caution.value);
  });

  it("playbook capstone replaces continuation artifact heading", () => {
    const html = htmlFor("2026-career", "나의 일 사용설명서");
    expect(html).toContain("page-playbook-capstone");
    expect(html).toContain("마지막으로 기억할 두 가지");
    expect(html).not.toContain(">이어서<");
  });

  it("total signature uses stacked vertical flow columns", () => {
    const html = htmlFor("2026-total", "나의 사주 사용설명서");
    expect(html).toContain("sig-vertical-stack");
    expect(html).not.toContain("grid-template-columns:repeat(3,1fr)");
  });

  it("premium pass: specific v2 evidence footer and action example split", () => {
    const html = htmlFor("2026-money", "나의 돈 사용설명서");
    expect(html).toContain("premium-snapshot");
    expect(html).toContain("사주에서 확인한 부분");
    expect(html).toContain("작은 예시");
    expect(html).toMatch(new RegExp(`${ctx.dayMaster.stem}|${ctx.dayMaster.hangul}`));
    const pack = buildConsultingPack(
      "money",
      buildMockPaidResult(ctx, "나의 돈 사용설명서", { productSlug: "2026-money", chart })
    );
    const mapped = validateEvidenceMappings(
      pack.discoveries.map((d) => ({ id: d.id, evidenceSources: d.evidenceSources })),
      v2
    );
    expect(mapped.rows.length).toBeGreaterThan(0);
    expect(mapped.rows.some((r) => r.evidenceId.startsWith("ev_"))).toBe(true);
  });

  it("total premium signature vertical visual", () => {
    const html = htmlFor("2026-total", "나의 사주 사용설명서");
    expect(html).toContain("sig-vertical-stage");
    expect(html).toContain("sig-flow-col");
  });
});
