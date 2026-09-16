import "server-only";

import {
  type AiProviderName,
  type AiBillingTier,
  getAiFallbackProvider,
  resolveAiProviderForFree,
  resolveAiProviderForPaid,
} from "@/lib/ai/config";
import { AiEngineError } from "@/lib/ai/errors";
import { GeminiProvider } from "@/lib/ai/providers/gemini";
import { OpenAIProvider } from "@/lib/ai/providers/openai";
import { MockAIProvider } from "@/lib/ai/providers/mock";
import type { AIProvider } from "@/lib/ai/providers/types";
import type { z } from "zod";

/**
 * Select AI provider. Automatic Gemini→OpenAI fallback is DISABLED.
 * AI_FALLBACK_PROVIDER must remain empty in normal operation.
 */
export function getAIProvider(
  name: AiProviderName | "auto" = "auto",
  tier: AiBillingTier = "free"
): AIProvider {
  const resolved =
    name === "auto"
      ? tier === "paid"
        ? resolveAiProviderForPaid()
        : resolveAiProviderForFree()
      : name;

  // Explicitly read fallback — must not be used for silent paid routing.
  if (getAiFallbackProvider()) {
    // Documented: callers must opt in; createFreeFortune never uses this.
  }

  switch (resolved) {
    case "gemini":
      return new GeminiProvider(tier);
    case "openai":
      return new OpenAIProvider(tier);
    case "mock":
      throw new AiEngineError(
        "CONFIGURATION_ERROR",
        "Use createMockAIProvider(factory) or MockFortuneInterpreter for mock mode.",
        { retryable: false }
      );
    default:
      throw new AiEngineError(
        "UNKNOWN",
        `CONFIGURATION_ERROR: unknown provider ${String(resolved)}`,
        { retryable: false }
      );
  }
}

/** Test helper with injectable mock factory. */
export function createMockAIProvider(
  factory: <T extends z.ZodType>(schema: T) => z.infer<T>
): AIProvider {
  return new MockAIProvider(factory);
}

export type { AIProvider, AIProviderResult } from "@/lib/ai/providers/types";
