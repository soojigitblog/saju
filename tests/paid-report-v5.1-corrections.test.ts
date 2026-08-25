import { describe, expect, it } from "vitest";
import { fortuneEngine } from "@/lib/fortune-engine";
import { buildFortuneAiContext } from "@/lib/ai/context";
import { buildMockPaidResult } from "@/lib/ai/interpreters/mock-content";
import { buildPaidReportPdfHtmlV5 } from "@/lib/report/paid-report-pdf-v5";

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

describe("PHASE P3.1 V5.1 corrections", () => {
  it("keeps earn and spend columns distinct in Money HTML", () => {
    const report = buildMockPaidResult(ctx, "나의 돈 사용설명서", {
      productSlug: "2026-money",
      chart,
    });
    const html = buildPaidReportPdfHtmlV5({
      nickname: "수지",
      productName: "나의 돈 사용설명서",
      productSlug: "2026-money",
      report,
      ctx,
    });
    const earnBlock =
      html.match(/<p class="col-h">벌 때의 리듬<\/p>([\s\S]*?)<\/div>/)?.[1] ??
      html.match(/돈의 반응 Map[\s\S]*?<p class="lab">수입<\/p><p class="val">([\s\S]*?)<\/p>/)?.[1] ??
      "";
    const spendBlock =
      html.match(/<p class="col-h">쓸 때의 리듬<\/p>([\s\S]*?)<\/div>/)?.[1] ??
      html.match(/<p class="lab">큰 지출<\/p><p class="val">([\s\S]*?)<\/p>/)?.[1] ??
      "";
    expect(html).toMatch(/기준이 보이는 보상|말로만 약속/);
    expect(html).toMatch(/허용 범위|편의 소비/);
    expect(spendBlock).not.toMatch(/기준이 보이는 보상 구조에서는 힘을/);
    expect(html).toMatch(/돈의 반응 Map/);
    void earnBlock;
  });

  it("removes mixed English element labels and customer meta", () => {
    const report = buildMockPaidResult(ctx, "나의 사주 사용설명서", {
      productSlug: "2026-total",
      chart,
    });
    const html = buildPaidReportPdfHtmlV5({
      nickname: "수지",
      productName: "나의 사주 사용설명서",
      productSlug: "2026-total",
      report,
      ctx,
    });
    expect(html).not.toMatch(/양\s*metal|음\s*metal/i);
    expect(html).toMatch(/양금\(陽金\)|음금\(陰金\)|양목|음목|양화|음화|양토|음토|양수|음수/);
    expect(html).not.toMatch(/focused\s*report/i);
    expect(html).not.toMatch(/이 장은[^.]*예언하지 않습니다/);
    expect(html).toMatch(/PERSONAL&nbsp;FOUR&nbsp;PILLARS/);
    expect(html).not.toMatch(/수지님의<br\/>돈/); // total cover
    expect(html).toMatch(/수지님의<br\/>사주 사용설명서/);
    // Cover should not repeat DB full product name as subtitle
    const cover = html.split('data-shot="cover"')[1]?.slice(0, 800) ?? "";
    expect(cover).not.toMatch(/나의 사주 사용설명서/);
  });

  it("compresses Focus page counts into target ranges", () => {
    const money = buildPaidReportPdfHtmlV5({
      nickname: "수지",
      productName: "나의 돈 사용설명서",
      productSlug: "2026-money",
      report: buildMockPaidResult(ctx, "나의 돈 사용설명서", {
        productSlug: "2026-money",
        chart,
      }),
      ctx,
    });
    const career = buildPaidReportPdfHtmlV5({
      nickname: "수지",
      productName: "나의 일 사용설명서",
      productSlug: "2026-career",
      report: buildMockPaidResult(ctx, "나의 일 사용설명서", {
        productSlug: "2026-career",
        chart,
      }),
      ctx,
    });
    const love = buildPaidReportPdfHtmlV5({
      nickname: "수지",
      productName: "나의 연애 사용설명서",
      productSlug: "2026-love",
      report: buildMockPaidResult(ctx, "나의 연애 사용설명서", {
        productSlug: "2026-love",
        chart,
      }),
      ctx,
    });
    const total = buildPaidReportPdfHtmlV5({
      nickname: "수지",
      productName: "나의 사주 사용설명서",
      productSlug: "2026-total",
      report: buildMockPaidResult(ctx, "나의 사주 사용설명서", {
        productSlug: "2026-total",
        chart,
      }),
      ctx,
    });
    const count = (html: string) => (html.match(/class="page /g) ?? []).length;
    // Flow pagination: density over page-count KPI (4–6 Focus, 7–10 Total OK)
    expect(count(money)).toBeGreaterThanOrEqual(4);
    expect(count(money)).toBeLessThanOrEqual(6);
    expect(count(career)).toBeGreaterThanOrEqual(4);
    expect(count(career)).toBeLessThanOrEqual(6);
    expect(count(love)).toBeGreaterThanOrEqual(4);
    expect(count(love)).toBeLessThanOrEqual(6);
    expect(count(total)).toBeGreaterThanOrEqual(6);
    expect(count(total)).toBeLessThanOrEqual(10);
    expect((money.match(/저장해 두고 싶은 한 문장/g) ?? []).length).toBe(0);
    expect(money).toMatch(/class="pull /);
    expect(total).not.toMatch(/단일 성격 문장이 아니라/);
    expect(total).not.toMatch(/스트레스[\s\S]{0,800}처음의 나와 가까워진 뒤의 내가/);
    expect(career).toMatch(/Work Environment Map/);
    expect(love).toMatch(/Relationship Tempo/);
    expect(money).toMatch(/돈의 반응 Map/);
  });
});
