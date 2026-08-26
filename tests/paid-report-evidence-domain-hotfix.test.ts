import { describe, expect, it } from "vitest";
import { fortuneEngine } from "@/lib/fortune-engine";
import { buildFortuneAiContext } from "@/lib/ai/context";
import { buildInterpretationContextV2 } from "@/lib/ai/interpretation-context-v2";
import { buildMockPaidResult } from "@/lib/ai/interpreters/mock-content";
import {
  buildPaidReportPdfHtmlV5,
  findDomainContamination,
  findInternalCustomerTerms,
  findParticleErrors,
  findTautologyCopy,
} from "@/lib/report/paid-report-pdf-v5";

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

function evidenceBlocksOnly(html: string): string {
  return [...html.matchAll(/class="ev-block"[^>]*>([\s\S]*?)<\/div>\s*(?=<p class="section-title|<div class="|<p class="kicker|$)/g)]
    .map((m) => m[1] ?? "")
    .join("\n");
}

describe("FINAL HOTFIX evidence domain contamination", () => {
  it("keeps Career evidence blocks free of money phrases and internal axis terms", () => {
    const html = htmlFor("2026-career", "나의 일 사용설명서");
    const blocks = evidenceBlocksOnly(html);
    expect((html.match(/왜 이런 해석이 나왔나요\?/g) ?? []).length + (html.match(/사주에서는 왜 이렇게 보는지/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(blocks).not.toMatch(/큰돈|작은 반복|소액|절약|수입|지출|소비/);
    expect(findDomainContamination(blocks, "career")).toEqual([]);
    expect(findInternalCustomerTerms(blocks)).toEqual([]);
    expect(findTautologyCopy(blocks)).toEqual([]);
    expect(findParticleErrors(html)).toEqual([]);
  });

  it("keeps Love evidence blocks free of money/career phrases and internal axis terms", () => {
    const html = htmlFor("2026-love", "나의 연애 사용설명서");
    const blocks = evidenceBlocksOnly(html);
    expect((html.match(/왜 이런 해석이 나왔나요\?/g) ?? []).length + (html.match(/사주에서는 왜 이렇게 보는지/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(blocks).not.toMatch(/큰돈|작은 반복|수입 구조|지출|절약|완료 조건|검수|직장 보상/);
    expect(findDomainContamination(blocks, "love")).toEqual([]);
    expect(findInternalCustomerTerms(blocks)).toEqual([]);
    expect(findTautologyCopy(blocks)).toEqual([]);
  });

  it("keeps Total Saju Map domain-neutral with distinct customer meanings", () => {
    const html = htmlFor("2026-total", "나의 사주 사용설명서");
    const map = html.split('data-shot="saju-map"')[1]?.split('data-shot="')[0] ?? "";
    expect(map).not.toMatch(/큰돈|작은 반복|절약|연애|확신 전|확신 후|거리 조절|업무 완료/);
    const whys = [...map.matchAll(/class="w">([^<]+)/g)].map((m) => m[1]!);
    expect(whys.length).toBe(3);
    expect(new Set(whys.map((w) => w.slice(0, 24))).size).toBe(3);
    for (const w of whys) {
      expect(findDomainContamination(w, "total")).toEqual([]);
      expect(findInternalCustomerTerms(w)).toEqual([]);
      expect(findTautologyCopy(w)).toEqual([]);
    }
  });

  it("does not break Money evidence regression", () => {
    const html = htmlFor("2026-money", "나의 돈 사용설명서");
    expect(html).toMatch(/사주에서는 왜 이렇게 보는지|왜 이런 해석이 나왔나요\?/);
    expect(html).toMatch(/돈의 반응 Map/);
    expect((html.match(/class="page /g) ?? []).length).toBeGreaterThanOrEqual(4);
    expect((html.match(/class="page /g) ?? []).length).toBeLessThanOrEqual(8);
  });
});
