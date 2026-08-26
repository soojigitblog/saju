import { describe, expect, it } from "vitest";
import { fortuneEngine } from "@/lib/fortune-engine";
import { buildFortuneAiContext } from "@/lib/ai/context";
import { buildInterpretationContextV2 } from "@/lib/ai/interpretation-context-v2";
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

describe("FINAL RELEASE visible saju evidence polish", () => {
  it("shows at least 2 evidence blocks on Career and Love", () => {
    const career = htmlFor("2026-career", "나의 일 사용설명서");
    const love = htmlFor("2026-love", "나의 연애 사용설명서");
    expect((career.match(/사주에서는 왜 이렇게 보는지|왜 이런 해석이 나왔나요\?/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect((love.match(/사주에서는 왜 이렇게 보는지|왜 이런 해석이 나왔나요\?/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(career).toMatch(/명식 근거|명식에서 읽은 근거/);
    expect(love).toMatch(/쉬운 뜻|쉽게 말하면/);
    expect(career).not.toMatch(/경로 균형/);
    expect(love).not.toMatch(/지나치게 무던한/);
  });

  it("keeps Total saju signals distinct without duplicate whys", () => {
    const total = htmlFor("2026-total", "나의 사주 사용설명서");
    const block = total.split("이 명식에서 눈여겨볼 구조")[1] ?? "";
    const whys = [...block.matchAll(/class="w">([^<]+)/g)].map((m) => m[1]!);
    expect(whys.length).toBe(3);
    expect(new Set(whys.map((w) => w.slice(0, 24))).size).toBe(3);
    expect(whys.filter((w) => /金 우세,\s*木 희소/.test(w)).length).toBeLessThanOrEqual(1);
  });

  it("removes money customer meta practicalMeaning", () => {
    const money = htmlFor("2026-money", "나의 돈 사용설명서");
    expect(money).not.toMatch(/돈 성향은[^.]*입체적/);
    expect(money).toMatch(/사주에서는 왜 이렇게 보는지|왜 이런 해석이 나왔나요\?/);
    expect((money.match(/class="page /g) ?? []).length).toBeGreaterThanOrEqual(6);
  });
});
