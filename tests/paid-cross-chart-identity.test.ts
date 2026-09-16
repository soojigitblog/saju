import { describe, expect, it } from "vitest";
import { fortuneEngine } from "@/lib/fortune-engine";
import { buildFortuneAiContext } from "@/lib/ai/context";
import { buildMockPaidResult } from "@/lib/ai/interpreters/mock-content";
import { enrichConsultingGrade } from "@/lib/ai/interpreters/mock-consulting-grade";

function paidReport(
  birthDate: string,
  birthTime = "10:30",
  productSlug = "2026-money",
  productName = "재물운 집중분석"
) {
  const chart = fortuneEngine.calculate({
    gender: "female",
    calendarType: "solar",
    birthDate,
    birthTime,
    birthTimeUnknown: false,
    lunarLeapMonth: false,
    timezone: "Asia/Seoul",
    countryCode: "KR",
  });
  const ctx = buildFortuneAiContext(chart);
  return buildMockPaidResult(ctx, productName, {
    productSlug,
    chart,
  });
}

describe("paid report identity across charts", () => {
  it.each([
    ["2026-money", "재물운 집중분석"],
    ["2026-career", "나의 일 사용설명서"],
    ["2026-love", "나의 연애 사용설명서"],
    ["2026-total", "나의 사주 사용설명서"],
  ])("does not reuse chart identity or first action for %s", (productSlug, productName) => {
    const a = paidReport("1990-05-15", "10:30", productSlug, productName);
    const b = paidReport("1985-01-08", "09:00", productSlug, productName);
    const c = paidReport("2001-12-25", "14:20", productSlug, productName);

    const pack = (report: typeof a) => ({
      signature: report.signatureStatement,
      shareable: report.sections[0]?.shareableLine ?? "",
      core: report.sections[0]?.coreInsight ?? "",
      firstAction: report.actionItems[0]?.what ?? "",
    });

    const pa = pack(a);
    const pb = pack(b);
    const pc = pack(c);

    expect(pa.signature).not.toBe(pb.signature);
    expect(pa.signature).not.toBe(pc.signature);
    expect(pb.signature).not.toBe(pc.signature);

    expect(pa.shareable).not.toBe(pb.shareable);
    expect(pa.shareable).not.toBe(pc.shareable);
    expect(pb.shareable).not.toBe(pc.shareable);

    expect(pa.core).not.toBe(pb.core);
    expect(pa.core).not.toBe(pc.core);
    expect(pb.core).not.toBe(pc.core);

    expect(pa.firstAction).not.toBe(pb.firstAction);
    expect(pa.firstAction).not.toBe(pc.firstAction);
    expect(pb.firstAction).not.toBe(pc.firstAction);

    const elementHits = [a, b, c].flatMap((report) =>
      report.sections.flatMap((s) => s.evidence.filter((e) => e.startsWith("fiveElements.")))
    );
    expect(new Set(elementHits).size).toBeGreaterThan(1);
  });

  it("keeps consulting whyDeeper tied to the chart-specific core", () => {
    const a = enrichConsultingGrade(paidReport("1990-05-15"));
    const b = enrichConsultingGrade(paidReport("1985-01-08", "09:00"));
    const whyA = a.sections.find((s) => s.key === "money_v4_structure")?.whyDeeper ?? "";
    const whyB = b.sections.find((s) => s.key === "money_v4_structure")?.whyDeeper ?? "";
    expect(whyA).toContain(a.sections[0]?.coreInsight ?? "___missing___");
    expect(whyA).not.toBe(whyB);
  });
});
