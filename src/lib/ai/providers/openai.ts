import "server-only";

import type { z } from "zod";
import { generateStructuredResult } from "@/lib/ai/wrapper/generate-structured";
import type {
  AIProvider,
  AIProviderGenerateOptions,
  AIProviderResult,
} from "@/lib/ai/providers/types";

/**
 * OpenAI Responses API provider — preserved PHASE 4 path.
 */
export class OpenAIProvider implements AIProvider {
  readonly name = "openai" as const;

  async generateStructured<T extends z.ZodType>(
    options: AIProviderGenerateOptions<T>
  ): Promise<AIProviderResult<z.infer<T>>> {
    const generated = await generateStructuredResult({
      model: options.model,
      systemPrompt: options.systemPrompt,
      userPrompt: options.userPrompt,
      schema: options.schema,
      schemaName: options.schemaName,
    });

    return {
      data: generated.data,
      provider: "openai",
      model: generated.model,
      usage: generated.usage,
      providerRequestId: generated.providerRequestId,
      latencyMs: generated.latencyMs,
    };
  }
}
