import { beforeEach, describe, expect, it } from "vitest";
import { getOpenAIClient, resetOpenAIClientForTests } from "@/lib/ai/client";

describe("OpenAI tier routing", () => {
  beforeEach(() => {
    resetOpenAIClientForTests();
    process.env.OPENAI_API_KEY = "free-key";
    process.env.OPENAI_API_KEY_PAID = "paid-key";
  });

  it("uses separate cached clients for free and paid keys", () => {
    const free = getOpenAIClient("free");
    const paid = getOpenAIClient("paid");

    expect(free).not.toBe(paid);
    expect(getOpenAIClient("free")).toBe(free);
    expect(getOpenAIClient("paid")).toBe(paid);
  });

  it("fails closed when the paid-only key is absent", () => {
    delete process.env.OPENAI_API_KEY_PAID;
    expect(() => getOpenAIClient("paid")).toThrow(/paid API key/i);
  });
});
