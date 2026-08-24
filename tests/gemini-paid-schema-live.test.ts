import { describe, expect, it } from "vitest";
import { getAiModelPaid, getGeminiApiKey } from "@/lib/ai/config";
import { zodToGeminiJsonSchema } from "@/lib/ai/schemas/gemini-schema-adapter";
import { paidFortuneReportStrictSchema } from "@/lib/ai/schemas/paid-report";
import { fortuneEngine } from "@/lib/fortune-engine";
import { ProviderFortuneInterpreter } from "@/lib/ai/interpreters/provider-interpreter";

const hasKey = Boolean(getGeminiApiKey());
const runLive = process.env.GEMINI_LIVE === "1";

function collectKeys(node: unknown, keys = new Set<string>()): Set<string> {
  if (!node || typeof node !== "object") return keys;
  if (Array.isArray(node)) {
    for (const item of node) collectKeys(item, keys);
    return keys;
  }
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    keys.add(k);
    collectKeys(v, keys);
  }
  return keys;
}

describe.runIf(hasKey && runLive)("Gemini paid schema live smoke", () => {
  it("uses gemini-3.6-flash + adapter + Zod/semantic PASS", async () => {
    expect(getAiModelPaid("gemini")).toBe("gemini-3.6-flash");
    const adapted = zodToGeminiJsonSchema(paidFortuneReportStrictSchema);
    const keys = collectKeys(adapted);
    expect(keys.has("anyOf")).toBe(false);
    expect(keys.has("$ref")).toBe(false);

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
      model: "gemini-3.6-flash",
    });

    expect(result.meta.provider).toBe("gemini");
    expect(result.meta.model).toBe("gemini-3.6-flash");
    expect(paidFortuneReportStrictSchema.safeParse(result).success).toBe(true);
    expect(result.sections.length).toBeGreaterThanOrEqual(5);
  }, 180_000);
});

describe.runIf(!runLive)("Gemini paid schema live smoke skipped", () => {
  it("skips unless GEMINI_LIVE=1", () => {
    expect(runLive).toBe(false);
  });
});
