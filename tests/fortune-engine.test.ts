import { describe, expect, it } from "vitest";
import { STEMS, BRANCHES } from "@/lib/fortune-engine/constants";
import { fortuneEngine } from "@/lib/fortune-engine";
import { tenGodForTarget } from "@/lib/fortune-engine/calculators/ten-gods";
import { FortuneEngineError } from "@/lib/fortune-engine/types";
import { buildCalculationHash } from "@/lib/fortune-engine/hash";
import { resolveEngineConfig } from "@/lib/fortune-engine/config";
import fixtures from "./fixtures/fortune-cases.json";

describe("heavenly stems / earthly branches constants", () => {
  it("maps 10 stems", () => {
    expect(STEMS).toHaveLength(10);
    expect(STEMS[0]).toMatchObject({ hanja: "甲", hangul: "갑", element: "wood" });
    expect(STEMS[9]).toMatchObject({ hanja: "癸", hangul: "계", element: "water" });
  });

  it("maps 12 branches with main qi", () => {
    expect(BRANCHES).toHaveLength(12);
    expect(BRANCHES[0]).toMatchObject({ hanja: "子", hangul: "자", mainStemIndex: 9 });
    expect(BRANCHES[2]).toMatchObject({ hanja: "寅", hangul: "인", mainStemIndex: 0 });
  });

  it("60-jiazi stem/branch pairing is consistent", () => {
    for (let i = 0; i < 60; i++) {
      const stem = STEMS[i % 10];
      const branch = BRANCHES[i % 12];
      expect(stem).toBeTruthy();
      expect(branch).toBeTruthy();
    }
  });
});

describe("ten gods", () => {
  it("same element polarity rules", () => {
    const gap = STEMS[0]; // 甲
    expect(tenGodForTarget(gap, STEMS[0])).toBe("일간");
    expect(tenGodForTarget(gap, STEMS[1])).toBe("겁재"); // 乙
    expect(tenGodForTarget(gap, STEMS[2])).toBe("식신"); // 丙
    expect(tenGodForTarget(gap, STEMS[3])).toBe("상관"); // 丁
  });
});

describe("golden fixtures", () => {
  for (const fixture of fixtures) {
    it(fixture.name, () => {
      const chart = fortuneEngine.calculate(fixture.input as never);
      expect(chart.pillars.year.ganji.hanja).toBe(fixture.expected.year);
      expect(chart.pillars.month.ganji.hanja).toBe(fixture.expected.month);
      expect(chart.pillars.day.ganji.hanja).toBe(fixture.expected.day);
      if (fixture.expected.hour === null) {
        expect(chart.pillars.hour).toBeNull();
      } else {
        expect(chart.pillars.hour?.ganji.hanja).toBe(fixture.expected.hour);
      }
      expect(chart.conventions.dayBoundary).toBe("midnight");
      expect(chart.conventions.timeCorrection).toBe("none");
      expect(chart.fiveElements.method).toBe("visible_stems_branches_count");
    });
  }
});

describe("invalid inputs", () => {
  it("rejects invalid solar date", () => {
    expect(() =>
      fortuneEngine.calculate({
        gender: "male",
        calendarType: "solar",
        birthDate: "2023-02-29",
        birthTime: "12:00",
        birthTimeUnknown: false,
        timezone: "Asia/Seoul",
        countryCode: "KR",
      })
    ).toThrow(FortuneEngineError);
  });

  it("rejects future-leaning unsupported range", () => {
    try {
      fortuneEngine.calculate({
        gender: "male",
        calendarType: "solar",
        birthDate: "1899-01-01",
        birthTime: "12:00",
        birthTimeUnknown: false,
        timezone: "Asia/Seoul",
        countryCode: "KR",
      });
      expect.fail("should throw");
    } catch (error) {
      expect(error).toBeInstanceOf(FortuneEngineError);
      expect((error as FortuneEngineError).code).toBe("UNSUPPORTED_DATE_RANGE");
    }
  });

  it("rejects invalid leap month", () => {
    try {
      fortuneEngine.calculate({
        gender: "male",
        calendarType: "lunar",
        birthDate: "2021-01-01",
        birthTime: "12:00",
        birthTimeUnknown: false,
        lunarLeapMonth: true,
        timezone: "Asia/Seoul",
        countryCode: "KR",
      });
      expect.fail("should throw");
    } catch (error) {
      expect(error).toBeInstanceOf(FortuneEngineError);
      expect(["INVALID_LEAP_MONTH", "INVALID_LUNAR_DATE"]).toContain(
        (error as FortuneEngineError).code
      );
    }
  });
});

describe("determinism", () => {
  it("same input yields same pillars and hash (ignoring calculatedAt)", () => {
    const input = {
      gender: "female" as const,
      calendarType: "solar" as const,
      birthDate: "1992-10-24",
      birthTime: "05:30",
      birthTimeUnknown: false,
      timezone: "Asia/Seoul",
      countryCode: "KR",
    };
    const a = fortuneEngine.calculate(input);
    const b = fortuneEngine.calculate(input);
    expect(a.pillars).toEqual(b.pillars);
    expect(a.engine.calculationHash).toBe(b.engine.calculationHash);
    expect(a.engine.calculationHash).toBe(
      buildCalculationHash(input, resolveEngineConfig())
    );
  });
});
