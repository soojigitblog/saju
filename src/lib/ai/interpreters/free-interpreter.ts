import "server-only";

import {
  type AiProviderName,
  resolveAiProviderName,
} from "@/lib/ai/config";
import { MockFortuneInterpreter } from "@/lib/ai/interpreters/mock-interpreter";
import { OpenAIFortuneInterpreter } from "@/lib/ai/interpreters/openai-interpreter";
import { ProviderFortuneInterpreter } from "@/lib/ai/interpreters/provider-interpreter";
import type { FortuneInterpreter } from "@/lib/ai/interpreters/types";
import type {
  FreeGenerateArgs,
  PaidGenerateArgs,
} from "@/lib/ai/interpreters/types";
import type {
  FreeInterpretationOutput,
  PaidInterpretationOutput,
} from "@/lib/ai/types";

export function createFortuneInterpreter(
  mode: AiProviderName | "auto" = "auto"
): FortuneInterpreter {
  const resolved = mode === "auto" ? resolveAiProviderName() : mode;
  if (resolved === "mock") return new MockFortuneInterpreter();
  if (resolved === "openai") return new OpenAIFortuneInterpreter();
  if (resolved === "gemini") return new ProviderFortuneInterpreter("gemini");
  throw new Error(`CONFIGURATION_ERROR: unknown interpreter mode ${String(resolved)}`);
}

export async function generateFreeInterpretation(
  chart: FreeGenerateArgs["chart"],
  promptVersion: FreeGenerateArgs["promptVersion"],
  options?: Omit<FreeGenerateArgs, "chart" | "promptVersion"> & {
    interpreter?: FortuneInterpreter;
  }
): Promise<FreeInterpretationOutput> {
  const interpreter = options?.interpreter ?? createFortuneInterpreter();
  return interpreter.generateFree({
    chart,
    promptVersion,
    product: options?.product,
    presentation: options?.presentation,
    model: options?.model,
  });
}

export async function generatePaidInterpretation(
  chart: PaidGenerateArgs["chart"],
  product: PaidGenerateArgs["product"],
  promptVersion: PaidGenerateArgs["promptVersion"],
  options?: Omit<PaidGenerateArgs, "chart" | "product" | "promptVersion"> & {
    interpreter?: FortuneInterpreter;
  }
): Promise<PaidInterpretationOutput> {
  const interpreter = options?.interpreter ?? createFortuneInterpreter();
  return interpreter.generatePaid({
    chart,
    product,
    promptVersion,
    presentation: options?.presentation,
    model: options?.model,
  });
}
