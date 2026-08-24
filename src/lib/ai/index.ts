export {
  AI_ENGINE_NAME,
  AI_SCHEMA_VERSION,
  AI_SCORE_SOURCE,
  GENERATION_KEY_VERSION,
  getAiModelFree,
  getAiModelPaid,
  getAiFallbackProvider,
  resolveAiProviderName,
  resolveAiProviderForFree,
  resolveAiProviderForPaid,
  assertPaidGeminiConfigured,
  estimateAiCostUsd,
  getPaidReportMaxOutputTokens,
  type AiBillingTier,
  resolveAiRuntimeMode,
  type AiProviderName,
} from "@/lib/ai/config";
export { USER_FACING_DISCLAIMER } from "@/lib/ai/disclaimer";
export { AiEngineError, isRetryableAiError } from "@/lib/ai/errors";
export { buildFortuneAiContext, buildEvidenceWhitelist } from "@/lib/ai/context";
export {
  buildInterpretationContextV2,
  getEngineCapabilityAudit,
} from "@/lib/ai/interpretation-context-v2";
export { buildGenerationKey } from "@/lib/ai/generation-key";
export {
  peekGenerationCache,
  putGenerationCache,
  hasGenerationKey,
} from "@/lib/ai/generation-cache";
export {
  freeFortuneResultSchema,
  freeFortuneResultStrictSchema,
  type FreeFortuneResult,
} from "@/lib/ai/schemas/free-result";
export {
  paidFortuneReportSchema,
  paidFortuneReportStrictSchema,
  type PaidFortuneReport,
} from "@/lib/ai/schemas/paid-report";
export {
  validateFreeSemantics,
  validatePaidSemantics,
  FORBIDDEN_PREDICTION_PATTERNS,
} from "@/lib/ai/validators/semantic-validator";
export {
  scorePaidReportQuality,
  assertPaidQualityGate,
} from "@/lib/ai/validators/paid-quality";
export {
  evaluatePaidQualityV2,
  comparePaidReportOverlap,
  compareFreeVsPaidNovelty,
} from "@/lib/ai/validators/paid-quality-v2";
export { MockFortuneInterpreter } from "@/lib/ai/interpreters/mock-interpreter";
export { OpenAIFortuneInterpreter } from "@/lib/ai/interpreters/openai-interpreter";
export { ProviderFortuneInterpreter } from "@/lib/ai/interpreters/provider-interpreter";
export type { FortuneInterpreter } from "@/lib/ai/interpreters/types";
export {
  createFortuneInterpreter,
  generateFreeInterpretation,
  generatePaidInterpretation,
} from "@/lib/ai/interpreters/free-interpreter";
export { getAIProvider, createMockAIProvider } from "@/lib/ai/providers";
export type { AIProvider, AIProviderResult } from "@/lib/ai/providers/types";
