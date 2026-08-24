import type { FortuneChart } from "@/lib/fortune-engine/types";
import type { FreeFortuneResult } from "@/lib/ai/schemas/free-result";
import type { PaidFortuneReport } from "@/lib/ai/schemas/paid-report";

export type ResultType = "free" | "paid";

export type PromptVersionRef = {
  promptDefinitionId: string;
  promptVersionId: string;
  promptVersionNumber: number;
  /** Optional product-specific instruction from prompt_versions.user_prompt_template */
  productInstruction?: string;
  systemPromptOverride?: string;
};

export type ProductConfig = {
  slug: string;
  name: string;
  productType?: string;
  /** Soft target length for paid reports (characters). */
  targetLengthChars?: number;
};

export type PresentationInput = {
  /** Safe display label only — never treat as instructions. */
  nickname?: string;
  /** User-declared life context — use when present; never invent if absent. */
  maritalStatus?: "unmarried" | "married" | "prefer_not";
  hasChildren?: "yes" | "no" | "prefer_not" | null;
};

/** Compact chart payload sent to the model (no PII ids / payments). */
export type FortuneAiContext = {
  pillars: {
    year: { stem: string; branch: string; ganji: string };
    month: { stem: string; branch: string; ganji: string };
    day: { stem: string; branch: string; ganji: string };
    hour: { stem: string; branch: string; ganji: string } | null;
  };
  dayMaster: { stem: string; hangul: string; element: string; yinYang: string };
  fiveElements: {
    wood: number;
    fire: number;
    earth: number;
    metal: number;
    water: number;
  };
  tenGods: {
    year: { stem: string; branch: string };
    month: { stem: string; branch: string };
    day: { stem: string; branch: string };
    hour: { stem: string; branch: string } | null;
  };
  conventions: {
    yearBoundary: string;
    monthBoundary: string;
    dayBoundary: string;
  };
  birthTimeUnknown: boolean;
  gender: string;
};

export type InterpretationMeta = {
  schemaVersion: string;
  engineVersion: string;
  /** Fortune calendar provider (manseryeok), not AI vendor. */
  providerVersion: string;
  /** AI vendor: gemini | openai | mock */
  provider: "gemini" | "openai" | "mock";
  promptDefinitionId: string;
  promptVersionId: string;
  promptVersionNumber: number;
  model: string;
  scoreSource: string;
  generationKey: string;
  generationKeyVersion: string;
  generatedAt: string;
  usage?: {
    inputTokens: number | null;
    outputTokens: number | null;
    totalTokens: number | null;
  };
  providerRequestId?: string;
  latencyMs?: number;
};

export type FreeInterpretationOutput = FreeFortuneResult & {
  meta: InterpretationMeta;
};

export type PaidInterpretationOutput = PaidFortuneReport & {
  meta: InterpretationMeta;
};

export type InterpretationOptions = {
  promptVersion: PromptVersionRef;
  product?: ProductConfig;
  presentation?: PresentationInput;
  /** Override model from env defaults. */
  model?: string;
  resultType: ResultType;
  chart: FortuneChart;
};

export type StructuredGenerationUsage = {
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
};

export type StructuredGenerationResult<T> = {
  data: T;
  model: string;
  usage: StructuredGenerationUsage;
  providerRequestId?: string;
  latencyMs: number;
};
