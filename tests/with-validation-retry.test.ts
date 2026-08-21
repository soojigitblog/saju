import { describe, expect, it, vi } from "vitest";
import { AiEngineError } from "@/lib/ai/errors";
import { withValidationRetry } from "@/lib/ai/interpreters/with-validation-retry";

describe("withValidationRetry", () => {
  it("returns on first success", async () => {
    const run = vi.fn().mockResolvedValue("ok");
    await expect(withValidationRetry(run, { maxRetries: 2 })).resolves.toBe("ok");
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("regenerates on SEMANTIC_VALIDATION_FAILED then succeeds", async () => {
    const run = vi
      .fn()
      .mockRejectedValueOnce(
        new AiEngineError("SEMANTIC_VALIDATION_FAILED", "hookLine too short", {
          retryable: true,
        })
      )
      .mockResolvedValueOnce("ok");

    await expect(withValidationRetry(run, { maxRetries: 1 })).resolves.toBe("ok");
    expect(run).toHaveBeenCalledTimes(2);
  });

  it("does not regenerate non-content errors", async () => {
    const err = new AiEngineError("OPENAI_BAD_REQUEST", "bad", { retryable: false });
    const run = vi.fn().mockRejectedValue(err);
    await expect(withValidationRetry(run, { maxRetries: 2 })).rejects.toBe(err);
    expect(run).toHaveBeenCalledTimes(1);
  });
});
