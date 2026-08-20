import "server-only";

import OpenAI from "openai";
import { getAiTimeoutMs, getOpenAiApiKey } from "@/lib/ai/config";
import { AiEngineError } from "@/lib/ai/errors";

let cached: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    throw new AiEngineError(
      "OPENAI_API_KEY_MISSING",
      "OPENAI_API_KEY is not configured.",
      { retryable: false }
    );
  }

  if (!cached) {
    cached = new OpenAI({
      apiKey,
      timeout: getAiTimeoutMs(),
      maxRetries: 0, // we handle retries ourselves
    });
  }

  return cached;
}

/** Test helper — reset singleton. */
export function resetOpenAIClientForTests(): void {
  cached = null;
}
