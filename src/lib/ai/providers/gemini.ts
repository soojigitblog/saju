import "server-only";

import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { getAiMaxRetries, getAiTimeoutMs, getGeminiApiKey } from "@/lib/ai/config";
import { AiEngineError } from "@/lib/ai/errors";
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
  const json = z.toJSONSchema(schema) as Record<string, unknown>;
  // Gemini rejects some JSON Schema meta keys
  const { $schema, $id, ...rest } = json;
  void $schema;
  void $id;
  return rest;
}

let cached: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new AiEngineError(
      "OPENAI_API_KEY_MISSING",
      "GEMINI_API_KEY is not configured.",
      { retryable: false }
    );
  }
  if (!cached) {
    cached = new GoogleGenAI({ apiKey });
  }
  return cached;
}

export function resetGeminiClientForTests(): void {
  cached = null;
}

/**
 * Gemini generateContent + responseJsonSchema structured output.
 * Result is re-validated with the shared Zod schema by the caller.
 */
export class GeminiProvider implements AIProvider {
  readonly name = "gemini" as const;

  async generateStructured<T extends z.ZodType>(
    options: AIProviderGenerateOptions<T>
  ): Promise<AIProviderResult<z.infer<T>>> {
    const client = getGeminiClient();
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

        const data = options.schema.parse(json) as z.infer<T>;
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
