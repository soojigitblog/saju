import { createHash } from "node:crypto";
import {
  GENERATION_KEY_VERSION,
  type AiProviderName,
} from "@/lib/ai/config";
import type { ResultType } from "@/lib/ai/types";

/**
 * Stable key to prevent double billing / duplicate generation.
 * v2 includes provider so Gemini vs OpenAI are distinct generations.
 * Does not include nickname or PII.
 */
export function buildGenerationKey(input: {
  calculationHash: string;
  promptVersionId: string;
  provider: AiProviderName;
  model: string;
  resultType: ResultType;
  productSlug?: string;
  version?: string;
}): string {
  const version = input.version ?? GENERATION_KEY_VERSION;
  const payload = [
    version,
    input.calculationHash,
    input.promptVersionId,
    input.provider,
    input.model,
    input.resultType,
    input.productSlug ?? "",
  ].join("|");

  return createHash("sha256").update(payload, "utf8").digest("hex");
}
