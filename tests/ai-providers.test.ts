import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";
import {
  assertMockAllowed,
  getAiFallbackProvider,
  getAiModelFree,
  resolveAiProviderName,
} from "@/lib/ai/config";
import { buildGenerationKey } from "@/lib/ai/generation-key";
import { createMockAIProvider } from "@/lib/ai/providers";
import { OpenAIProvider } from "@/lib/ai/providers/openai";
import { GeminiProvider } from "@/lib/ai/providers/gemini";
import { AiEngineError, isRetryableAiError } from "@/lib/ai/errors";
import { createFortuneInterpreter } from "@/lib/ai/interpreters/free-interpreter";
import { fortuneEngine } from "@/lib/fortune-engine";
import { buildMockFreeResult } from "@/lib/ai/interpreters/mock-content";
import { buildFortuneAiContext } from "@/lib/ai/context";
import { freeFortuneResultStrictSchema } from "@/lib/ai/schemas/free-result";

const sampleSchema = z.object({
  headline: z.string(),
  score: z.number().int().min(1).max(5),
});

describe("AI provider selection", () => {
  const prev = { ...process.env };

  afterEach(() => {
    process.env = { ...prev };
  });

  it("selects gemini when AI_PROVIDER=gemini", () => {
    process.env.AI_PROVIDER = "gemini";
    process.env.NODE_ENV = "development";
    expect(resolveAiProviderName()).toBe("gemini");
    expect(getAiModelFree("gemini")).toContain("gemini");
  });

  it("selects openai when AI_PROVIDER=openai", () => {
    process.env.AI_PROVIDER = "openai";
    process.env.NODE_ENV = "development";
    expect(resolveAiProviderName()).toBe("openai");
  });

  it("selects mock when AI_PROVIDER=mock in development", () => {
    process.env.AI_PROVIDER = "mock";
    process.env.NODE_ENV = "test";
    expect(resolveAiProviderName()).toBe("mock");
  });

  it("rejects unknown provider", () => {
    process.env.AI_PROVIDER = "claude";
    expect(() => resolveAiProviderName()).toThrow(/CONFIGURATION_ERROR/);
  });

  it("blocks mock in production runtime", () => {
    process.env.AI_PROVIDER = "mock";
    process.env.NODE_ENV = "production";
    process.env.APP_ENV = "production";
    delete process.env.ALLOW_MOCK_AI;
    delete process.env.npm_lifecycle_event;
    delete process.env.NEXT_PHASE;
    expect(() => assertMockAllowed()).toThrow(/forbidden in production/);
  });

  it("keeps fallback disabled by default", () => {
    delete process.env.AI_FALLBACK_PROVIDER;
    expect(getAiFallbackProvider()).toBeNull();
  });
});

describe("AIProvider contract", () => {
  it("MockAIProvider returns AIProviderResult shape", async () => {
    const provider = createMockAIProvider(() => ({
      headline: "테스트",
      score: 3,
    }));
    const result = await provider.generateStructured({
      model: "mock",
      systemPrompt: "sys",
      userPrompt: "user",
      schema: sampleSchema,
      schemaName: "sample",
    });
    expect(result.provider).toBe("mock");
    expect(result.data.headline).toBe("테스트");
    expect(result.usage).toEqual({
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
    });
    expect(typeof result.latencyMs).toBe("number");
  });

  it("OpenAIProvider and GeminiProvider classes exist with correct names", () => {
    expect(new OpenAIProvider().name).toBe("openai");
    expect(new GeminiProvider().name).toBe("gemini");
  });
});

describe("generation key includes provider", () => {
  it("differs between gemini and openai", () => {
    const base = {
      calculationHash: "abc",
      promptVersionId: "pv1",
      model: "m1",
      resultType: "free" as const,
    };
    const g = buildGenerationKey({ ...base, provider: "gemini" });
    const o = buildGenerationKey({ ...base, provider: "openai" });
    expect(g).not.toBe(o);
    expect(g).toHaveLength(64);
  });
});

describe("provider-backed mock interpreter still validates", () => {
  it("createFortuneInterpreter(mock) produces provider=mock meta", async () => {
    process.env.AI_PROVIDER = "mock";
    process.env.NODE_ENV = "test";
    const chart = fortuneEngine.calculate({
      gender: "female",
      calendarType: "solar",
      birthDate: "1990-05-15",
      birthTime: "10:30",
      birthTimeUnknown: false,
      timezone: "Asia/Seoul",
      countryCode: "KR",
    });
    const interpreter = createFortuneInterpreter("mock");
    const result = await interpreter.generateFree({
      chart,
      promptVersion: {
        promptDefinitionId: "d",
        promptVersionId: "v",
        promptVersionNumber: 1,
      },
    });
    expect(result.meta.provider).toBe("mock");
    expect(result.meta.generationKeyVersion).toBe("v2");
    freeFortuneResultStrictSchema.parse(result);
  });

  it("invalid evidence from mock factory is rejected by shared validator path", async () => {
    const { validateFreeSemantics } = await import(
      "@/lib/ai/validators/semantic-validator"
    );
    const chart = fortuneEngine.calculate({
      gender: "male",
      calendarType: "solar",
      birthDate: "2000-01-10",
      birthTime: "12:00",
      birthTimeUnknown: false,
      timezone: "Asia/Seoul",
      countryCode: "KR",
    });
    const ctx = buildFortuneAiContext(chart);
    const bad = buildMockFreeResult(ctx);
    bad.evidence = ["not-a-real-key"];
    expect(() => validateFreeSemantics(bad, ctx)).toThrow();
  });
});

describe("retry classification", () => {
  it("rate limit is retryable; bad request is not", () => {
    expect(
      isRetryableAiError(
        new AiEngineError("OPENAI_RATE_LIMIT", "429", { retryable: true })
      )
    ).toBe(true);
    expect(
      isRetryableAiError(
        new AiEngineError("OPENAI_BAD_REQUEST", "bad", { retryable: false })
      )
    ).toBe(false);
  });
});
