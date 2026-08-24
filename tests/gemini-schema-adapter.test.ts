import { describe, expect, it } from "vitest";
import { z } from "zod";
import { zodToGeminiJsonSchema } from "@/lib/ai/schemas/gemini-schema-adapter";
import { paidFortuneReportStrictSchema } from "@/lib/ai/schemas/paid-report";

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

describe("gemini schema adapter", () => {
  it("strips unsupported JSON Schema keywords", () => {
    const schema = z.object({
      title: z.string().min(1),
      score: z.number().int().min(1).max(5),
      tag: z.enum(["a", "b"]),
      extra: z.string().optional(),
    });
    const gemini = zodToGeminiJsonSchema(schema);
    const keys = collectKeys(gemini);
    expect(keys.has("$ref")).toBe(false);
    expect(keys.has("anyOf")).toBe(false);
    expect(keys.has("pattern")).toBe(false);
    expect(keys.has("minLength")).toBe(false);
    expect(gemini.type).toBe("object");
  });

  it("produces paid report schema without forbidden keywords", () => {
    const gemini = zodToGeminiJsonSchema(paidFortuneReportStrictSchema);
    const keys = collectKeys(gemini);
    const forbidden = [
      "$ref",
      "$defs",
      "oneOf",
      "anyOf",
      "allOf",
      "not",
      "const",
      "patternProperties",
      "dependentRequired",
      "unevaluatedProperties",
      "pattern",
      "additionalProperties",
      "minItems",
      "maxItems",
    ];
    for (const f of forbidden) {
      expect(keys.has(f)).toBe(false);
    }
    const month = (
      (gemini.properties as Record<string, unknown>).monthlyOutlook as {
        items?: { properties?: { month?: { type?: string } } };
      }
    )?.items?.properties?.month;
    if (month) expect(month.type).toBe("number");
    for (const f of forbidden) {
      expect(keys.has(f)).toBe(false);
    }
    expect(gemini.type).toBe("object");
    expect(gemini.properties).toBeTruthy();
  });
});
