import { describe, expect, it } from "vitest";
import { fortuneEngine } from "@/lib/fortune-engine";
import { ProviderFortuneInterpreter } from "@/lib/ai/interpreters/provider-interpreter";
import { getGeminiApiKey } from "@/lib/ai/config";

const hasKey = Boolean(getGeminiApiKey());

describe.runIf(hasKey)("Gemini integration", () => {
  it("free structured output + semantic validation", async () => {
    const chart = fortuneEngine.calculate({
      gender: "female",
      calendarType: "solar",
      birthDate: "1990-05-15",
      birthTime: "10:30",
      birthTimeUnknown: false,
      timezone: "Asia/Seoul",
      countryCode: "KR",
    });

    const interpreter = new ProviderFortuneInterpreter("gemini");
    const result = await interpreter.generateFree({
      chart,
      promptVersion: {
        promptDefinitionId: "11111111-1111-1111-1111-111111111110",
        promptVersionId: "22222222-2222-2222-2222-222222222212",
        promptVersionNumber: 1,
        productInstruction: "무료 미리보기 결과를 작성하십시오.",
      },
      product: { slug: "free-default", name: "무료 사주 기본" },
    });

    expect(result.meta.provider).toBe("gemini");
    expect(result.headline.length).toBeGreaterThan(0);
    expect(result.scores.overall).toBeGreaterThanOrEqual(1);
    expect(result.scores.overall).toBeLessThanOrEqual(5);
    // eslint-disable-next-line no-console
    console.log(
      `[ai:gemini] model=${result.meta.model} tokens=${result.meta.usage?.totalTokens ?? "n/a"}`
    );
  }, 90_000);

  it("unknown birth time structured output + semantic validation", async () => {
    const chart = fortuneEngine.calculate({
      gender: "male",
      calendarType: "solar",
      birthDate: "1995-07-12",
      birthTime: null,
      birthTimeUnknown: true,
      timezone: "Asia/Seoul",
      countryCode: "KR",
    });

    const interpreter = new ProviderFortuneInterpreter("gemini");
    const result = await interpreter.generateFree({
      chart,
      promptVersion: {
        promptDefinitionId: "11111111-1111-1111-1111-111111111110",
        promptVersionId: "22222222-2222-2222-2222-222222222212",
        promptVersionNumber: 1,
        productInstruction: "무료 미리보기 결과를 작성하십시오.",
      },
      product: { slug: "free-default", name: "무료 사주 기본" },
    });

    expect(result.meta.provider).toBe("gemini");
    expect(result.summary).toMatch(/시간|시주|정확|제한/i);
  }, 90_000);
});

describe.runIf(!hasKey)("Gemini integration skipped", () => {
  it("skips when GEMINI_API_KEY is absent", () => {
    expect(hasKey).toBe(false);
  });
});
