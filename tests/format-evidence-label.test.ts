import { describe, expect, it } from "vitest";
import {
  formatEvidenceLabel,
  formatFortuneEvidenceForDisplay,
  isTechnicalEvidenceKey,
} from "@/lib/presentation/format-evidence-label";

describe("formatEvidenceLabel", () => {
  it("keeps already-Korean human labels", () => {
    expect(formatEvidenceLabel("丁火 일간")).toBe("丁火 일간");
    expect(formatEvidenceLabel("월주 상관")).toBe("월주 상관");
    expect(formatEvidenceLabel("식상 우세")).toBe("식상 우세");
  });

  it("maps known technical keys", () => {
    expect(formatEvidenceLabel("dayMaster")).toBe("일간");
    expect(formatEvidenceLabel("dayMaster=丁")).toBe("丁 일간");
    expect(formatEvidenceLabel("tenGods.month.stem")).toBe("월주 천간(십성)");
    expect(formatEvidenceLabel("tenGods.day.branch")).toBe("일주 지지(십성)");
    expect(formatEvidenceLabel("tenGods.hour.branch")).toBe("시주 지지(십성)");
    expect(formatEvidenceLabel("fiveElements.earth")).toBe("土 기운");
    expect(formatEvidenceLabel("fiveElements.wood=3")).toBe("木 기운");
    expect(formatEvidenceLabel("pillars.month.stem")).toBe("월주 천간");
    expect(formatEvidenceLabel("hourUnknown")).toBe("시주 미상");
  });

  it("formats leaked technical lists for display", () => {
    const labels = formatFortuneEvidenceForDisplay([
      "tenGods.month.stem",
      "tenGods.day.branch",
      "fiveElements.earth",
      "tenGods.month.stem",
    ]);
    expect(labels).toEqual([
      "월주 천간(십성)",
      "일주 지지(십성)",
      "土 기운",
    ]);
  });

  it("detects technical keys without translating Korean", () => {
    expect(isTechnicalEvidenceKey("fiveElements.fire")).toBe(true);
    expect(isTechnicalEvidenceKey("검 기사 역방향의 조급함")).toBe(false);
  });
});
