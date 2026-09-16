import "server-only";

import OpenAI from "openai";
import {
  getAiTimeoutMs,
  getOpenAiApiKeyForTier,
  type AiBillingTier,
} from "@/lib/ai/config";
import { AiEngineError } from "@/lib/ai/errors";

const cached = new Map<AiBillingTier, OpenAI>();

export function getOpenAIClient(tier: AiBillingTier = "free"): OpenAI {
  const apiKey = getOpenAiApiKeyForTier(tier);
  if (!apiKey) {
    throw new AiEngineError(
      "OPENAI_API_KEY_MISSING",
      `OpenAI ${tier} API key is not configured.`,
      { retryable: false }
    );
  }

  const existing = cached.get(tier);
  if (existing) return existing;

  const client = new OpenAI({
      apiKey,
      // Paid reports are generated asynchronously and contain a much larger
      // structured payload than free previews. Keep the customer job from
      // being discarded at the general 60-second preview timeout.
      timeout: tier === "paid" ? Math.max(getAiTimeoutMs(), 120_000) : getAiTimeoutMs(),
      maxRetries: 0, // we handle retries ourselves
  });
  cached.set(tier, client);
  return client;
}

/** Test helper — reset singleton. */
export function resetOpenAIClientForTests(): void {
  cached.clear();
}
