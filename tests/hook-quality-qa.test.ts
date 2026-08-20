import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { fortuneEngine } from "@/lib/fortune-engine";
import type { BirthInput } from "@/lib/fortune-engine/types";
import { buildFortuneAiContext } from "@/lib/ai/context";
import { buildMockFreeResult } from "@/lib/ai/interpreters/mock-content";
import { validateFreeSemantics } from "@/lib/ai/validators/semantic-validator";
import {
  BEHAVIOR_MARKERS,
  countReversalTemplate,
  validateHookQuality,
} from "@/lib/ai/validators/hook-quality";

const FIXTURE_FILES = [
  "balanced-elements.json",
  "wood-heavy.json",
  "minimal-data.json",
  "unknown-time.json",
] as const;

const SYNTHETIC_BIRTHS: Array<{ label: string; input: BirthInput }> = [
  {
    label: "1988-11-03-f",
    input: {
      gender: "female",
      calendarType: "solar",
      birthDate: "1988-11-03",
      birthTime: "14:20",
      birthTimeUnknown: false,
      timezone: "Asia/Seoul",
      countryCode: "KR",
    },
  },
  {
    label: "1995-07-22-m",
    input: {
      gender: "male",
      calendarType: "solar",
      birthDate: "1995-07-22",
      birthTime: "07:45",
      birthTimeUnknown: false,
      timezone: "Asia/Seoul",
      countryCode: "KR",
    },
  },
  {
    label: "1983-04-08-f",
    input: {
      gender: "female",
      calendarType: "solar",
      birthDate: "1983-04-08",
      birthTime: "21:10",
      birthTimeUnknown: false,
      timezone: "Asia/Seoul",
      countryCode: "KR",
    },
  },
  {
    label: "2000-01-01-m",
    input: {
      gender: "male",
      calendarType: "solar",
      birthDate: "2000-01-01",
      birthTime: "12:00",
      birthTimeUnknown: false,
      timezone: "Asia/Seoul",
      countryCode: "KR",
    },
  },
  {
    label: "1978-09-17-f",
    input: {
      gender: "female",
      calendarType: "solar",
      birthDate: "1978-09-17",
      birthTime: "06:30",
      birthTimeUnknown: false,
      timezone: "Asia/Seoul",
      countryCode: "KR",
    },
  },
  {
    label: "1993-01-26-f",
    input: {
      gender: "female",
      calendarType: "solar",
      birthDate: "1993-01-26",
      birthTime: "10:00",
      birthTimeUnknown: false,
      timezone: "Asia/Seoul",
      countryCode: "KR",
    },
  },
];

function loadBirth(name: string): BirthInput {
  const raw = JSON.parse(
    readFileSync(path.join(process.cwd(), "tests/fixtures/ai", name), "utf8")
  ) as {
    birth: {
      gender: "male" | "female";
      calendarType: "solar" | "lunar";
      birthDate: string;
      birthTime: string | null;
      birthTimeUnknown: boolean;
    };
  };
  const b = raw.birth;
  return {
    gender: b.gender,
    calendarType: b.calendarType,
    birthDate: b.birthDate,
    birthTime: b.birthTimeUnknown ? null : b.birthTime,
    birthTimeUnknown: b.birthTimeUnknown,
    timezone: "Asia/Seoul",
    countryCode: "KR",
  };
}

function hookFor(input: BirthInput) {
  const chart = fortuneEngine.calculate(input);
  const ctx = buildFortuneAiContext(chart);
  const result = buildMockFreeResult(ctx);
  validateFreeSemantics(result, ctx);
  return { label: "", hookLine: result.hookLine, ctx, result };
}

describe("Hook Quality Pass — 10 fixture QA", () => {
  const cases = [
    ...FIXTURE_FILES.map((f) => ({ label: f, input: loadBirth(f) })),
    ...SYNTHETIC_BIRTHS,
  ];

  it("generates 10 distinct behavior-first hooks", () => {
    expect(cases.length).toBe(10);
    const hooks: string[] = [];
    const lines: string[] = [];

    for (const c of cases) {
      const { hookLine } = hookFor(c.input);
      hooks.push(hookLine);
      lines.push(`${c.label}: ${hookLine}`);

      expect(validateHookQuality(hookLine)).toEqual([]);
      expect(BEHAVIOR_MARKERS.test(hookLine)).toBe(true);
      expect(hookLine.length).toBeGreaterThanOrEqual(18);
      expect(hookLine.length).toBeLessThanOrEqual(48);
    }

    // Log for manual QA review in test output
    console.log("\n=== 10 Fixture Hook QA ===\n" + lines.map((l, i) => `${String(i + 1).padStart(2, "0")}. ${l}`).join("\n"));

    const unique = new Set(hooks);
    expect(unique.size).toBeGreaterThanOrEqual(8);

    const reversalCount = countReversalTemplate(hooks);
    expect(reversalCount).toBeLessThanOrEqual(4);
  });
});

describe("Hook Quality Pass — same chart BEFORE/AFTER reference", () => {
  it("balanced-elements uses behavior hook not personality adjective hook", () => {
    const input = loadBirth("balanced-elements.json");
    const { hookLine } = hookFor(input);

    const BEFORE =
      "남에겐 차분한 조력자지만 혼자 있을 땐 끊임없이 판을 짜는 사람";
    const genericPraise = /(열정|창의성|표현력|배려심|책임감).*사람$/;

    expect(hookLine).not.toBe(BEFORE);
    expect(genericPraise.test(hookLine)).toBe(false);
    expect(BEHAVIOR_MARKERS.test(hookLine)).toBe(true);

    console.log("\n=== Same Chart Comparison ===");
    console.log("BEFORE:", BEFORE);
    console.log("AFTER:", hookLine);
  });
});
