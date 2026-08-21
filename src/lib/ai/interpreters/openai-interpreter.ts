import "server-only";

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
import { AiEngineError } from "@/lib/ai/errors";
import { buildSystemPrompt } from "@/lib/ai/prompts/build-system-prompt";
import { buildFreeUserPrompt } from "@/lib/ai/prompts/build-free-prompt";
import { buildPaidUserPrompt } from "@/lib/ai/prompts/build-paid-prompt";
import type {
  FortuneInterpreter,
  FreeGenerateArgs,
  PaidGenerateArgs,
} from "@/lib/ai/interpreters/types";
import {
  freeFortuneResultStrictSchema,
} from "@/lib/ai/schemas/free-result";
import {
  paidFortuneReportStrictSchema,
} from "@/lib/ai/schemas/paid-report";
import {
  validateFreeSemantics,
  validatePaidSemantics,
} from "@/lib/ai/validators/semantic-validator";
import { generateStructuredResult } from "@/lib/ai/wrapper/generate-structured";
import { withValidationRetry } from "@/lib/ai/interpreters/with-validation-retry";
import type {
  FreeInterpretationOutput,
  PaidInterpretationOutput,
} from "@/lib/ai/types";
import { USER_FACING_DISCLAIMER } from "@/lib/ai/disclaimer";

export class OpenAIFortuneInterpreter implements FortuneInterpreter {
  async generateFree(args: FreeGenerateArgs): Promise<FreeInterpretationOutput> {
    const ctx = buildFortuneAiContext(args.chart);
    const model = args.model ?? getAiModelFree("openai");
    const systemPrompt = buildSystemPrompt({
      promptVersion: args.promptVersion,
      extraProductRules: args.promptVersion.productInstruction,
    });
    const userPrompt = buildFreeUserPrompt({
      fortuneContext: ctx,
      product: args.product,
      presentation: args.presentation,
      productInstruction: args.promptVersion.productInstruction,
    });

    return withValidationRetry(async () => {
      const generated = await generateStructuredResult({
        model,
        systemPrompt,
        userPrompt,
        schema: freeFortuneResultStrictSchema,
        schemaName: "free_fortune_result",
      });

      let data = generated.data;
      try {
        data = freeFortuneResultStrictSchema.parse({
          ...data,
          disclaimer: data.disclaimer || USER_FACING_DISCLAIMER,
        });
      } catch (error) {
        throw new AiEngineError(
          "SCHEMA_VALIDATION_FAILED",
          "Free result failed Zod validation",
          { retryable: true, cause: error, providerRequestId: generated.providerRequestId }
        );
      }

      validateFreeSemantics(data, ctx);

      const generationKey = buildGenerationKey({
        calculationHash: args.chart.engine.calculationHash,
        promptVersionId: args.promptVersion.promptVersionId,
        provider: "openai",
        model: generated.model,
        resultType: "free",
        productSlug: args.product?.slug,
      });

      return {
        ...data,
        meta: {
          schemaVersion: AI_SCHEMA_VERSION,
          engineVersion: FORTUNE_RELEASE_MANIFEST.engineVersion,
          providerVersion: FORTUNE_RELEASE_MANIFEST.provider.version,
          provider: "openai",
          promptDefinitionId: args.promptVersion.promptDefinitionId,
          promptVersionId: args.promptVersion.promptVersionId,
          promptVersionNumber: args.promptVersion.promptVersionNumber,
          model: generated.model,
          scoreSource: AI_SCORE_SOURCE,
          generationKey,
          generationKeyVersion: GENERATION_KEY_VERSION,
          generatedAt: new Date().toISOString(),
          usage: generated.usage,
          providerRequestId: generated.providerRequestId,
        },
      };
    });
  }

  async generatePaid(args: PaidGenerateArgs): Promise<PaidInterpretationOutput> {
    const ctx = buildFortuneAiContext(args.chart);
    const model = args.model ?? getAiModelPaid("openai");
    const systemPrompt = buildSystemPrompt({
      promptVersion: args.promptVersion,
      extraProductRules: args.promptVersion.productInstruction,
    });
    const userPrompt = buildPaidUserPrompt({
      fortuneContext: ctx,
      product: args.product,
      presentation: args.presentation,
      productInstruction: args.promptVersion.productInstruction,
    });

    return withValidationRetry(async () => {
      const generated = await generateStructuredResult({
        model,
        systemPrompt,
        userPrompt,
        schema: paidFortuneReportStrictSchema,
        schemaName: "paid_fortune_report",
      });

      let data = generated.data;
      try {
        data = paidFortuneReportStrictSchema.parse({
          ...data,
          disclaimer: data.disclaimer || USER_FACING_DISCLAIMER,
        });
      } catch (error) {
        throw new AiEngineError(
          "SCHEMA_VALIDATION_FAILED",
          "Paid result failed Zod validation",
          { retryable: true, cause: error, providerRequestId: generated.providerRequestId }
        );
      }

      validatePaidSemantics(data, ctx, { productSlug: args.product.slug });

      const generationKey = buildGenerationKey({
        calculationHash: args.chart.engine.calculationHash,
        promptVersionId: args.promptVersion.promptVersionId,
        provider: "openai",
        model: generated.model,
        resultType: "paid",
        productSlug: args.product.slug,
      });

      return {
        ...data,
        meta: {
          schemaVersion: AI_SCHEMA_VERSION,
          engineVersion: FORTUNE_RELEASE_MANIFEST.engineVersion,
          providerVersion: FORTUNE_RELEASE_MANIFEST.provider.version,
          provider: "openai",
          promptDefinitionId: args.promptVersion.promptDefinitionId,
          promptVersionId: args.promptVersion.promptVersionId,
          promptVersionNumber: args.promptVersion.promptVersionNumber,
          model: generated.model,
          scoreSource: AI_SCORE_SOURCE,
          generationKey,
          generationKeyVersion: GENERATION_KEY_VERSION,
          generatedAt: new Date().toISOString(),
          usage: generated.usage,
          providerRequestId: generated.providerRequestId,
        },
      };
    });
  }
}
