import { describe, expect, it } from "vitest";
import { fortuneEngine } from "@/lib/fortune-engine";
import { buildFortuneAiContext } from "@/lib/ai/context";
import { buildInterpretationContextV2 } from "@/lib/ai/interpretation-context-v2";
import { buildMockPaidResult } from "@/lib/ai/interpreters/mock-content";
import {
  buildPaidReportPdfHtmlV5,
  findParticleErrors,
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

describe("PHASE P3.3 release fixes", () => {
  it("does not assemble dynamic 와/가 particles on Total contradiction share", () => {
    const html = buildPaidReportPdfHtmlV5({
      nickname: "수지",
      productName: "나의 사주 사용설명서",
      productSlug: "2026-total",
      report: buildMockPaidResult(ctx, "나의 사주 사용설명서", {
        productSlug: "2026-total",
        chart,
      }),
      ctx,
      v2,
    });
    expect(html).not.toMatch(/조율와/);
    expect(html).not.toMatch(/확정가/);
    expect(html).not.toMatch(/와\s+.+가\s+한\s*사람\s*안에서\s*같이\s*작동/);
    expect(findParticleErrors(html)).toEqual([]);
  });

  it("uses evidence registry signals without generic keyQuestion", () => {
    const html = buildPaidReportPdfHtmlV5({
      nickname: "수지",
      productName: "나의 사주 사용설명서",
      productSlug: "2026-total",
      report: buildMockPaidResult(ctx, "나의 사주 사용설명서", {
        productSlug: "2026-total",
        chart,
      }),
      ctx,
      v2,
    });
    expect(html).not.toMatch(/나는 어떤 사람인가\?/);
    expect(html).toMatch(/이 명식에서 눈여겨볼 구조/);
    expect(html).toMatch(/일간|오행|십성/);
  });

  it("keeps Money reaction map without repeating scene lines below", () => {
    const html = buildPaidReportPdfHtmlV5({
      nickname: "수지",
      productName: "나의 돈 사용설명서",
      productSlug: "2026-money",
      report: buildMockPaidResult(ctx, "나의 돈 사용설명서", {
        productSlug: "2026-money",
        chart,
      }),
      ctx,
    });
    expect(html).toMatch(/돈의 반응 Map/);
    expect(html).not.toMatch(/벌 때의 나/);
    expect(html).not.toMatch(/쓸 때의 나/);
    // Map scene should appear once (not again in rhythm columns)
    const scene = "허용 범위를 못 정하면 결론이 늦어질 수 있습니다";
    expect((html.match(new RegExp(scene, "g")) ?? []).length).toBeLessThanOrEqual(1);
  });

  it("strips customer-facing report-meta portrait lines", () => {
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
    expect(money).not.toMatch(/리포트의\s*핵심은/);
    expect(love).not.toMatch(/리포트의\s*핵심은/);
  });
});
