import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  detectHanaAuthStateFromContent,
} from "@/lib/bank/hana/playwright/auth-detect";
import {
  nextBackoffMs,
  getHanaAutoLoginMaxFailures,
  recordAutoLoginFailure,
  recordAutoLoginSuccess,
  readAutoLoginState,
  writeAutoLoginState,
  isAutoLoginTemporarilyDisabled,
} from "@/lib/bank/hana/auto-login-state";
import {
  resolveBankConnectionLabel,
  bankConnectionMessage,
} from "@/lib/bank/connection-status";
import {
  saveHanaCredentials,
  loadHanaCredentials,
  deleteHanaCredentials,
  hanaCredentialStoreStatus,
} from "@/lib/bank/hana/credentials-store";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

describe("hana CAPTCHA / auth detect", () => {
  it("detects CAPTCHA_REQUIRED", () => {
    expect(
      detectHanaAuthStateFromContent({
        url: "https://banking.kebhana.com/common/login.do",
        bodyText: "보안문자 CAPTCHA 를 입력하세요",
        title: "로그인",
      })
    ).toBe("CAPTCHA_REQUIRED");
  });
});

describe("auto-login backoff", () => {
  const tmpRoot = path.join(os.tmpdir(), `hana-auto-login-test-${Date.now()}`);

  beforeEach(() => {
    process.env.HANA_BANK_SESSION_DIR = tmpRoot;
    fs.mkdirSync(tmpRoot, { recursive: true });
    writeAutoLoginState({
      failureCount: 0,
      lastFailureAt: null,
      disabledUntil: null,
      lastLoginAt: null,
      lastLoginResult: null,
    });
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
    delete process.env.HANA_BANK_SESSION_DIR;
  });

  it("uses 30s then 2m backoff", () => {
    expect(nextBackoffMs(1)).toBe(30_000);
    expect(nextBackoffMs(2)).toBe(120_000);
  });

  it("disables after max failures", () => {
    process.env.HANA_AUTO_LOGIN_MAX_FAILURES = "3";
    expect(getHanaAutoLoginMaxFailures()).toBe(3);
    recordAutoLoginFailure("LOGIN_FAILED");
    recordAutoLoginFailure("LOGIN_FAILED");
    const state = recordAutoLoginFailure("LOGIN_FAILED");
    expect(state.failureCount).toBe(3);
    expect(state.disabledUntil).toBeTruthy();
    expect(isAutoLoginTemporarilyDisabled(state)).toBe(true);
  });

  it("resets on success", () => {
    recordAutoLoginFailure("LOGIN_FAILED");
    const ok = recordAutoLoginSuccess();
    expect(ok.failureCount).toBe(0);
    expect(ok.lastLoginResult).toBe("CONNECTED");
    expect(readAutoLoginState().failureCount).toBe(0);
  });
});

describe("connection labels for auto-login errors", () => {
  it("maps LOGIN_FAILED to LOGIN_REQUIRED", () => {
    expect(
      resolveBankConnectionLabel(
        {
          status: "SESSION_EXPIRED",
          last_success_at: null,
          last_error_safe: "LOGIN_FAILED",
        },
        true
      )
    ).toBe("LOGIN_REQUIRED");
    expect(bankConnectionMessage("LOGIN_REQUIRED")).toContain("자동 로그인");
  });

  it("maps CAPTCHA_REQUIRED", () => {
    expect(
      resolveBankConnectionLabel(
        {
          status: "ERROR",
          last_success_at: null,
          last_error_safe: "CAPTCHA_REQUIRED",
        },
        true
      )
    ).toBe("CAPTCHA_REQUIRED");
  });
});

describe("Windows credential store (integration)", () => {
  const probeUser = `wiro-test-${Date.now()}`;

  afterEach(() => {
    try {
      deleteHanaCredentials();
    } catch {
      /* ignore */
    }
  });

  it("saves and loads without exposing in status", () => {
    saveHanaCredentials({ username: probeUser, password: "not-a-real-password" });
    expect(hanaCredentialStoreStatus()).toBe("PRESENT");
    const loaded = loadHanaCredentials();
    expect(loaded?.username).toBe(probeUser);
    expect(loaded?.password).toBe("not-a-real-password");
    deleteHanaCredentials();
    expect(hanaCredentialStoreStatus()).toBe("ABSENT");
  });
});
