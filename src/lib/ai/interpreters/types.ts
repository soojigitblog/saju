import type { FortuneChart } from "@/lib/fortune-engine/types";
import type {
  FreeInterpretationOutput,
  PaidInterpretationOutput,
  PresentationInput,
  ProductConfig,
  PromptVersionRef,
} from "@/lib/ai/types";

export type FreeGenerateArgs = {
  chart: FortuneChart;
  promptVersion: PromptVersionRef;
  product?: ProductConfig;
  presentation?: PresentationInput;
  model?: string;
};

export type PaidGenerateArgs = {
  chart: FortuneChart;
  promptVersion: PromptVersionRef;
  product: ProductConfig;
  presentation?: PresentationInput;
  model?: string;
};

export interface FortuneInterpreter {
  generateFree(args: FreeGenerateArgs): Promise<FreeInterpretationOutput>;
  generatePaid(args: PaidGenerateArgs): Promise<PaidInterpretationOutput>;
}
