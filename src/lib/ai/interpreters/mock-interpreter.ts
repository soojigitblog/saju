import { FORTUNE_RELEASE_MANIFEST } from "@/lib/fortune-engine/release-manifest";
import {
  AI_SCHEMA_VERSION,
  AI_SCORE_SOURCE,
  GENERATION_KEY_VERSION,
  getAiModelFree,
  getAiModelPaid,
} from "@/lib/ai/config";
import { buildFortuneAiContext } from "@/lib/ai/context";
import { buildGenerationKey } from "@/lib/ai/generation-key";
import {
  buildMockFreeResult,
  buildMockPaidResult,
} from "@/lib/ai/interpreters/mock-content";
import type {
  FortuneInterpreter,
  FreeGenerateArgs,
  PaidGenerateArgs,
} from "@/lib/ai/interpreters/types";
import { freeFortuneResultStrictSchema } from "@/lib/ai/schemas/free-result";
import { paidFortuneReportStrictSchema } from "@/lib/ai/schemas/paid-report";
import {
  validateFreeSemantics,
  validatePaidSemantics,
} from "@/lib/ai/validators/semantic-validator";
import type {
  FreeInterpretationOutput,
  PaidInterpretationOutput,
} from "@/lib/ai/types";

/**
 * Deterministic mock interpreter for local/dev/test.
 * Must NOT be used as a silent production fallback.
 */
export class MockFortuneInterpreter implements FortuneInterpreter {
  async generateFree(args: FreeGenerateArgs): Promise<FreeInterpretationOutput> {
    const ctx = buildFortuneAiContext(args.chart);
    const model = args.model ?? getAiModelFree("mock");
    const raw = buildMockFreeResult(ctx);
    const parsed = freeFortuneResultStrictSchema.parse(raw);
    validateFreeSemantics(parsed, ctx);

    const generationKey = buildGenerationKey({
      calculationHash: args.chart.engine.calculationHash,
      promptVersionId: args.promptVersion.promptVersionId,
      provider: "mock",
      model,
      resultType: "free",
      productSlug: args.product?.slug,
    });

    return {
      ...parsed,
      meta: {
        schemaVersion: AI_SCHEMA_VERSION,
        engineVersion: FORTUNE_RELEASE_MANIFEST.engineVersion,
        providerVersion: FORTUNE_RELEASE_MANIFEST.provider.version,
        provider: "mock",
        promptDefinitionId: args.promptVersion.promptDefinitionId,
        promptVersionId: args.promptVersion.promptVersionId,
        promptVersionNumber: args.promptVersion.promptVersionNumber,
        model,
        scoreSource: AI_SCORE_SOURCE,
        generationKey,
        generationKeyVersion: GENERATION_KEY_VERSION,
        generatedAt: new Date().toISOString(),
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        providerRequestId: `mock-${generationKey.slice(0, 12)}`,
      },
    };
  }

  async generatePaid(args: PaidGenerateArgs): Promise<PaidInterpretationOutput> {
    const ctx = buildFortuneAiContext(args.chart);
    const model = args.model ?? getAiModelPaid("mock");
    const raw = buildMockPaidResult(ctx, args.product.name);
    const parsed = paidFortuneReportStrictSchema.parse(raw);
    validatePaidSemantics(parsed, ctx);

    const generationKey = buildGenerationKey({
      calculationHash: args.chart.engine.calculationHash,
      promptVersionId: args.promptVersion.promptVersionId,
      provider: "mock",
      model,
      resultType: "paid",
      productSlug: args.product.slug,
    });

    return {
      ...parsed,
      meta: {
        schemaVersion: AI_SCHEMA_VERSION,
        engineVersion: FORTUNE_RELEASE_MANIFEST.engineVersion,
        providerVersion: FORTUNE_RELEASE_MANIFEST.provider.version,
        provider: "mock",
        promptDefinitionId: args.promptVersion.promptDefinitionId,
        promptVersionId: args.promptVersion.promptVersionId,
        promptVersionNumber: args.promptVersion.promptVersionNumber,
        model,
        scoreSource: AI_SCORE_SOURCE,
        generationKey,
        generationKeyVersion: GENERATION_KEY_VERSION,
        generatedAt: new Date().toISOString(),
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        providerRequestId: `mock-${generationKey.slice(0, 12)}`,
      },
    };
  }
}
