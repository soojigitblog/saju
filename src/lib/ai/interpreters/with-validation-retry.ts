import "server-only";

import { getAiMaxRetries } from "@/lib/ai/config";
import { AiEngineError } from "@/lib/ai/errors";

const REGENERABLE_CODES = new Set([
  "SEMANTIC_VALIDATION_FAILED",
  "SCHEMA_VALIDATION_FAILED",
  "STRUCTURED_PARSE_FAILED",
]);

/**
 * Adds validator feedback to the next model draw without exposing it to the
 * customer. Repeating the exact same prompt after a semantic rejection tends
 * to reproduce the same too-short fields.
 */
export function buildValidationRetryInstruction(error: unknown): string {
  const diagnostic =
    error instanceof AiEngineError
      ? error.message.replace(/\s+/g, " ").slice(0, 1_200)
      : "The previous structured response did not satisfy the required output format.";

  return [
    "",
    "=== 재생성 필수 ===",
    "직전 JSON은 내부 품질 검증에 실패했습니다.",
    `검증 피드백: ${diagnostic}`,
    "전체 JSON을 처음부터 다시 작성하세요. 스키마의 모든 필수 필드와 위 길이 조건을 충족하고, 이 재생성 지시나 검증 피드백은 결과에 언급하지 마세요.",
  ].join("\n");
}

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
  options?: { maxRetries?: number; onRetry?: (error: unknown) => void }
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
      options?.onRetry?.(error);
      await sleep(Math.min(400 * 2 ** attempt, 2000));
      attempt += 1;
    }
  }

  throw lastError;
}
