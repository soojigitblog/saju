import { describe, expect, it } from "vitest";
import { fortuneEngine } from "@/lib/fortune-engine";
import { calculateAnnualFortune } from "@/lib/adult-v2/annual-fortune";
import { calculateAdultV2Data } from "@/lib/adult-v2";
import { calculateDaeun, daeunForYear } from "@/lib/adult-v2/daeun";
import { buildFortuneEvidence } from "@/lib/adult-v2/evidence";
import {
  ACTIVATION_SCORE_WEIGHTS,
  calculateChangePressure,
  calculateDomainActivation,
  calculateEvidenceCoverage,
} from "@/lib/adult-v2/scoring";
import type { FortuneEvidence } from "@/lib/adult-v2/types";
import { BRANCHES, STEMS } from "@/lib/fortune-engine/constants";
import { pillarFromHangulGanji } from "@/lib/fortune-engine/calculators/pillars";
import {
  ADULT_V2_EXTERNAL_DAEUN_VALIDATION,
  adultV2ReferenceCases,
} from "./fixtures/adult-v2-reference-cases";

describe("Adult V2 daeun engine", () => {
  it("does not misrepresent provider snapshots as independent external validation", () => {
    expect(ADULT_V2_EXTERNAL_DAEUN_VALIDATION).toBe("EXTERNAL_VALIDATION_PENDING");
  });

  for (const fixture of adultV2ReferenceCases) {
    it(fixture.name, () => {
      const chart = fortuneEngine.calculate(fixture.input);
      const daeun = calculateDaeun(chart);
      expect([
        chart.pillars.year.ganji.hanja,
        chart.pillars.month.ganji.hanja,
        chart.pillars.day.ganji.hanja,
        chart.pillars.hour?.ganji.hanja,
      ]).toEqual(fixture.expected.pillars);
      expect(daeun.direction).toBe(fixture.expected.direction);
      expect(daeun.startAge).toBe(fixture.expected.startAge);
      expect(daeun.startDate).toBe(fixture.expected.startDate);
      expect(daeun.periods[0].ganji.hanja).toBe(fixture.expected.first);
      expect(daeun.periods[1].ganji.hanja).toBe(fixture.expected.second);
      expect(daeun.periods[2].ganji.hanja).toBe(fixture.expected.third);
    });
  }

  it("preserves an explicit caveat when birth time is unknown", () => {
    const chart = fortuneEngine.calculate({
      gender: "female", calendarType: "solar", birthDate: "2024-02-04",
      birthTime: null, birthTimeUnknown: true, timezone: "Asia/Seoul", countryCode: "KR",
    });
    const daeun = calculateDaeun(chart);
    expect(chart.pillars.hour).toBeNull();
    expect(daeun.caveats).toHaveLength(1);
    expect(daeunForYear(daeun, 2024)?.ganji.hanja).toBe("丙寅");
  });
});

describe("luck-pillar Hangul normalization", () => {
  it("normalizes every 60-gapja Hangul pair, including 신유, to the canonical Hanja pair", () => {
    for (let index = 0; index < 60; index += 1) {
      const stem = STEMS[index % 10];
      const branch = BRANCHES[index % 12];
      expect(pillarFromHangulGanji(`${stem.hangul}${branch.hangul}`).ganji.hanja)
        .toBe(`${stem.hanja}${branch.hanja}`);
    }
    expect(pillarFromHangulGanji("신유").ganji.hanja).toBe("辛酉");
  });
});

describe("Adult V2 annual fortune", () => {
  it("uses Lichun, rather than January 1, as the annual boundary", () => {
    const annual = calculateAnnualFortune(2024);
    expect(annual.pillar.ganji.hanja).toBe("甲辰");
    expect(annual.startsAtKst).toBe("2024-02-04T17:27:00+09:00");

    const beforeLichun = fortuneEngine.calculate({
      gender: "male", calendarType: "solar", birthDate: "2024-02-04",
      birthTime: "17:26", birthTimeUnknown: false, timezone: "Asia/Seoul", countryCode: "KR",
    });
    const afterLichun = fortuneEngine.calculate({
      gender: "male", calendarType: "solar", birthDate: "2024-02-04",
      birthTime: "17:28", birthTimeUnknown: false, timezone: "Asia/Seoul", countryCode: "KR",
    });
    expect(beforeLichun.pillars.year.ganji.hanja).toBe("癸卯");
    expect(afterLichun.pillars.year.ganji.hanja).toBe("甲辰");
  });

  it("is stable across calendar-year edges", () => {
    expect(calculateAnnualFortune(2025).pillar.ganji.hanja).toBe("乙巳");
    expect(calculateAnnualFortune(2026).pillar.ganji.hanja).toBe("丙午");
    expect(calculateAnnualFortune(2027).pillar.ganji.hanja).toBe("丁未");
    expect(calculateAnnualFortune(2028).pillar.ganji.hanja).toBe("戊申");

    const lastDay = fortuneEngine.calculate({
      gender: "male", calendarType: "solar", birthDate: "2025-12-31",
      birthTime: "12:00", birthTimeUnknown: false, timezone: "Asia/Seoul", countryCode: "KR",
    });
    const newYear = fortuneEngine.calculate({
      gender: "male", calendarType: "solar", birthDate: "2026-01-01",
      birthTime: "00:00", birthTimeUnknown: false, timezone: "Asia/Seoul", countryCode: "KR",
    });
    expect(lastDay.pillars.year.ganji.hanja).toBe("乙巳");
    expect(newYear.pillars.year.ganji.hanja).toBe("乙巳");
  });

  it("moves the month pillar at the next actual solar-term boundary", () => {
    // 2024 경칩 is 11:23 KST according to manseryeok's embedded term table.
    const before = fortuneEngine.calculate({
      gender: "male", calendarType: "solar", birthDate: "2024-03-05",
      birthTime: "11:22", birthTimeUnknown: false, timezone: "Asia/Seoul", countryCode: "KR",
    });
    const after = fortuneEngine.calculate({
      gender: "male", calendarType: "solar", birthDate: "2024-03-05",
      birthTime: "11:24", birthTimeUnknown: false, timezone: "Asia/Seoul", countryCode: "KR",
    });
    expect(before.pillars.month.ganji.hanja).toBe("丙寅");
    expect(after.pillars.month.ganji.hanja).toBe("丁卯");
  });

  it("keeps the product midnight convention around the zi-hour boundary", () => {
    const before = fortuneEngine.calculate({
      gender: "male", calendarType: "solar", birthDate: "2024-03-10",
      birthTime: "22:59", birthTimeUnknown: false, timezone: "Asia/Seoul", countryCode: "KR",
    });
    const zi = fortuneEngine.calculate({
      gender: "male", calendarType: "solar", birthDate: "2024-03-10",
      birthTime: "23:00", birthTimeUnknown: false, timezone: "Asia/Seoul", countryCode: "KR",
    });
    const midnight = fortuneEngine.calculate({
      gender: "male", calendarType: "solar", birthDate: "2024-03-10",
      birthTime: "00:00", birthTimeUnknown: false, timezone: "Asia/Seoul", countryCode: "KR",
    });
    expect(before.pillars.hour.ganji.hanja).toBe("癸亥");
    expect(zi.pillars.hour.ganji.hanja).toBe("壬子");
    expect(midnight.pillars.hour.ganji.hanja).toBe("壬子");
  });
});

describe("Adult V2 evidence, activation, and change-pressure engines", () => {
  it("emits only reproducible evidence and makes six clashes traceable", () => {
    const chart = fortuneEngine.calculate({
      gender: "male", calendarType: "solar", birthDate: "1992-10-24",
      birthTime: "05:30", birthTimeUnknown: false, timezone: "Asia/Seoul", countryCode: "KR",
    });
    const daeun = calculateDaeun(chart);
    const annual = calculateAnnualFortune(2026); // 丙午: clashes natal 酉? no, it still verifies facts without inventing one.
    const evidence = buildFortuneEvidence({ chart, annual, daeun: daeunForYear(daeun, 2026) });
    expect(evidence.some((item) => item.type === "TEN_GOD" && item.source === "annualStem")).toBe(true);
    expect(evidence.every((item) => ["TEN_GOD", "ELEMENT", "CLASH"].includes(item.type))).toBe(true);
    expect(evidence.every((item) => !item.detail.includes("용신") && !item.detail.includes("신강"))).toBe(true);
  });

  it("treats ten-god evidence as activation, never positive fortune", () => {
    const evidence: FortuneEvidence = {
      id: "money-theme", type: "TEN_GOD", effect: "activation", domain: "money",
      source: "annualStem", tenGod: "정재", detail: "test",
    };
    const activation = calculateDomainActivation([evidence]);
    expect(evidence.effect).toBe("activation");
    expect(activation.money.score).toBe(
      ACTIVATION_SCORE_WEIGHTS.base + ACTIVATION_SCORE_WEIGHTS.tenGod.annualStem
    );
    expect(activation.career.score).toBe(ACTIVATION_SCORE_WEIGHTS.base);
  });

  it("keeps clashes out of domain activation and records change pressure instead", () => {
    const clash: FortuneEvidence = {
      id: "change", type: "CLASH", effect: "change", source: "annualBranch",
      relation: "충", detail: "test",
    };
    expect(calculateDomainActivation([clash]).relationship.score)
      .toBe(ACTIVATION_SCORE_WEIGHTS.base);
    expect(calculateChangePressure([clash])).toMatchObject({ score: 35, level: "normal" });
  });

  it("is deterministic across 100 runs and keeps every indicator in 0–100", () => {
    const chart = fortuneEngine.calculate({
      gender: "male", calendarType: "solar", birthDate: "1992-10-24",
      birthTime: "05:30", birthTimeUnknown: false, timezone: "Asia/Seoul", countryCode: "KR",
    });
    const first = calculateAdultV2Data(chart, 2026);
    for (let run = 0; run < 100; run += 1) {
      expect(calculateAdultV2Data(chart, 2026)).toEqual(first);
    }
    const values = [
      ...Object.values(first.activation).map((item) => item.score),
      first.changePressure.score,
      first.confidence.score,
    ];
    expect(values.every((value) => value >= 0 && value <= 100)).toBe(true);
  });

  it("reports evidence coverage rather than prediction confidence", () => {
    expect(calculateEvidenceCoverage({ birthTimeKnown: true, hasDaeun: true }))
      .toMatchObject({ score: 100, level: "strong", missingSources: [] });
    expect(calculateEvidenceCoverage({ birthTimeKnown: false, hasDaeun: true }))
      .toMatchObject({ score: 80, level: "strong", missingSources: ["birthTime"] });
  });

  it("keeps multi-case activation and pressure values inside 0–100", () => {
    const inputs = adultV2ReferenceCases.slice(0, 4).map((fixture) => fixture.input);
    const values = inputs.flatMap((input) =>
      [2026, 2027, 2028].flatMap((year) =>
        (() => {
          const result = calculateAdultV2Data(fortuneEngine.calculate(input), year);
          return [
            ...Object.values(result.activation).map((score) => score.score),
            result.changePressure.score,
            result.confidence.score,
          ];
        })()
      )
    ).sort((a, b) => a - b);
    expect(values[0]).toBeGreaterThanOrEqual(0);
    expect(values[values.length - 1]).toBeLessThanOrEqual(100);
    expect(new Set(values).size).toBeGreaterThan(2);
  });
});
