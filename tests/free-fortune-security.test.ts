import { describe, expect, it } from "vitest";
import { freeFortuneRequestSchema } from "@/lib/services/free-fortune-schema";
import { assertSameOrigin } from "@/lib/security/same-origin";

describe("analytics / validation guards", () => {
  it("rejects incomplete free fortune payload", () => {
    const parsed = freeFortuneRequestSchema.safeParse({
      nickname: "",
      gender: "female",
    });
    expect(parsed.success).toBe(false);
  });

  it("same-origin allows missing origin with same-origin fetch site", () => {
    const req = new Request("http://localhost:3000/api/fortune/free", {
      method: "POST",
      headers: { "sec-fetch-site": "same-origin", host: "localhost:3000" },
    });
    expect(() => assertSameOrigin(req)).not.toThrow();
  });

  it("same-origin rejects mismatched origin", () => {
    const req = new Request("http://localhost:3000/api/fortune/free", {
      method: "POST",
      headers: {
        origin: "https://evil.example",
        host: "localhost:3000",
      },
    });
    expect(() => assertSameOrigin(req)).toThrow();
  });
});
