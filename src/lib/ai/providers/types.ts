import type { z } from "zod";
import type { AiProviderName } from "@/lib/ai/config";
import type { StructuredGenerationUsage } from "@/lib/ai/types";

export type AIProviderGenerateOptions<T extends z.ZodType> = {
  systemPrompt: string;
  userPrompt: string;
  schema: T;
  schemaName: string;
  model: string;
  /** Optional output token cap (paid reports). */
  maxOutputTokens?: number;
};

export type AIProviderResult<T> = {
  data: T;
  provider: AiProviderName;
  model: string;
  usage: StructuredGenerationUsage;
  providerRequestId?: string;
  latencyMs: number;
};

export interface AIProvider {
  readonly name: AiProviderName;
  generateStructured<T extends z.ZodType>(
    options: AIProviderGenerateOptions<T>
  ): Promise<AIProviderResult<z.infer<T>>>;
}
