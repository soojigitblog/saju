import type { z } from "zod";
import type {
  AIProvider,
  AIProviderGenerateOptions,
  AIProviderResult,
} from "@/lib/ai/providers/types";

/**
 * Contract-test / offline provider — returns a factory-supplied payload.
 * Not for production traffic.
 */
export class MockAIProvider implements AIProvider {
  readonly name = "mock" as const;

  constructor(
    private readonly factory: <T extends z.ZodType>(
      schema: T
    ) => z.infer<T>
  ) {}

  async generateStructured<T extends z.ZodType>(
    options: AIProviderGenerateOptions<T>
  ): Promise<AIProviderResult<z.infer<T>>> {
    const started = Date.now();
    const raw = this.factory(options.schema);
    const data = options.schema.parse(raw) as z.infer<T>;
    return {
      data,
      provider: "mock",
      model: options.model || "mock",
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      providerRequestId: `mock-provider-${Date.now()}`,
      latencyMs: Date.now() - started,
    };
  }
}
