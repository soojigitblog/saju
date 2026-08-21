import { beforeEach, describe, expect, it } from "vitest";
import { insertClientIssue, listClientIssuesForAdmin } from "@/lib/repositories/client-issues";
import { mockStore } from "@/lib/mock-store";
import { assertClientIssueRateLimit } from "@/lib/client-issues/rate-limit";

describe("client issues", () => {
  beforeEach(() => {
    mockStore.clear();
    process.env.DATA_MODE = "mock";
  });

  it("stores bug report and client error in mock DB", async () => {
    await insertClientIssue({
      kind: "BUG_REPORT",
      message: "결제 후 화면이 안 열려요",
      path: "/payment/success",
      guest_session_id: "guest-1",
    });
    await insertClientIssue({
      kind: "CLIENT_ERROR",
      message: "Cannot read properties of null",
      details: "at Foo",
      path: "/fortune",
    });

    const rows = await listClientIssuesForAdmin();
    expect(rows).toHaveLength(2);
    expect(rows[0]?.kind).toBe("CLIENT_ERROR");
    expect(rows.some((r) => r.kind === "BUG_REPORT")).toBe(true);
  });

  it("rate limits repeated reports", () => {
    for (let i = 0; i < 8; i++) {
      assertClientIssueRateLimit({ kind: "BUG_REPORT", key: "test-key" });
    }
    expect(() =>
      assertClientIssueRateLimit({ kind: "BUG_REPORT", key: "test-key" })
    ).toThrow(/RATE_LIMITED/);
  });
});
