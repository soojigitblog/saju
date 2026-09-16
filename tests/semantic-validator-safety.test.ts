import { describe, expect, it } from "vitest";
import { FORBIDDEN_PREDICTION_PATTERNS } from "@/lib/ai/validators/semantic-validator";

function matchesForbidden(text: string): boolean {
  return FORBIDDEN_PREDICTION_PATTERNS.some((pattern) => pattern.test(text));
}

describe("paid-report fatalism safety", () => {
  it("rejects global fate labels that make a customer feel condemned", () => {
    for (const copy of [
      "팔자가 세서 관계가 어렵습니다.",
      "사주가 나빠서 조심해야 합니다.",
      "배우자 복이 없습니다.",
      "부모 복이 없어요.",
      "단명할 수 있습니다.",
      "평생 가난합니다.",
    ]) {
      expect(matchesForbidden(copy)).toBe(true);
    }
  });

  it("keeps conditional, actionable guidance available", () => {
    expect(
      matchesForbidden("변동성이 큰 선택에서는 기준을 먼저 정해 지출을 점검해 보세요.")
    ).toBe(false);
  });
});
