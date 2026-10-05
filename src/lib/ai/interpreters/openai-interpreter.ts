import "server-only";

import { FORTUNE_RELEASE_MANIFEST } from "@/lib/fortune-engine/release-manifest";
import {
  AI_SCHEMA_VERSION,
  AI_SCORE_SOURCE,
  GENERATION_KEY_VERSION,
  getAiModelFree,
  getAiModelPaid,
  getPaidReportMaxOutputTokens,
  type AiBillingTier,
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
  paidFortuneReportLiveAiSchemaForProduct,
  resolvePaidProductKind,
} from "@/lib/ai/schemas/paid-report";
import {
  validateFreeSemantics,
  validatePaidSemantics,
} from "@/lib/ai/validators/semantic-validator";
import { generateStructuredResult } from "@/lib/ai/wrapper/generate-structured";
import {
  buildValidationRetryInstruction,
  withValidationRetry,
} from "@/lib/ai/interpreters/with-validation-retry";
import type {
  FreeInterpretationOutput,
  PaidInterpretationOutput,
} from "@/lib/ai/types";
import { USER_FACING_DISCLAIMER } from "@/lib/ai/disclaimer";

/** Replace only deterministic/generic imperatives after generation. */
function polishPaidEditorialLanguage(value: unknown): unknown {
  if (typeof value === "string") {
    return value
      .replace(/\bpillars\.year(?!\.)/g, "pillars.year.ganji")
      .replace(/\bpillars\.month(?!\.)/g, "pillars.month.ganji")
      .replace(/\bpillars\.day(?!\.)/g, "pillars.day.ganji")
      .replace(/\bpillars\.hour(?!\.)/g, "pillars.hour.ganji")
      .replace(/\btenGods\.month(?!\.)/g, "tenGods.month.stem")
      .replace(/\btenGods\.year(?!\.)/g, "tenGods.year.stem")
      .replace(/\btenGods\.day(?!\.)/g, "tenGods.day.stem")
      .replace(/\btenGods(?!\.)/g, "tenGods.month.stem")
      .replaceAll("절약하세요", "고정지출과 변동지출을 나누어 기록해 보세요")
      .replaceAll("계획하세요", "결정 전에 기준을 한 줄로 적어보세요")
      .replaceAll("긍정적으로", "감정을 정리한 뒤")
      .replaceAll("무조건", "한 가지 답으로 고정하지 말고")
      .replaceAll("반드시", "가능하면")
      .replaceAll("항상", "반복해서");
  }
  if (Array.isArray(value)) return value.map(polishPaidEditorialLanguage);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, polishPaidEditorialLanguage(item)])
    );
  }
  return value;
}

function distinguishEvidenceExplanations(value: unknown): unknown {
  if (!value || typeof value !== "object" || !Array.isArray((value as { sections?: unknown }).sections)) {
    return value;
  }
  return {
    ...(value as Record<string, unknown>),
    sections: (value as { sections: Array<Record<string, unknown>> }).sections.map((section) => {
      const title = typeof section.title === "string" ? section.title : "이 장";
      const explanations = Array.isArray(section.evidenceExplanation)
        ? section.evidenceExplanation.filter((item): item is string => typeof item === "string")
        : [];
      return explanations.length === 0
        ? section
        : {
            ...section,
            evidenceExplanation: explanations.map((line, index) =>
              index === 0 ? `${title}에서 보는 근거: ${line}`.slice(0, 280) : line
            ),
          };
    }),
  };
}

function ensureTotalEvidenceCoverage(value: unknown): unknown {
  if (!value || typeof value !== "object" || !Array.isArray((value as { sections?: unknown }).sections)) {
    return value;
  }
  const anchors = [
    { evidence: "dayMaster", axis: "dayMaster", copy: "일간의 성질" },
    { evidence: "pillars.month.ganji", axis: "pillars.month", copy: "월주의 계절적 배치" },
    { evidence: "fiveElements", axis: "fiveElements", copy: "오행의 분포" },
    { evidence: "tenGods.month.stem", axis: "tenGods.month", copy: "월간 십성의 역할" },
  ];
  return {
    ...(value as Record<string, unknown>),
    sections: (value as { sections: Array<Record<string, unknown>> }).sections.map((section, index) => {
      const anchor = anchors[index];
      if (!anchor) return section;
      const evidence = Array.isArray(section.evidence)
        ? section.evidence.filter((item): item is string => typeof item === "string")
        : [];
      const axes = Array.isArray(section.evidenceAxisIds)
        ? section.evidenceAxisIds.filter((item): item is string => typeof item === "string")
        : [];
      const explanations = Array.isArray(section.evidenceExplanation)
        ? section.evidenceExplanation.filter((item): item is string => typeof item === "string")
        : [];
      return {
        ...section,
        evidence: evidence.includes(anchor.evidence) ? evidence : [...evidence, anchor.evidence].slice(0, 5),
        evidenceAxisIds: axes.includes(anchor.axis) ? axes : [...axes, anchor.axis].slice(0, 4),
        evidenceExplanation: explanations.some((line) => line.includes(anchor.copy))
          ? explanations
          : [...explanations, `${anchor.copy}을 함께 참고해 이 장면을 해석합니다.`].slice(0, 2),
      };
    }),
  };
}

function ensureTotalDomainAnchors(value: unknown): unknown {
  if (!value || typeof value !== "object" || !Array.isArray((value as { sections?: unknown }).sections)) {
    return value;
  }
  const anchors: Record<string, { test: RegExp; sentence: string }> = {
    total_v4_money_link: { test: /돈|통제|연결/, sentence: " 이 장면은 돈의 선택이 통제감과 연결되는 방식에서 더 선명해집니다." },
    total_v4_paradox: { test: /모순|겉|속/, sentence: " 이 장면은 겉과 속이 다르게 움직이는 모순에서 더 선명해집니다." },
    total_v4_shadow: { test: /강점|과해|균형/, sentence: " 이 장면은 강점이 과해질 때 필요한 균형을 함께 봐야 합니다." },
    total_v4_playbook: { test: /플레이북|대응|습관|일|관계|자기/, sentence: " 이를 일상에서 쓰는 대응 습관으로 바꾸는 것이 이 플레이북의 목적입니다." },
  };
  return {
    ...(value as Record<string, unknown>),
    sections: (value as { sections: Array<Record<string, unknown>> }).sections.map((section) => {
      const anchor = anchors[String(section.key)];
      const coreInsight = typeof section.coreInsight === "string" ? section.coreInsight : "";
      return anchor && !anchor.test.test(coreInsight)
        ? { ...section, coreInsight: `${coreInsight}${anchor.sentence}`.slice(0, 220) }
        : section;
    }),
  };
}

export class OpenAIFortuneInterpreter implements FortuneInterpreter {
  constructor(private readonly tier: AiBillingTier = "free") {}

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

    let retryInstruction = "";
    return withValidationRetry(async () => {
      const generated = await generateStructuredResult({
        model,
        systemPrompt,
        userPrompt: userPrompt + retryInstruction,
        schema: freeFortuneResultStrictSchema,
        schemaName: "free_fortune_result",
        tier: "free",
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
    }, {
      onRetry(error) {
        retryInstruction = buildValidationRetryInstruction(error);
      },
    });
  }

  async generatePaid(args: PaidGenerateArgs): Promise<PaidInterpretationOutput> {
    const ctx = buildFortuneAiContext(args.chart);
    const model = args.model ?? getAiModelPaid("openai");
    const systemPrompt = buildSystemPrompt({
      promptVersion: args.promptVersion,
      extraProductRules: args.promptVersion.productInstruction,
    });
    const baseUserPrompt = buildPaidUserPrompt({
      fortuneContext: ctx,
      product: args.product,
      presentation: args.presentation,
      productInstruction: args.promptVersion.productInstruction,
    });

    let correctiveFeedback = "";
    const liveSchema = paidFortuneReportLiveAiSchemaForProduct(
      resolvePaidProductKind(args.product.slug)
    );
    return withValidationRetry(async () => {
      const generated = await generateStructuredResult({
        model,
        systemPrompt,
        userPrompt: baseUserPrompt + correctiveFeedback,
        schema: liveSchema,
        schemaName: "paid_fortune_report",
        tier: this.tier,
        maxOutputTokens: getPaidReportMaxOutputTokens(),
      });

      let data = generated.data;
      try {
        data = liveSchema.parse(ensureTotalEvidenceCoverage(distinguishEvidenceExplanations(ensureTotalDomainAnchors(polishPaidEditorialLanguage({
          ...data,
          disclaimer: data.disclaimer || USER_FACING_DISCLAIMER,
        })))));
      } catch (error) {
        throw new AiEngineError(
          "SCHEMA_VALIDATION_FAILED",
          "Paid result failed Zod validation",
          { retryable: true, cause: error, providerRequestId: generated.providerRequestId }
        );
      }

      validatePaidSemantics(data, ctx, {
        productSlug: args.product.slug,
        requireConsultingDepth: true,
      });

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
    }, {
      onRetry: (error) => {
        const reason = error instanceof AiEngineError ? error.message : "quality validation failed";
        correctiveFeedback = `\n\nREGENERATION REQUIRED: Your previous draft was rejected. Fix every issue below; do not merely rephrase it. Ensure the first coreInsight explicitly includes the requested chart identity anchors, and populate every required consulting-quality field with distinct, concrete content.\nREJECTION REASONS: ${reason.slice(0, 1800)}`;
      },
    });
  }
}
