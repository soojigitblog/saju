import { describe, expect, it } from "vitest";
import { AiEngineError } from "@/lib/ai/errors";
import {
  buildValidationRetryInstruction,
  withValidationRetry,
} from "@/lib/ai/interpreters/with-validation-retry";

describe("AI validation regeneration", () => {
  it("passes semantic feedback into the next generation attempt", async () => {
    let attempts = 0;
    let revision = "";

    const result = await withValidationRetry(
      async () => {
        attempts += 1;
        if (attempts === 1) {
          throw new AiEngineError(
            "SEMANTIC_VALIDATION_FAILED",
            "preview[money] length 38 out of range",
            { retryable: true }
          );
        }
        return "complete";
      },
      {
        maxRetries: 1,
        onRetry(error) {
          revision = buildValidationRetryInstruction(error);
        },
      }
    );

    expect(result).toBe("complete");
    expect(attempts).toBe(2);
    expect(revision).toContain("preview[money] length 38 out of range");
    expect(revision).toContain("complete fresh JSON object");
  });
});
