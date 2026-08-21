import "server-only";

import { createHash } from "node:crypto";
import {
  AI_SCHEMA_VERSION,
  GENERATION_KEY_VERSION,
  getAiModelFree,
  resolveAiProviderName,
} from "@/lib/ai/config";
import { buildFortuneAiContext } from "@/lib/ai/context";
import { USER_FACING_DISCLAIMER } from "@/lib/ai/disclaimer";
import { AiEngineError } from "@/lib/ai/errors";
import { buildMockCrossReading } from "@/lib/ai/interpreters/mock-cross-content";
import {
  CROSS_READING_SYSTEM_NOTES,
  buildCrossReadingUserPrompt,
} from "@/lib/ai/prompts/build-cross-prompt";
import { buildSystemPrompt } from "@/lib/ai/prompts/build-system-prompt";
import { getAIProvider } from "@/lib/ai/providers";
import {
  crossReadingResultStrictSchema,
  type CrossReadingResult,
} from "@/lib/ai/schemas/cross-reading";
import { validateCrossReadingSemantics } from "@/lib/ai/validators/cross-reading-validator";
import type { FortuneChart } from "@/lib/fortune-engine/types";
import type { TarotAiContext } from "@/lib/tarot/engine/draw";

export const CROSS_PROMPT_VERSION = {
  id: "33333333-3333-3333-3333-333333333301",
  definitionId: "33333333-3333-3333-3333-333333333300",
  version: 1,
} as const;

export type CrossReadingOutput = CrossReadingResult & {
  meta: {
    schemaVersion: string;
    provider: "gemini" | "openai" | "mock";
    model: string;
    generationKey: string;
    generationKeyVersion: string;
    generatedAt: string;
    promptVersionId: string;
    usage?: {
      inputTokens: number | null;
      outputTokens: number | null;
      totalTokens: number | null;
    };
    providerRequestId?: string;
  };
};

export function buildCrossGenerationKey(input: {
  calculationHash: string;
  readingId: string;
  questionFingerprint: string;
  provider: string;
  model: string;
}): string {
  const raw = [
    GENERATION_KEY_VERSION,
    input.calculationHash,
    CROSS_PROMPT_VERSION.id,
    input.provider,
    input.model,
    "tarot_cross",
    input.readingId,
    input.questionFingerprint,
  ].join("|");
  return createHash("sha256").update(raw).digest("hex");
}

export function fingerprintQuestion(
  category: string,
  questionText: string | null
): string {
  return createHash("sha256")
    .update(`${category}|${questionText ?? ""}`)
    .digest("hex")
    .slice(0, 16);
}

export async function generateCrossReading(input: {
  chart: FortuneChart;
  tarotContext: TarotAiContext;
  readingId: string;
}): Promise<CrossReadingOutput> {
  const fortuneCtx = buildFortuneAiContext(input.chart);
  const providerName = resolveAiProviderName();
  const model = getAiModelFree(providerName);
  const qfp = fingerprintQuestion(
    input.tarotContext.questionCategory,
    input.tarotContext.question
  );

  if (providerName === "mock") {
    const data = buildMockCrossReading(fortuneCtx, input.tarotContext);
    const parsed = crossReadingResultStrictSchema.parse({
      ...data,
      disclaimer: data.disclaimer || USER_FACING_DISCLAIMER,
    });
    validateCrossReadingSemantics(parsed, fortuneCtx, input.tarotContext);
    const generationKey = buildCrossGenerationKey({
      calculationHash: input.chart.engine.calculationHash,
      readingId: input.readingId,
      questionFingerprint: qfp,
      provider: "mock",
      model: "mock",
    });
    return {
      ...parsed,
      meta: {
        schemaVersion: AI_SCHEMA_VERSION,
        provider: "mock",
        model: "mock",
        generationKey,
        generationKeyVersion: GENERATION_KEY_VERSION,
        generatedAt: new Date().toISOString(),
        promptVersionId: CROSS_PROMPT_VERSION.id,
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      },
    };
  }

  const systemPrompt = buildSystemPrompt({
    promptVersion: {
      promptDefinitionId: CROSS_PROMPT_VERSION.definitionId,
      promptVersionId: CROSS_PROMPT_VERSION.id,
      promptVersionNumber: CROSS_PROMPT_VERSION.version,
      systemPromptOverride: CROSS_READING_SYSTEM_NOTES,
    },
  });
  const userPrompt = buildCrossReadingUserPrompt({
    fortuneContext: fortuneCtx,
    tarotContext: input.tarotContext,
  });

  const provider = getAIProvider(providerName);
  const generated = await provider.generateStructured({
    model,
    systemPrompt,
    userPrompt,
    schema: crossReadingResultStrictSchema,
    schemaName: "cross_reading_result",
  });

  let data: CrossReadingResult;
  try {
    data = crossReadingResultStrictSchema.parse({
      ...generated.data,
      disclaimer: generated.data.disclaimer || USER_FACING_DISCLAIMER,
    });
  } catch (error) {
    throw new AiEngineError(
      "SCHEMA_VALIDATION_FAILED",
      "Cross reading failed Zod validation",
      { retryable: false, cause: error, providerRequestId: generated.providerRequestId }
    );
  }

  validateCrossReadingSemantics(data, fortuneCtx, input.tarotContext);

  const generationKey = buildCrossGenerationKey({
    calculationHash: input.chart.engine.calculationHash,
    readingId: input.readingId,
    questionFingerprint: qfp,
    provider: generated.provider,
    model: generated.model,
  });

  return {
    ...data,
    meta: {
      schemaVersion: AI_SCHEMA_VERSION,
      provider: generated.provider,
      model: generated.model,
      generationKey,
      generationKeyVersion: GENERATION_KEY_VERSION,
      generatedAt: new Date().toISOString(),
      promptVersionId: CROSS_PROMPT_VERSION.id,
      usage: generated.usage,
      providerRequestId: generated.providerRequestId,
    },
  };
}
