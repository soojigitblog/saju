import { describe, expect, it } from "vitest";
import { fortuneEngine } from "@/lib/fortune-engine";
import { OpenAIFortuneInterpreter } from "@/lib/ai/interpreters/openai-interpreter";
import { getOpenAiApiKey } from "@/lib/ai/config";

const hasKey = Boolean(getOpenAiApiKey());

describe.runIf(hasKey)("OpenAI integration (Responses API)", () => {
  it("free structured output + semantic validation", async () => {
    const chart = fortuneEngine.calculate({
      gender: "female",
      calendarType: "solar",
      birthDate: "1992-10-24",
      birthTime: "14:30",
      birthTimeUnknown: false,
      timezone: "Asia/Seoul",
      countryCode: "KR",
    });

    const interpreter = new OpenAIFortuneInterpreter();
    const result = await interpreter.generateFree({
      chart,
      promptVersion: {
        promptDefinitionId: "11111111-1111-1111-1111-111111111101",
        promptVersionId: "22222222-2222-2222-2222-222222222201",
        promptVersionNumber: 1,
        productInstruction: "무료 미리보기 결과를 작성하십시오.",
      },
      product: { slug: "2026-total", name: "2026년 종합운세" },
    });

    expect(result.headline.length).toBeGreaterThan(0);
    expect(result.scores.overall).toBeGreaterThanOrEqual(1);
    expect(result.scores.overall).toBeLessThanOrEqual(5);
    expect(result.meta.usage).toBeTruthy();
    // eslint-disable-next-line no-console
    console.log(
      `[ai:integration] model=${result.meta.model} tokens=${result.meta.usage?.totalTokens ?? "n/a"}`
    );
  }, 90_000);
});

describe.runIf(!hasKey)("OpenAI integration skipped", () => {
  it("skips when OPENAI_API_KEY is absent", () => {
    expect(hasKey).toBe(false);
  });
});
