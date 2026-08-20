import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { fortuneEngine } from "@/lib/fortune-engine";
import type { BirthInput } from "@/lib/fortune-engine/types";
import { buildFortuneAiContext } from "@/lib/ai/context";
import { freeFortuneResultSchema } from "@/lib/ai/schemas/free-result";
import { buildMockFreeResult } from "@/lib/ai/interpreters/mock-content";
import { validateFreeSemantics } from "@/lib/ai/validators/semantic-validator";
import { toFreeResultPublicDTO } from "@/lib/dto/free-result-public";
import { USER_FACING_DISCLAIMER } from "@/lib/ai/disclaimer";
import type { FreeInterpretationOutput } from "@/lib/ai/types";

const BARNUM_SNIPPETS = [
  "때로는 외로움",
  "인정받고 싶어",
  "마음이 따뜻",
  "책임감이 강",
  "노력하면 좋은 결과",
  "새로운 기회가 찾아올",
];

const FIXTURES = [
  "balanced-elements.json",
  "wood-heavy.json",
  "minimal-data.json",
  "unknown-time.json",
] as const;

/** Extra synthetic birth for 5th personalization fixture. */
const EXTRA_BIRTH: BirthInput = {
  gender: "female",
  calendarType: "solar",
  birthDate: "1988-11-03",
  birthTime: "14:20",
  birthTimeUnknown: false,
  timezone: "Asia/Seoul",
  countryCode: "KR",
};

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

function buildResult(input: BirthInput) {
  const chart = fortuneEngine.calculate(input);
  const ctx = buildFortuneAiContext(chart);
  const body = buildMockFreeResult(ctx);
  validateFreeSemantics(body, ctx);
  const parsed = freeFortuneResultSchema.parse(body);
  return { chart, ctx, result: parsed };
}

describe("Interpretation V2 personalization QA", () => {
  const cases = [
    ...FIXTURES.map((f) => ({ label: f, input: loadBirth(f) })),
    { label: "extra-1988-fireish", input: EXTRA_BIRTH },
  ];

  it("produces five valid V2 results with signature fields", () => {
    const hooks = new Set<string>();
    for (const c of cases) {
      const { result } = buildResult(c.input);
      expect(result.hookLine.length).toBeGreaterThan(10);
      expect(result.outerVsInner.outer).toBeTruthy();
      expect(result.outerVsInner.inner).toBeTruthy();
      expect(result.hiddenSelf.body).toBeTruthy();
      expect(result.strengths.length).toBeGreaterThanOrEqual(2);
      expect(result.cautionPatterns.length).toBeGreaterThanOrEqual(2);
      expect(result.stressPattern.length).toBeGreaterThan(20);
      expect(result.signatureClosing.length).toBeGreaterThan(20);
      expect(result.outerVsInner.insightBasis.length).toBeGreaterThan(0);
      hooks.add(result.hookLine);
    }
    // Differentiation: not all hooks identical
    expect(hooks.size).toBeGreaterThanOrEqual(4);
  });

  it("avoids obvious Barnum-only snippets in mock V2 copy", () => {
    for (const c of cases) {
      const { result } = buildResult(c.input);
      const blob = [
        result.hookLine,
        result.summary,
        result.personality.summary,
        result.hiddenSelf.body,
        ...result.strengths,
        ...result.cautionPatterns,
      ].join("\n");
      for (const snip of BARNUM_SNIPPETS) {
        expect(blob.includes(snip)).toBe(false);
      }
    }
  });

  it("maps public DTO with signature contents and strips generation internals", () => {
    const { result } = buildResult(cases[0].input);
    const withMeta = {
      ...result,
      meta: {
        provider: "mock",
        model: "mock",
        schemaVersion: "1.1",
        generationKey: "secret-key-should-not-leak",
        generationKeyVersion: "v2",
        scoreSource: "ai_v1",
        engineVersion: "1.0.0",
        generatedAt: new Date().toISOString(),
      },
    } as FreeInterpretationOutput;
    const dto = toFreeResultPublicDTO({
      id: "00000000-0000-4000-8000-000000000001",
      nickname: "테스트",
      birthYear: 1990,
      result: withMeta,
    });
    expect(dto.hookLine).toBe(result.hookLine);
    expect(dto.outerVsInner?.outer).toBeTruthy();
    expect(dto.hiddenSelf?.title).toBeTruthy();
    expect(dto.signatureClosing).toBeTruthy();
    expect(dto.disclaimer).toBe(USER_FACING_DISCLAIMER);
    const serialized = JSON.stringify(dto);
    expect(serialized.includes("generationKey")).toBe(false);
    expect(serialized.includes("secret-key")).toBe(false);
  });

  it("keeps free/paid boundary: previews locked, no date prophecy phrases", () => {
    for (const c of cases) {
      const { result } = buildResult(c.input);
      expect(result.previews.every((p) => p.locked)).toBe(true);
      const blob = result.previews.map((p) => p.preview).join(" ");
      expect(/3월에|올해\s*이직|큰돈을\s*벌|이혼수/.test(blob)).toBe(false);
    }
  });
});
