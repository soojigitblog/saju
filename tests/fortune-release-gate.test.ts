import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getSolarTerm, getSolarTermsOfYear, solarToLunar, lunarToSolar, getTenGod, getBranchTenGod } from "manseryeok";
import { fortuneEngine } from "@/lib/fortune-engine";
import {
  BRANCHES,
  JIE_SOLAR_TERM_NAMES,
  STEMS,
  SUPPORT_YEAR_MAX,
  SUPPORT_YEAR_MIN,
} from "@/lib/fortune-engine/constants";
import { tenGodForTarget } from "@/lib/fortune-engine/calculators/ten-gods";
import { buildCalculationHash } from "@/lib/fortune-engine/hash";
import { resolveEngineConfig } from "@/lib/fortune-engine/config";
import { FORTUNE_RELEASE_MANIFEST } from "@/lib/fortune-engine/release-manifest";
import { FortuneEngineError } from "@/lib/fortune-engine/types";
import {
  KASI_2024,
  KASI_2024_LICHUN,
  KASI_2026,
  KASI_2026_JIE_TERMS,
  KASI_2026_LICHUN,
  KASI_2028,
  KASI_2028_LICHUN,
} from "./fixtures/kasi";
import {
  TEN_GODS_EXPECTED_MATRIX,
  assertTenGodsMatrixShape,
} from "./fixtures/ten-gods-matrix";

function formatKstParts(date: Date) {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    timezone: "Asia/Seoul" as const,
  };
}

function stripVolatile(chart: ReturnType<typeof fortuneEngine.calculate>) {
  const { calculatedAt, ...engineRest } = chart.engine;
  void calculatedAt;
  return { ...chart, engine: engineRest };
}

describe("release manifest / provider pin", () => {
  it("installed manseryeok version is exact 2.0.0", () => {
    const pkgPath = path.join(process.cwd(), "node_modules/manseryeok/package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { version: string };
    expect(pkg.version).toBe(FORTUNE_RELEASE_MANIFEST.provider.version);
    expect(pkg.version).toBe("2.0.0");
  });

  it("manifest conventions match runtime config", () => {
    const config = resolveEngineConfig();
    expect(config.yearBoundary).toBe(FORTUNE_RELEASE_MANIFEST.conventions.yearBoundary);
    expect(config.monthBoundary).toBe(FORTUNE_RELEASE_MANIFEST.conventions.monthBoundary);
    expect(config.dayBoundary).toBe(FORTUNE_RELEASE_MANIFEST.conventions.dayBoundary);
    expect(config.timezone).toBe(FORTUNE_RELEASE_MANIFEST.conventions.timezone);
    expect(config.timeCorrection).toBe(FORTUNE_RELEASE_MANIFEST.conventions.timeCorrection);
    expect(config.minYear).toBe(SUPPORT_YEAR_MIN);
    expect(config.maxYear).toBe(SUPPORT_YEAR_MAX);
  });
});

describe("KASI fixture provenance / year isolation", () => {
  it("each year fixture meta.year matches every term datetime.year", () => {
    for (const fixture of [KASI_2024, KASI_2026, KASI_2028]) {
      expect(fixture.meta.year).toBe(fixture.meta.year);
      expect(fixture.meta.source).toBe("KASI");
      expect(fixture.meta.timezone).toBe("Asia/Seoul");
      for (const term of fixture.jieTerms) {
        expect(term.year, `${fixture.meta.year} / ${term.name}`).toBe(fixture.meta.year);
        expect(term.timezone).toBe("Asia/Seoul");
      }
      if (fixture.allTerms) {
        for (const term of fixture.allTerms) {
          expect(term.year, `${fixture.meta.year} all / ${term.name}`).toBe(fixture.meta.year);
        }
      }
    }
  });

  it("2026 입춘 is not confused with 2028 입춘", () => {
    expect(KASI_2026_LICHUN).toMatchObject({
      year: 2026,
      month: 2,
      day: 4,
      hour: 5,
      minute: 2,
    });
    expect(KASI_2028_LICHUN).toMatchObject({
      year: 2028,
      month: 2,
      day: 4,
      hour: 16,
      minute: 31,
    });
    expect(
      `${KASI_2026_LICHUN.hour}:${KASI_2026_LICHUN.minute}`
    ).not.toBe(`${KASI_2028_LICHUN.hour}:${KASI_2028_LICHUN.minute}`);
  });
});

describe("KASI direct solar-term validation", () => {
  it("2026 provider 12 절 times match KASI official bulletin minute-level", () => {
    const providerTerms = getSolarTermsOfYear(2026);
    const mismatches: string[] = [];
    const diffs: string[] = [];

    for (const kasi of KASI_2026_JIE_TERMS) {
      const provider = providerTerms.find((t) => t.name === kasi.name);
      expect(provider, `missing provider term ${kasi.name}`).toBeTruthy();
      const got = formatKstParts(provider!.date);
      const pad = (n: number) => String(n).padStart(2, "0");
      const kasiLine = `${kasi.year}-${pad(kasi.month)}-${pad(kasi.day)} ${pad(kasi.hour)}:${pad(kasi.minute)}`;
      const provLine = `${got.year}-${pad(got.month)}-${pad(got.day)} ${pad(got.hour)}:${pad(got.minute)}`;
      const same =
        got.year === kasi.year &&
        got.month === kasi.month &&
        got.day === kasi.day &&
        got.hour === kasi.hour &&
        got.minute === kasi.minute &&
        got.timezone === kasi.timezone;
      diffs.push(`${kasi.name}\nKASI      ${kasiLine}\nProvider  ${provLine}\n${same ? "MATCH" : "MISMATCH"}`);
      if (!same) {
        mismatches.push(`${kasi.name}: KASI ${kasiLine} vs provider ${provLine}`);
      }
    }

    // Visible in failure output; also asserts empty mismatches
    expect(mismatches, diffs.join("\n\n")).toEqual([]);
  });

  it("2024 입춘 matches KASI-aligned reference 17:27 KST", () => {
    const lichun = getSolarTerm(2024, 2);
    const got = formatKstParts(lichun.date);
    expect(got).toEqual({
      year: KASI_2024_LICHUN.year,
      month: KASI_2024_LICHUN.month,
      day: KASI_2024_LICHUN.day,
      hour: KASI_2024_LICHUN.hour,
      minute: KASI_2024_LICHUN.minute,
      timezone: "Asia/Seoul",
    });
  });

  it("2028 입춘 sanity fixture matches provider (year mix-up guard)", () => {
    const lichun = getSolarTerm(2028, 2);
    const got = formatKstParts(lichun.date);
    expect(got).toEqual({
      year: KASI_2028_LICHUN.year,
      month: KASI_2028_LICHUN.month,
      day: KASI_2028_LICHUN.day,
      hour: KASI_2028_LICHUN.hour,
      minute: KASI_2028_LICHUN.minute,
      timezone: "Asia/Seoul",
    });
  });
});

describe("solar-term boundary rule (gte_enters_new)", () => {
  it("documents comparison: < previous, >= new — verified at 2024 입춘", () => {
    expect(FORTUNE_RELEASE_MANIFEST.solarTermBoundaryRule).toBe("gte_enters_new");
    const before = fortuneEngine.calculate({
      gender: "female",
      calendarType: "solar",
      birthDate: "2024-02-04",
      birthTime: "17:26",
      birthTimeUnknown: false,
      timezone: "Asia/Seoul",
      countryCode: "KR",
    });
    const at = fortuneEngine.calculate({
      gender: "female",
      calendarType: "solar",
      birthDate: "2024-02-04",
      birthTime: "17:27",
      birthTimeUnknown: false,
      timezone: "Asia/Seoul",
      countryCode: "KR",
    });
    const after = fortuneEngine.calculate({
      gender: "female",
      calendarType: "solar",
      birthDate: "2024-02-04",
      birthTime: "17:28",
      birthTimeUnknown: false,
      timezone: "Asia/Seoul",
      countryCode: "KR",
    });

    expect(before.pillars.year.ganji.hanja).toBe("癸卯");
    expect(before.pillars.month.ganji.hanja).toBe("乙丑");
    expect(at.pillars.year.ganji.hanja).toBe("甲辰");
    expect(at.pillars.month.ganji.hanja).toBe("丙寅");
    expect(after.pillars.year.ganji.hanja).toBe(at.pillars.year.ganji.hanja);
    expect(after.pillars.month.ganji.hanja).toBe(at.pillars.month.ganji.hanja);
  });

  it("2026 입춘 — 05:01 previous, 05:02 enters new, 05:03 stays new (gte_enters_new)", () => {
    expect(KASI_2026_LICHUN.hour).toBe(5);
    expect(KASI_2026_LICHUN.minute).toBe(2);

    const before = fortuneEngine.calculate({
      gender: "female",
      calendarType: "solar",
      birthDate: "2026-02-04",
      birthTime: "05:01",
      birthTimeUnknown: false,
      timezone: "Asia/Seoul",
      countryCode: "KR",
    });
    const at = fortuneEngine.calculate({
      gender: "female",
      calendarType: "solar",
      birthDate: "2026-02-04",
      birthTime: "05:02",
      birthTimeUnknown: false,
      timezone: "Asia/Seoul",
      countryCode: "KR",
    });
    const after = fortuneEngine.calculate({
      gender: "female",
      calendarType: "solar",
      birthDate: "2026-02-04",
      birthTime: "05:03",
      birthTimeUnknown: false,
      timezone: "Asia/Seoul",
      countryCode: "KR",
    });

    // Exact minute enters new year + month (입춘)
    expect(before.pillars.year.ganji.hanja).not.toBe(at.pillars.year.ganji.hanja);
    expect(before.pillars.month.ganji.hanja).not.toBe(at.pillars.month.ganji.hanja);
    expect(at.pillars.year.ganji.hanja).toBe(after.pillars.year.ganji.hanja);
    expect(at.pillars.month.ganji.hanja).toBe(after.pillars.month.ganji.hanja);
  });

  it("2026 KASI 12 절 boundaries: -1 / exact / +1 minute (gte_enters_new)", () => {
    expect(KASI_2026_JIE_TERMS).toHaveLength(12);
    expect(KASI_2026_JIE_TERMS.map((t) => t.name)).toEqual([...JIE_SOLAR_TERM_NAMES]);

    const pad = (n: number) => String(n).padStart(2, "0");

    for (const term of KASI_2026_JIE_TERMS) {
      const instant = new Date(
        `${term.year}-${pad(term.month)}-${pad(term.day)}T${pad(term.hour)}:${pad(term.minute)}:00+09:00`
      );
      const beforeParts = formatKstParts(new Date(instant.getTime() - 60_000));
      const afterParts = formatKstParts(new Date(instant.getTime() + 60_000));

      const before = fortuneEngine.calculate({
        gender: "male",
        calendarType: "solar",
        birthDate: `${beforeParts.year}-${pad(beforeParts.month)}-${pad(beforeParts.day)}`,
        birthTime: `${pad(beforeParts.hour)}:${pad(beforeParts.minute)}`,
        birthTimeUnknown: false,
        timezone: "Asia/Seoul",
        countryCode: "KR",
      });
      const on = fortuneEngine.calculate({
        gender: "male",
        calendarType: "solar",
        birthDate: `${term.year}-${pad(term.month)}-${pad(term.day)}`,
        birthTime: `${pad(term.hour)}:${pad(term.minute)}`,
        birthTimeUnknown: false,
        timezone: "Asia/Seoul",
        countryCode: "KR",
      });
      const after = fortuneEngine.calculate({
        gender: "male",
        calendarType: "solar",
        birthDate: `${afterParts.year}-${pad(afterParts.month)}-${pad(afterParts.day)}`,
        birthTime: `${pad(afterParts.hour)}:${pad(afterParts.minute)}`,
        birthTimeUnknown: false,
        timezone: "Asia/Seoul",
        countryCode: "KR",
      });

      expect(on.pillars.month.ganji.hanja, `${term.name} exact==+1m month`).toBe(
        after.pillars.month.ganji.hanja
      );
      const changed =
        before.pillars.month.ganji.hanja !== on.pillars.month.ganji.hanja ||
        before.pillars.year.ganji.hanja !== on.pillars.year.ganji.hanja;
      expect(changed, `${term.name} should change year or month pillar at exact minute`).toBe(true);
    }
  });
});

describe("lunar validation + round trip", () => {
  it("solar↔lunar round trip preserves date", () => {
    const samples = [
      [1992, 10, 24],
      [2000, 2, 29],
      [2010, 6, 15],
      [2024, 1, 1],
    ] as const;
    for (const [y, m, d] of samples) {
      const lunar = solarToLunar(y, m, d);
      const back = lunarToSolar(lunar.year, lunar.month, lunar.day, lunar.isLeapMonth);
      expect(back).toEqual({ year: y, month: m, day: d });
    }
  });

  it("lunar↔solar round trip preserves leap flag", () => {
    const samples = [
      { y: 1992, m: 9, d: 29, leap: false },
      { y: 2010, m: 3, d: 10, leap: false },
      { y: 2020, m: 4, d: 1, leap: true },
      { y: 2006, m: 7, d: 15, leap: true },
    ];
    for (const s of samples) {
      const solar = lunarToSolar(s.y, s.m, s.d, s.leap);
      const back = solarToLunar(solar.year, solar.month, solar.day);
      expect(back.year).toBe(s.y);
      expect(back.month).toBe(s.m);
      expect(back.day).toBe(s.d);
      expect(back.isLeapMonth).toBe(s.leap);
    }
  });

  it("Korea/China 1997 Seollal regression — KASI New Year is 1997-02-08", () => {
    // China often lists 1997-02-07; Korean KASI/manseryeok: 1997-02-08
    expect(lunarToSolar(1997, 1, 1, false)).toEqual({
      year: 1997,
      month: 2,
      day: 8,
    });
    expect(solarToLunar(1997, 2, 7)).toEqual({
      year: 1996,
      month: 12,
      day: 30,
      isLeapMonth: false,
    });
    expect(solarToLunar(1997, 2, 8)).toEqual({
      year: 1997,
      month: 1,
      day: 1,
      isLeapMonth: false,
    });
  });
});

describe("zi-hour midnight convention matrix", () => {
  const baseDate = "2024-03-10";
  const cases = [
    { time: "22:59", day: "癸酉", hour: "癸亥" },
    { time: "23:00", day: "癸酉", hour: "壬子" },
    { time: "23:30", day: "癸酉", hour: "壬子" },
    { time: "23:59", day: "癸酉", hour: "壬子" },
    { time: "00:00", day: "癸酉", hour: "壬子", date: "2024-03-10" },
    { time: "00:30", day: "癸酉", hour: "壬子" },
    { time: "00:59", day: "癸酉", hour: "壬子" },
    { time: "01:00", day: "癸酉", hour: "癸丑" },
  ] as const;

  for (const c of cases) {
    it(`${c.time}`, () => {
      const chart = fortuneEngine.calculate({
        gender: "male",
        calendarType: "solar",
        birthDate: "date" in c && c.date ? c.date : baseDate,
        birthTime: c.time,
        birthTimeUnknown: false,
        timezone: "Asia/Seoul",
        countryCode: "KR",
      });
      expect(chart.conventions.dayBoundary).toBe("midnight");
      expect(chart.pillars.day.ganji.hanja).toBe(c.day);
      expect(chart.pillars.hour?.ganji.hanja).toBe(c.hour);
      // hour branch from ganji second character
      expect(chart.pillars.hour?.branch.hanja).toBe(c.hour[1]);
      expect(chart.pillars.hour?.stem.hanja).toBe(c.hour[0]);
    });
  }
});

describe("60 ganji exhaustive", () => {
  it("covers 0–59 with consistent stem/branch cycle metadata", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 60; i++) {
      const stem = STEMS[i % 10];
      const branch = BRANCHES[i % 12];
      const key = `${stem.hanja}${branch.hanja}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
      expect(stem.hangul).toBeTruthy();
      expect(branch.hangul).toBeTruthy();
      expect(stem.element).toBeTruthy();
      expect(branch.yinYang).toBeTruthy();
    }
    expect(seen.size).toBe(60);
  });
});

describe("ten gods 100 matrix + provider cross-check", () => {
  it("expected matrix shape", () => {
    assertTenGodsMatrixShape(TEN_GODS_EXPECTED_MATRIX);
  });

  it("engine matches frozen 100-cell matrix", () => {
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 10; j++) {
        expect(tenGodForTarget(STEMS[i], STEMS[j])).toBe(
          TEN_GODS_EXPECTED_MATRIX[i][j]
        );
      }
    }
  });

  it("matches manseryeok getTenGod / getBranchTenGod labels", () => {
    for (const day of STEMS) {
      for (const target of STEMS) {
        if (day.index === target.index) {
          // Chart uses "일간" for day-master self; provider stem API returns "비견".
          expect(tenGodForTarget(day, target)).toBe("일간");
          expect(getTenGod(day.hangul, target.hangul)).toBe("비견");
          continue;
        }
        expect(tenGodForTarget(day, target)).toBe(
          getTenGod(day.hangul, target.hangul)
        );
      }
      for (const branch of BRANCHES) {
        const ours = tenGodForTarget(day, STEMS[branch.mainStemIndex]);
        const provider = getBranchTenGod(day.hangul, branch.hangul);
        if (day.index === branch.mainStemIndex) {
          expect(ours).toBe("일간");
          expect(provider).toBe("비견");
        } else {
          expect(ours).toBe(provider);
        }
      }
    }
  });
});

describe("five elements invariants", () => {
  it("known time sums to 8; unknown sums to 6", () => {
    const known = fortuneEngine.calculate({
      gender: "female",
      calendarType: "solar",
      birthDate: "1992-10-24",
      birthTime: "05:30",
      birthTimeUnknown: false,
      timezone: "Asia/Seoul",
      countryCode: "KR",
    });
    const unknown = fortuneEngine.calculate({
      gender: "female",
      calendarType: "solar",
      birthDate: "1992-10-24",
      birthTime: null,
      birthTimeUnknown: true,
      timezone: "Asia/Seoul",
      countryCode: "KR",
    });
    const sum = (c: typeof known) =>
      c.fiveElements.wood +
      c.fiveElements.fire +
      c.fiveElements.earth +
      c.fiveElements.metal +
      c.fiveElements.water;
    expect(sum(known)).toBe(8);
    expect(sum(unknown)).toBe(6);
  });
});

describe("determinism + calculation hash", () => {
  const input = {
    gender: "female" as const,
    calendarType: "solar" as const,
    birthDate: "1990-05-15",
    birthTime: "14:30",
    birthTimeUnknown: false,
    timezone: "Asia/Seoul",
    countryCode: "KR",
  };

  it("three calculates are deep-equal excluding calculatedAt", () => {
    const a = stripVolatile(fortuneEngine.calculate(input));
    const b = stripVolatile(fortuneEngine.calculate(input));
    const c = stripVolatile(fortuneEngine.calculate(input));
    expect(a).toEqual(b);
    expect(b).toEqual(c);
  });

  it("hash includes engine/provider/conventions and is stable", () => {
    const config = resolveEngineConfig();
    const h1 = buildCalculationHash(input, config);
    const h2 = buildCalculationHash(input, config);
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[a-f0-9]{64}$/);
    expect(createHash("sha256").update("x").digest("hex")).not.toBe(h1);
    const chart = fortuneEngine.calculate(input);
    expect(chart.engine.calculationHash).toBe(h1);
    expect(chart.engine.name).toBe(FORTUNE_RELEASE_MANIFEST.engineName);
    expect(chart.engine.version).toBe(FORTUNE_RELEASE_MANIFEST.engineVersion);
    expect(chart.engine.provider).toBe(FORTUNE_RELEASE_MANIFEST.provider.name);
    expect(chart.engine.providerVersion).toBe(
      FORTUNE_RELEASE_MANIFEST.provider.version
    );
  });
});

describe("unsupported year range", () => {
  it.each([
    [1899, false],
    [1900, true],
    [2050, true],
    [2051, false],
  ] as const)("%s supported=%s", (year, ok) => {
    const run = () =>
      fortuneEngine.calculate({
        gender: "male",
        calendarType: "solar",
        birthDate: `${year}-06-15`,
        birthTime: "12:00",
        birthTimeUnknown: false,
        timezone: "Asia/Seoul",
        countryCode: "KR",
      });
    if (ok) {
      expect(run().pillars.day).toBeTruthy();
    } else {
      try {
        run();
        expect.fail("expected throw");
      } catch (e) {
        expect(e).toBeInstanceOf(FortuneEngineError);
        expect((e as FortuneEngineError).code).toBe("UNSUPPORTED_DATE_RANGE");
      }
    }
  });
});
