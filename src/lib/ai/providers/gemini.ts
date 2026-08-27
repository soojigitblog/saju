import "server-only";

import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { getAiMaxRetries, getAiTimeoutMs, getGeminiApiKeyForTier, type AiBillingTier } from "@/lib/ai/config";
import { AiEngineError } from "@/lib/ai/errors";
import { zodToGeminiJsonSchema } from "@/lib/ai/schemas/gemini-schema-adapter";
import { coercePaidReportRaw } from "@/lib/ai/interpreters/coerce-paid-report";
import type {
  AIProvider,
  AIProviderGenerateOptions,
  AIProviderResult,
} from "@/lib/ai/providers/types";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mapGeminiError(error: unknown): AiEngineError {
  if (error instanceof AiEngineError) return error;

  const anyErr = error as {
    status?: number;
    code?: number | string;
    message?: string;
    error?: { code?: number; message?: string; status?: string };
  };

  const status = anyErr.status ?? anyErr.error?.code;
  const message =
    anyErr.error?.message || anyErr.message || "Gemini request failed";

  if (status === 429 || /RESOURCE_EXHAUSTED|rate.?limit/i.test(message)) {
    return new AiEngineError("OPENAI_RATE_LIMIT", message, {
      retryable: true,
      cause: error,
    });
  }
  if (typeof status === "number" && status >= 500) {
    return new AiEngineError("OPENAI_SERVER_ERROR", message, {
      retryable: true,
      cause: error,
    });
  }
  if (
    status === 400 ||
    status === 403 ||
    status === 404 ||
    /INVALID_ARGUMENT|PERMISSION_DENIED|NOT_FOUND|API[_ ]?KEY/i.test(message)
  ) {
    const code = /model/i.test(message)
      ? "OPENAI_INVALID_MODEL"
      : /API[_ ]?KEY|PERMISSION/i.test(message)
        ? "OPENAI_API_KEY_MISSING"
        : "OPENAI_BAD_REQUEST";
    return new AiEngineError(code, message, {
      retryable: false,
      cause: error,
    });
  }
  if (/timeout|ETIMEDOUT|AbortError|DEADLINE/i.test(message)) {
    return new AiEngineError("OPENAI_TIMEOUT", message, {
      retryable: true,
      cause: error,
    });
  }

  return new AiEngineError("UNKNOWN", message, {
    retryable: false,
    cause: error,
  });
}

function toGeminiJsonSchema(schema: z.ZodType): Record<string, unknown> {
  return zodToGeminiJsonSchema(schema);
}

let cached = new Map<AiBillingTier, GoogleGenAI>();

function getGeminiClient(tier: AiBillingTier): GoogleGenAI {
  const apiKey = getGeminiApiKeyForTier(tier);
  if (!apiKey) {
    if (tier === "paid") {
      throw new AiEngineError(
        "PAID_AI_NOT_CONFIGURED",
        "GEMINI_API_KEY_PAID is required for paid reports. Free/legacy keys are not used.",
        { retryable: false }
      );
    }
    throw new AiEngineError(
      "OPENAI_API_KEY_MISSING",
      "GEMINI_API_KEY_FREE (or GEMINI_API_KEY) is not configured.",
      { retryable: false }
    );
  }
  const existing = cached.get(tier);
  if (existing) return existing;
  const client = new GoogleGenAI({ apiKey });
  cached.set(tier, client);
  return client;
}

export function resetGeminiClientForTests(): void {
  cached = new Map();
}

/**
 * Gemini generateContent + responseJsonSchema structured output.
 * Result is re-validated with the shared Zod schema by the caller.
 */
export class GeminiProvider implements AIProvider {
  readonly name = "gemini" as const;

  constructor(private readonly tier: AiBillingTier = "free") {}

  async generateStructured<T extends z.ZodType>(
    options: AIProviderGenerateOptions<T>
  ): Promise<AIProviderResult<z.infer<T>>> {
    const client = getGeminiClient(this.tier);
    const maxRetries = getAiMaxRetries();
    const timeoutMs = getAiTimeoutMs();
    let attempt = 0;
    let lastError: AiEngineError | null = null;

    while (attempt <= maxRetries) {
      const started = Date.now();
      try {
        const response = await Promise.race([
          client.models.generateContent({
            model: options.model,
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: `${options.systemPrompt}\n\n---\n\n${options.userPrompt}`,
                  },
                ],
              },
            ],
            config: {
              responseMimeType: "application/json",
              responseJsonSchema: toGeminiJsonSchema(options.schema),
              ...(options.maxOutputTokens
                ? { maxOutputTokens: options.maxOutputTokens }
                : {}),
            },
          }),
          new Promise<never>((_, reject) => {
            setTimeout(
              () => reject(new AiEngineError("OPENAI_TIMEOUT", "Gemini request timed out", { retryable: true })),
              timeoutMs
            );
          }),
        ]);

        const text = response.text;
        if (!text) {
          throw new AiEngineError(
            "STRUCTURED_PARSE_FAILED",
            "Gemini returned empty structured text",
            { retryable: false }
          );
        }

        let json: unknown;
        try {
          json = JSON.parse(text);
        } catch (error) {
          throw new AiEngineError(
            "STRUCTURED_PARSE_FAILED",
            "Gemini returned non-JSON structured output",
            { retryable: false, cause: error }
          );
        }

        // Live Gemini often drifts on label length / discoveryLevel types.
        const coerced = coercePaidReportRaw(json);
        let data: z.infer<T>;
        try {
          data = options.schema.parse(coerced) as z.infer<T>;
        } catch (error) {
          throw new AiEngineError(
            "SCHEMA_VALIDATION_FAILED",
            "Gemini structured output failed Zod validation",
            { retryable: true, cause: error }
          );
        }
        const usageMeta = response.usageMetadata;

        return {
          data,
          provider: "gemini",
          model: options.model,
          usage: {
            inputTokens: usageMeta?.promptTokenCount ?? null,
            outputTokens: usageMeta?.candidatesTokenCount ?? null,
            totalTokens: usageMeta?.totalTokenCount ?? null,
          },
          providerRequestId: response.responseId ?? undefined,
          latencyMs: Date.now() - started,
        };
      } catch (error) {
        const mapped = mapGeminiError(error);
        lastError = mapped;
        if (!mapped.retryable || attempt >= maxRetries) {
          if (mapped.retryable && attempt >= maxRetries) {
            throw new AiEngineError(
              "RETRY_EXHAUSTED",
              `Retries exhausted: ${mapped.message}`,
              { retryable: false, cause: mapped }
            );
          }
          throw mapped;
        }
        await sleep(Math.min(1000 * 2 ** attempt, 8000));
        attempt += 1;
      }
    }

    throw (
      lastError ??
      new AiEngineError("UNKNOWN", "Gemini generateStructured failed", {
        retryable: false,
      })
    );
  }
}
