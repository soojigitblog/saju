import { BASE_SYSTEM_PROMPT, SAFETY_RULES } from "@/lib/ai/prompts/base-system";
import type { PromptVersionRef } from "@/lib/ai/types";

export function buildSystemPrompt(options?: {
  promptVersion?: PromptVersionRef;
  extraProductRules?: string;
}): string {
  const parts = [BASE_SYSTEM_PROMPT, SAFETY_RULES];

  if (options?.promptVersion?.systemPromptOverride?.trim()) {
    parts.push("PRODUCT SYSTEM NOTES:\n" + options.promptVersion.systemPromptOverride.trim());
  }

  if (options?.extraProductRules?.trim()) {
    parts.push("PRODUCT INSTRUCTION:\n" + options.extraProductRules.trim());
  }

  parts.push("OUTPUT CONTRACT:\n반드시 Structured Output Schema만 따르고, 추가 필드를 만들지 마십시오.");

  return parts.join("\n\n");
}
