import "server-only";

import type { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { getOpenAIClient } from "@/lib/ai/client";
import { getAiMaxRetries } from "@/lib/ai/config";
import { AiEngineError } from "@/lib/ai/errors";
import type { StructuredGenerationResult } from "@/lib/ai/types";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mapOpenAiError(error: unknown): AiEngineError {
  if (error instanceof AiEngineError) return error;

  const anyErr = error as {
    status?: number;
    code?: string;
    message?: string;
    request_id?: string;
    error?: { message?: string; code?: string; type?: string };
  };

  const status = anyErr.status;
  const message =
    anyErr.error?.message || anyErr.message || "OpenAI request failed";
  const requestId = anyErr.request_id;

  if (status === 429) {
    return new AiEngineError("OPENAI_RATE_LIMIT", message, {
      retryable: true,
      providerRequestId: requestId,
      cause: error,
    });
  }
  if (status && status >= 500) {
    return new AiEngineError("OPENAI_SERVER_ERROR", message, {
      retryable: true,
      providerRequestId: requestId,
      cause: error,
    });
  }
  if (status === 400 || status === 404) {
    const code =
      /model/i.test(message) ? "OPENAI_INVALID_MODEL" : "OPENAI_BAD_REQUEST";
    return new AiEngineError(code, message, {
      retryable: false,
      providerRequestId: requestId,
      cause: error,
    });
  }
  if (/timeout|ETIMEDOUT|AbortError/i.test(message)) {
    return new AiEngineError("OPENAI_TIMEOUT", message, {
      retryable: true,
      providerRequestId: requestId,
      cause: error,
    });
  }

  return new AiEngineError("UNKNOWN", message, {
    retryable: false,
    providerRequestId: requestId,
    cause: error,
  });
}

export async function generateStructuredResult<T extends z.ZodType>(input: {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  schema: T;
  schemaName: string;
}): Promise<StructuredGenerationResult<z.infer<T>>> {
  const client = getOpenAIClient();
  const maxRetries = getAiMaxRetries();
  let attempt = 0;
  let lastError: AiEngineError | null = null;

  while (attempt <= maxRetries) {
    const started = Date.now();
    try {
      const response = await client.responses.parse({
        model: input.model,
        input: [
          { role: "system", content: input.systemPrompt },
          { role: "user", content: input.userPrompt },
        ],
        text: {
          format: zodTextFormat(input.schema, input.schemaName),
        },
      });

      const parsed = response.output_parsed;
      if (parsed == null) {
        throw new AiEngineError(
          "STRUCTURED_PARSE_FAILED",
          "Structured output missing output_parsed",
          {
            retryable: false,
            providerRequestId: response.id,
          }
        );
      }

      const usage = response.usage;
      return {
        data: parsed as z.infer<T>,
        model: response.model ?? input.model,
        usage: {
          inputTokens: usage?.input_tokens ?? null,
          outputTokens: usage?.output_tokens ?? null,
          totalTokens: usage?.total_tokens ?? null,
        },
        providerRequestId: response.id,
        latencyMs: Date.now() - started,
      };
    } catch (error) {
      const mapped = mapOpenAiError(error);
      lastError = mapped;
      if (!mapped.retryable || attempt >= maxRetries) {
        if (mapped.retryable && attempt >= maxRetries) {
          throw new AiEngineError(
            "RETRY_EXHAUSTED",
            `Retries exhausted: ${mapped.message}`,
            {
              retryable: false,
              providerRequestId: mapped.providerRequestId,
              cause: mapped,
            }
          );
        }
        throw mapped;
      }
      const backoff = Math.min(1000 * 2 ** attempt, 8000);
      await sleep(backoff);
      attempt += 1;
    }
  }

  throw (
    lastError ??
    new AiEngineError("UNKNOWN", "generateStructuredResult failed", {
      retryable: false,
    })
  );
}
