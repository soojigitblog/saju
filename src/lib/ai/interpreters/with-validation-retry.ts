import "server-only";

import { getAiMaxRetries } from "@/lib/ai/config";
import { AiEngineError } from "@/lib/ai/errors";

const REGENERABLE_CODES = new Set([
  "SEMANTIC_VALIDATION_FAILED",
  "SCHEMA_VALIDATION_FAILED",
  "STRUCTURED_PARSE_FAILED",
]);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Re-run LLM generation when output fails post-parse semantic/schema checks.
 * Provider-level retries already cover transport errors; this covers flaky content.
 * Default: one regeneration (2 draws total) so friend-test latency stays bounded.
 */
export async function withValidationRetry<T>(
  run: () => Promise<T>,
  options?: { maxRetries?: number }
): Promise<T> {
  const maxRetries = options?.maxRetries ?? Math.min(1, getAiMaxRetries());
  let attempt = 0;
  let lastError: unknown;

  while (attempt <= maxRetries) {
    try {
      return await run();
    } catch (error) {
      lastError = error;
      const regenerable =
        error instanceof AiEngineError && REGENERABLE_CODES.has(error.code);
      if (!regenerable || attempt >= maxRetries) {
        throw error;
      }
      await sleep(Math.min(400 * 2 ** attempt, 2000));
      attempt += 1;
    }
  }

  throw lastError;
}
