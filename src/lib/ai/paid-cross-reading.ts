import "server-only";

import { createHash } from "node:crypto";
import {
  AI_SCHEMA_VERSION,
  GENERATION_KEY_VERSION,
  assertPaidGeminiConfigured,
  getAiModelPaid,
  resolveAiProviderForPaid,
} from "@/lib/ai/config";
import { buildFortuneAiContext } from "@/lib/ai/context";
import { buildInterpretationContextV2 } from "@/lib/ai/interpretation-context-v2";
import { USER_FACING_DISCLAIMER } from "@/lib/ai/disclaimer";
import { AiEngineError } from "@/lib/ai/errors";
import { buildMockPaidCrossReading } from "@/lib/ai/interpreters/mock-paid-cross";
import { buildSystemPrompt } from "@/lib/ai/prompts/build-system-prompt";
import { getAIProvider } from "@/lib/ai/providers";
import {
  paidCrossReadingStrictSchema,
  type PaidCrossReading,
} from "@/lib/ai/schemas/paid-cross-reading";
import { validatePaidCrossReadingSemantics } from "@/lib/ai/validators/paid-cross-validator";
import type { FortuneChart } from "@/lib/fortune-engine/types";
import type { TarotAiContext } from "@/lib/tarot/engine/draw";

export const PAID_CROSS_PROMPT_VERSION = {
  id: "22222222-2222-2222-2222-222222222206",
  definitionId: "11111111-1111-1111-1111-111111111106",
  version: 1,
} as const;

export type PaidCrossReadingOutput = PaidCrossReading & {
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

export function buildPaidCrossGenerationKey(input: {
  calculationHash: string;
  orderId: string;
  questionFingerprint: string;
  provider: string;
  model: string;
}): string {
  const raw = [
    GENERATION_KEY_VERSION,
    input.calculationHash,
    PAID_CROSS_PROMPT_VERSION.id,
    input.provider,
    input.model,
    "paid_tarot_cross",
    input.orderId,
    input.questionFingerprint,
  ].join("|");
  return createHash("sha256").update(raw).digest("hex");
}

function subsetContext(
  v2: ReturnType<typeof buildInterpretationContextV2>,
  category: string
) {
  const domain =
    category === "career"
      ? "work"
      : category === "money"
        ? "money"
        : category === "love"
          ? "love"
          : "cross";
  return {
    contextVersion: v2.contextVersion,
    capability: v2.capability,
    domainSignals: v2.domainSignals.filter(
      (d) => d.domain === domain || d.domain === "cross" || d.domain === "total"
    ),
    behaviorHypotheses: v2.behaviorHypotheses.filter((c) =>
      domain === "work"
        ? c.id.startsWith("work")
        : domain === "money"
          ? c.id.startsWith("money")
          : domain === "love"
            ? c.id.startsWith("love")
            : true
    ),
    tensions: v2.tensions,
    strengthShadowPairs: v2.strengthShadowPairs,
    evidenceRegistry: v2.evidenceRegistry.slice(0, 24),
  };
}

export async function generatePaidCrossReading(input: {
  chart: FortuneChart;
  tarotContext: TarotAiContext;
  orderId: string;
}): Promise<PaidCrossReadingOutput> {
  assertPaidGeminiConfigured();

  const fortuneCtx = buildFortuneAiContext(input.chart);
  const v2Full = buildInterpretationContextV2(fortuneCtx, input.chart);
  const providerName = resolveAiProviderForPaid();
  const model = getAiModelPaid(providerName);
  const qfp = createHash("sha256")
    .update(
      `${input.tarotContext.questionCategory}|${input.tarotContext.question ?? ""}`
    )
    .digest("hex")
    .slice(0, 16);

  if (providerName === "mock") {
    const data = buildMockPaidCrossReading(
      fortuneCtx,
      v2Full,
      input.tarotContext
    );
    const parsed = paidCrossReadingStrictSchema.parse({
      ...data,
      disclaimer: data.disclaimer || USER_FACING_DISCLAIMER,
    });
    validatePaidCrossReadingSemantics(parsed, input.tarotContext);
    const generationKey = buildPaidCrossGenerationKey({
      calculationHash: input.chart.engine.calculationHash,
      orderId: input.orderId,
      questionFingerprint: qfp,
      provider: "mock",
      model: "mock-paid-cross",
    });
    return {
      ...parsed,
      meta: {
        schemaVersion: AI_SCHEMA_VERSION,
        provider: "mock",
        model: "mock-paid-cross",
        generationKey,
        generationKeyVersion: GENERATION_KEY_VERSION,
        generatedAt: new Date().toISOString(),
        promptVersionId: PAID_CROSS_PROMPT_VERSION.id,
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      },
    };
  }

  // Paid: Gemini only — no OpenAI automatic fallback.
  if (providerName !== "gemini") {
    throw new AiEngineError(
      "PAID_AI_NOT_CONFIGURED",
      "Paid Tarot must use Gemini paid key (or mock in tests).",
      { retryable: false }
    );
  }

  const subset = subsetContext(v2Full, input.tarotContext.questionCategory);
  const systemPrompt = buildSystemPrompt({
    promptVersion: {
      promptDefinitionId: PAID_CROSS_PROMPT_VERSION.definitionId,
      promptVersionId: PAID_CROSS_PROMPT_VERSION.id,
      promptVersionNumber: PAID_CROSS_PROMPT_VERSION.version,
      systemPromptOverride: [
        "ROLE: Paid Saju×Tarot deep cross editor.",
        "Do NOT invent Daeun/Saeun/Yongsin timing or convert questions into yearly luck.",
        "Every crossConnection must combine SAJU + TAROT into NEW insight.",
        "Output PaidCrossReadingV1 JSON only.",
      ].join(" "),
    },
  });
  const userPrompt = [
    "CONTEXT_JSON:",
    JSON.stringify(
      {
        question: {
          category: input.tarotContext.questionCategory,
          text: input.tarotContext.question,
        },
        interpretationSubset: subset,
        tarot: input.tarotContext,
      },
      null,
      2
    ),
  ].join("\n");

  const provider = getAIProvider(providerName);
  const generated = await provider.generateStructured({
    model,
    systemPrompt,
    userPrompt,
    schema: paidCrossReadingStrictSchema,
    schemaName: "paid_cross_reading_v1",
  });

  let data: PaidCrossReading;
  try {
    data = paidCrossReadingStrictSchema.parse({
      ...generated.data,
      reportKind: "paid_tarot",
      disclaimer: generated.data.disclaimer || USER_FACING_DISCLAIMER,
    });
  } catch (error) {
    throw new AiEngineError(
      "SCHEMA_VALIDATION_FAILED",
      "Paid cross reading failed Zod validation",
      {
        retryable: false,
        cause: error,
        providerRequestId: generated.providerRequestId,
      }
    );
  }

  validatePaidCrossReadingSemantics(data, input.tarotContext);

  const generationKey = buildPaidCrossGenerationKey({
    calculationHash: input.chart.engine.calculationHash,
    orderId: input.orderId,
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
      promptVersionId: PAID_CROSS_PROMPT_VERSION.id,
      usage: generated.usage,
      providerRequestId: generated.providerRequestId,
    },
  };
}
