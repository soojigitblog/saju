import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  assertAdminRequest,
  isInternalAdminQaRunner,
  tryAdminRequest,
} from "@/lib/admin/manual-auth";
import { FreeFlowError } from "@/lib/services/free-flow-errors";

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

const VALID_TOKEN = "p6-local-qa-admin-token-2026";

describe("admin fallback safety", () => {
  beforeEach(() => {
    process.env.NODE_ENV = "test";
    process.env.ADMIN_MANUAL_TOKEN = VALID_TOKEN;
    process.env.ADMIN_MANUAL_BYPASS = "1";
    process.env.APP_ENV = "development";
    delete process.env.ALLOW_INTERNAL_ADMIN_QA;
    delete process.env.INTERNAL_ADMIN_QA_RUNNER;
    vi.mocked(getCurrentAdminUser).mockResolvedValue(null);
  });

  afterEach(() => {
    vi.mocked(getCurrentAdminUser).mockReset();
    delete process.env.ADMIN_MANUAL_TOKEN;
    delete process.env.ADMIN_MANUAL_BYPASS;
    delete process.env.ALLOW_INTERNAL_ADMIN_QA;
    delete process.env.INTERNAL_ADMIN_QA_RUNNER;
  });

  it("isInternalAdminQaRunner is true under NODE_ENV=test", () => {
    expect(isInternalAdminQaRunner()).toBe(true);
  });

  it("cookies failure outside scope does not auto-admin without internal runner", async () => {
    process.env.NODE_ENV = "development";
    delete process.env.ALLOW_INTERNAL_ADMIN_QA;
    delete process.env.INTERNAL_ADMIN_QA_RUNNER;
    vi.mocked(getCurrentAdminUser).mockRejectedValue(
      new Error("`cookies` was called outside a request scope")
    );

    const req = new Request("http://localhost/api/admin/x", {
      headers: { "x-admin-manual-token": VALID_TOKEN },
    });
    await expect(tryAdminRequest(req)).resolves.toBeNull();
  });

  it("cookies failure allows legacy token only with explicit internal runner", async () => {
    process.env.NODE_ENV = "development";
    process.env.ALLOW_INTERNAL_ADMIN_QA = "1";
    process.env.INTERNAL_ADMIN_QA_RUNNER = "1";
    vi.mocked(getCurrentAdminUser).mockRejectedValue(
      new Error("`cookies` was called outside a request scope")
    );

    const req = new Request("http://localhost/api/admin/x", {
      headers: { "x-admin-manual-token": VALID_TOKEN },
    });
    const r = await tryAdminRequest(req);
    expect(["legacy_token", "test_bypass"]).toContain(r?.via);
  });

  it("denies weak configured tokens", async () => {
    process.env.ADMIN_MANUAL_TOKEN = "test";
    const req = new Request("http://localhost/api/admin/x", {
      headers: { "x-admin-manual-token": "test" },
    });
    await expect(assertAdminRequest(req)).rejects.toBeInstanceOf(FreeFlowError);
  });

  it("denies customer spoof headers with arbitrary token", async () => {
    const req = new Request("http://localhost/api/reports/x/consulting-pdf", {
      headers: {
        "x-admin-manual-token": "arbitrary-spoof-token",
        internalQa: "true",
        admin: "true",
        allowFallback: "true",
      },
    });
    await expect(tryAdminRequest(req)).resolves.toBeNull();
  });

  it("denies when ADMIN_MANUAL_TOKEN is unset", async () => {
    delete process.env.ADMIN_MANUAL_TOKEN;
    const req = new Request("http://localhost/api/admin/x", {
      headers: { "x-admin-manual-token": VALID_TOKEN },
    });
    await expect(tryAdminRequest(req)).resolves.toBeNull();
  });

  it("allows matching token in test env", async () => {
    const req = new Request("http://localhost/api/admin/x", {
      headers: { "x-admin-manual-token": VALID_TOKEN },
    });
    const r = await assertAdminRequest(req);
    expect(["legacy_token", "test_bypass"]).toContain(r.via);
  });
});
