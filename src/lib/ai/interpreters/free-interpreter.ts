import "server-only";

import {
  type AiProviderName,
  type AiBillingTier,
  resolveAiProviderForFree,
  resolveAiProviderForPaid,
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

function createFortuneInterpreterForProvider(
  provider: AiProviderName,
  tier: AiBillingTier
): FortuneInterpreter {
  if (provider === "mock") return new MockFortuneInterpreter();
  if (provider === "openai") return new OpenAIFortuneInterpreter();
  if (provider === "gemini") {
    return new ProviderFortuneInterpreter("gemini", undefined, tier);
  }
  throw new Error(`CONFIGURATION_ERROR: unknown interpreter provider ${String(provider)}`);
}

export function createFortuneInterpreterForTier(
  tier: AiBillingTier
): FortuneInterpreter {
  const provider =
    tier === "paid" ? resolveAiProviderForPaid() : resolveAiProviderForFree();
  return createFortuneInterpreterForProvider(provider, tier);
}

export function createFortuneInterpreter(
  mode: AiProviderName | "auto" = "auto",
  tier: AiBillingTier = "free"
): FortuneInterpreter {
  if (mode !== "auto") {
    return createFortuneInterpreterForProvider(mode, tier);
  }
  return createFortuneInterpreterForTier(tier);
}

export async function generateFreeInterpretation(
  chart: FreeGenerateArgs["chart"],
  promptVersion: FreeGenerateArgs["promptVersion"],
  options?: Omit<FreeGenerateArgs, "chart" | "promptVersion"> & {
    interpreter?: FortuneInterpreter;
  }
): Promise<FreeInterpretationOutput> {
  const interpreter =
    options?.interpreter ?? createFortuneInterpreterForTier("free");
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
  const interpreter =
    options?.interpreter ?? createFortuneInterpreterForTier("paid");
  return interpreter.generatePaid({
    chart,
    product,
    promptVersion,
    presentation: options?.presentation,
    model: options?.model,
  });
}
