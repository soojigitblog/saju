import { beforeAll, describe, expect, it } from "vitest";
import { GoogleGenAI } from "@google/genai";
import { fortuneEngine } from "@/lib/fortune-engine";
import { ProviderFortuneInterpreter } from "@/lib/ai/interpreters/provider-interpreter";
import { getAiModelPaid, getGeminiApiKey } from "@/lib/ai/config";

const hasKey = Boolean(getGeminiApiKey());

async function probeGeminiModel(model: string): Promise<boolean> {
  const key = getGeminiApiKey();
  if (!key) return false;
  try {
    const client = new GoogleGenAI({ apiKey: key });
    await client.models.generateContent({
      model,
      contents: [{ role: "user", parts: [{ text: "Reply OK" }] }],
    });
    return true;
  } catch {
    return false;
  }
}

describe.runIf(hasKey)("Gemini integration", () => {
  let paidModel = getAiModelPaid("gemini");
  let paidModelOk = false;

  beforeAll(async () => {
    paidModel = getAiModelPaid("gemini");
    paidModelOk = await probeGeminiModel(paidModel);
    if (!paidModelOk) {
      // eslint-disable-next-line no-console
      console.warn(
        `[gemini] configured paid model unavailable on this key: ${paidModel}`
      );
    }
  });

  it("paid model config is gemini-3.6-flash", () => {
    expect(getAiModelPaid("gemini")).toBe("gemini-3.6-flash");
  });
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

  it("paid structured output + Zod/semantic validation", async (ctx) => {
    if (!paidModelOk) ctx.skip();

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
    const result = await interpreter.generatePaid({
      chart,
      product: {
        slug: "wealth-focus",
        name: "재물운 집중분석",
        targetLengthChars: 4000,
      },
      promptVersion: {
        promptDefinitionId: "11111111-1111-1111-1111-111111111101",
        promptVersionId: "22222222-2222-2222-2222-222222222201",
        promptVersionNumber: 1,
        productInstruction: "재물운 집중분석 상세 리포트.",
      },
      presentation: { nickname: "테스트", maritalStatus: "unmarried" },
      model: paidModel,
    });

    expect(result.meta.provider).toBe("gemini");
    expect(result.meta.model).toBe(paidModel);
    expect(result.sections.length).toBeGreaterThanOrEqual(5);
  }, 120_000);
});

describe.runIf(!hasKey)("Gemini integration skipped", () => {
  it("skips when GEMINI_API_KEY is absent", () => {
    expect(hasKey).toBe(false);
  });
});
