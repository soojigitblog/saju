import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { assertAdminRequest } from "@/lib/admin/manual-auth";
import { writeAdminAudit, listAdminAuditLogs } from "@/lib/repositories/admin-audit";
import { getFeedbackAdminSummary } from "@/lib/repositories/feedbacks";
import { maskDepositorNameForAlert } from "@/lib/notifications";
import { FreeFlowError } from "@/lib/services/free-flow-errors";
import { resetMockFreeFlowState } from "@/lib/services/create-free-fortune";
import { upsertFeedback } from "@/lib/repositories/feedbacks";

vi.mock("@/lib/repositories/roles", async () => {
  const actual = await vi.importActual<typeof import("@/lib/repositories/roles")>(
    "@/lib/repositories/roles"
  );
  return {
    ...actual,
    getCurrentAdminUser: vi.fn(),
    isCurrentUserAdmin: vi.fn(),
  };
});

import { getCurrentAdminUser } from "@/lib/repositories/roles";

describe("admin auth assertAdminRequest", () => {
  beforeEach(() => {
    resetMockFreeFlowState();
    process.env.NODE_ENV = "test";
    process.env.ADMIN_MANUAL_TOKEN = "test-admin-token";
    process.env.ADMIN_MANUAL_BYPASS = "1";
    vi.mocked(getCurrentAdminUser).mockResolvedValue(null);
  });

  afterEach(() => {
    vi.mocked(getCurrentAdminUser).mockReset();
    delete process.env.ADMIN_MANUAL_TOKEN;
    delete process.env.ADMIN_MANUAL_BYPASS;
  });

  it("allows session admin", async () => {
    vi.mocked(getCurrentAdminUser).mockResolvedValue({
      id: "admin-1",
      email: "a@test.com",
    });
    const req = new Request("http://localhost/api/admin/x", { method: "POST" });
    const r = await assertAdminRequest(req);
    expect(r.via).toBe("session");
    expect(r.user?.id).toBe("admin-1");
  });

  it("allows test bypass / legacy token in test", async () => {
    const req = new Request("http://localhost/api/admin/x", {
      method: "POST",
      headers: { "x-admin-manual-token": "test-admin-token" },
    });
    const r = await assertAdminRequest(req);
    expect(["legacy_token", "test_bypass"]).toContain(r.via);
  });

  it("denies guest without session or token", async () => {
    process.env.ADMIN_MANUAL_BYPASS = "";
    process.env.ADMIN_MANUAL_TOKEN = "";
    const req = new Request("http://localhost/api/admin/x", { method: "POST" });
    await expect(assertAdminRequest(req)).rejects.toBeInstanceOf(FreeFlowError);
  });
});

describe("admin audit + feedback summary", () => {
  beforeEach(() => {
    resetMockFreeFlowState();
  });

  it("writes audit log in mock", async () => {
    await writeAdminAudit({
      adminUserId: "admin-1",
      action: "BANK_CONFIRM",
      targetType: "order",
      targetId: "order-1",
      meta: { already: false },
    });
    const logs = await listAdminAuditLogs(10);
    expect(logs.some((l) => l.action === "BANK_CONFIRM")).toBe(true);
  });

  it("aggregates feedback without exposing guest ids in recent payload fields used by UI", async () => {
    await upsertFeedback({
      guestSessionId: "guest-secret-xyz",
      targetType: "FORTUNE",
      targetId: "11111111-1111-1111-1111-111111111111",
      rating: 5,
      tags: ["SPOT_ON"],
    });
    await upsertFeedback({
      guestSessionId: "guest-2",
      targetType: "CROSS_READING",
      targetId: "22222222-2222-2222-2222-222222222222",
      rating: 4,
      moreFunThanSajuAlone: "YES",
    });
    const summary = await getFeedbackAdminSummary(10);
    expect(summary.byType.FORTUNE?.count).toBeGreaterThan(0);
    expect(summary.moreFunYesRate).toBe(1);
    const blob = JSON.stringify(summary.recent);
    expect(blob).not.toContain("guest-secret-xyz");
  });

  it("keeps depositor masking helper for ops alerts", () => {
    expect(maskDepositorNameForAlert("정수지")).toBe("정**");
  });
});
