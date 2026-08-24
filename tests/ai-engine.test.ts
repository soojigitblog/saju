import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { fortuneEngine } from "@/lib/fortune-engine";
import type { BirthInput } from "@/lib/fortune-engine/types";
import { AiEngineError, isRetryableAiError } from "@/lib/ai/errors";
import { buildFortuneAiContext, buildEvidenceWhitelist } from "@/lib/ai/context";
import { buildGenerationKey } from "@/lib/ai/generation-key";
import {
  clearGenerationCacheForTests,
  hasGenerationKey,
  putGenerationCache,
  peekGenerationCache,
} from "@/lib/ai/generation-cache";
import { freeFortuneResultSchema } from "@/lib/ai/schemas/free-result";
import { paidFortuneReportSchema } from "@/lib/ai/schemas/paid-report";
import {
  validateFreeSemantics,
  validatePaidSemantics,
} from "@/lib/ai/validators/semantic-validator";
import { MockFortuneInterpreter } from "@/lib/ai/interpreters/mock-interpreter";
import { buildMockFreeResult } from "@/lib/ai/interpreters/mock-content";
import { USER_FACING_DISCLAIMER } from "@/lib/ai/disclaimer";
import { getAiModelFree, getAiModelPaid } from "@/lib/ai/config";

function loadFixture(name: string) {
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
  return raw.birth;
}

function chartFromBirth(birth: ReturnType<typeof loadFixture>) {
  const input: BirthInput = {
    gender: birth.gender,
    calendarType: birth.calendarType,
    birthDate: birth.birthDate,
    birthTime: birth.birthTimeUnknown ? null : birth.birthTime,
    birthTimeUnknown: birth.birthTimeUnknown,
    timezone: "Asia/Seoul",
    countryCode: "KR",
  };
  return fortuneEngine.calculate(input);
}

const promptVersion = {
  promptDefinitionId: "def-free",
  promptVersionId: "ver-free-1",
  promptVersionNumber: 1,
};

describe("AI schemas", () => {
  it("accepts valid free result", () => {
    const chart = chartFromBirth(loadFixture("balanced-elements.json"));
    const ctx = buildFortuneAiContext(chart);
    const result = buildMockFreeResult(ctx);
    expect(freeFortuneResultSchema.parse(result).scores.overall).toBeGreaterThanOrEqual(1);
  });

  it("rejects score out of range", () => {
    const chart = chartFromBirth(loadFixture("balanced-elements.json"));
    const ctx = buildFortuneAiContext(chart);
    const result = buildMockFreeResult(ctx);
    result.scores.overall = 6;
    expect(() => freeFortuneResultSchema.parse(result)).toThrow();
  });

  it("rejects missing paid section via semantic validator", () => {
    const chart = chartFromBirth(loadFixture("balanced-elements.json"));
    const ctx = buildFortuneAiContext(chart);
    const interpreter = new MockFortuneInterpreter();
    return interpreter
      .generatePaid({
        chart,
        promptVersion,
        product: { slug: "2026-total", name: "2026" },
      })
      .then((paid) => {
        const broken = {
          ...paid,
          sections: paid.sections.filter((s) => s.key !== "total_v4_money_link"),
        };
        const { meta: _m, ...body } = broken;
        void _m;
        expect(() =>
          validatePaidSemantics(body, ctx, { productSlug: "2026-total" })
        ).toThrow(/missing section: total_v4_money_link/);
      });
  });
});

describe("evidence + semantic validation", () => {
  it("rejects invalid evidence keys", () => {
    const chart = chartFromBirth(loadFixture("minimal-data.json"));
    const ctx = buildFortuneAiContext(chart);
    const result = buildMockFreeResult(ctx);
    result.evidence = ["fabricatedPillar.year"];
    expect(() => validateFreeSemantics(result, ctx)).toThrow(/invalid evidence/);
  });

  it("rejects forbidden prediction phrases", () => {
    const chart = chartFromBirth(loadFixture("balanced-elements.json"));
    const ctx = buildFortuneAiContext(chart);
    const result = buildMockFreeResult(ctx);
    result.summary = "올해는 반드시 성공하고 대박 난다. " + result.summary;
    expect(() => validateFreeSemantics(result, ctx)).toThrow(/forbidden prediction/);
  });

  it("rejects unknown-hour concrete hour interpretation", () => {
    const chart = chartFromBirth(loadFixture("unknown-time.json"));
    expect(chart.pillars.hour).toBeNull();
    const ctx = buildFortuneAiContext(chart);
    const result = buildMockFreeResult(ctx);
    result.personality.summary =
      "오시에 태어난 기질이 강해 낮 동안의 활동성이 두드러집니다. " + result.personality.summary;
    expect(() => validateFreeSemantics(result, ctx)).toThrow(/unknown-hour/);
  });

  it("whitelist includes hourUnknown when time missing", () => {
    const chart = chartFromBirth(loadFixture("unknown-time.json"));
    const ctx = buildFortuneAiContext(chart);
    const wl = buildEvidenceWhitelist(ctx);
    expect(wl.has("hourUnknown")).toBe(true);
    expect(wl.has("pillars.hour.stem")).toBe(false);
  });
});

describe("Mock interpreter + generation key", () => {
  it("generates valid free and paid outputs", async () => {
    const chart = chartFromBirth(loadFixture("wood-heavy.json"));
    const interpreter = new MockFortuneInterpreter();
    const free = await interpreter.generateFree({ chart, promptVersion });
    expect(free.disclaimer).toContain("엔터테인먼트");
    expect(free.meta.generationKey).toHaveLength(64);
    expect(free.meta.scoreSource).toBe("ai_v1");

    const paid = await interpreter.generatePaid({
      chart,
      promptVersion,
      product: { slug: "2026-total", name: "2026 종합" },
    });
    expect(paid.sections.length).toBeGreaterThanOrEqual(5);
    expect(paidFortuneReportSchema.safeParse(paid).success).toBe(true);
  });

  it("duplicate generation key is stable and cacheable", async () => {
    clearGenerationCacheForTests();
    const chart = chartFromBirth(loadFixture("balanced-elements.json"));
    const interpreter = new MockFortuneInterpreter();
    const a = await interpreter.generateFree({
      chart,
      promptVersion,
      model: "gpt-5.6-luna",
    });
    const b = await interpreter.generateFree({
      chart,
      promptVersion,
      model: "gpt-5.6-luna",
    });
    expect(a.meta.generationKey).toBe(b.meta.generationKey);

    putGenerationCache(a.meta.generationKey, a);
    expect(hasGenerationKey(a.meta.generationKey)).toBe(true);
    expect(peekGenerationCache<typeof a>(a.meta.generationKey)?.headline).toBe(a.headline);

    const other = buildGenerationKey({
      calculationHash: chart.engine.calculationHash,
      promptVersionId: "other",
      provider: "mock",
      model: "gpt-5.6-luna",
      resultType: "free",
    });
    expect(other).not.toBe(a.meta.generationKey);
  });
});

describe("retry eligibility", () => {
  it("marks rate limit retryable and bad request not", () => {
    const retryable = new AiEngineError("OPENAI_RATE_LIMIT", "429", { retryable: true });
    const bad = new AiEngineError("OPENAI_BAD_REQUEST", "bad", { retryable: false });
    expect(isRetryableAiError(retryable)).toBe(true);
    expect(isRetryableAiError(bad)).toBe(false);
  });
});

describe("model config", () => {
  it("defaults to luna/terra without hardcoding at call sites", () => {
    expect(getAiModelFree()).toBeTruthy();
    expect(getAiModelPaid()).toBeTruthy();
    expect(USER_FACING_DISCLAIMER.length).toBeGreaterThan(20);
  });
});
