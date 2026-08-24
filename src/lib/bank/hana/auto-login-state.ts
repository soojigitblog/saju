import fs from "node:fs";
import path from "node:path";
import { hanaSessionRoot } from "@/lib/bank/hana/playwright/config";

export type HanaAutoLoginState = {
  failureCount: number;
  lastFailureAt: string | null;
  disabledUntil: string | null;
  lastLoginAt: string | null;
  lastLoginResult:
    | "CONNECTED"
    | "LOGIN_FAILED"
    | "AUTH_REQUIRED"
    | "CAPTCHA_REQUIRED"
    | "AUTO_LOGIN_UNSUPPORTED"
    | "LOGIN_REQUIRED"
    | "AUTO_LOGIN_DISABLED_TEMPORARILY"
    | "SKIPPED_ALREADY_LOGGED_IN"
    | null;
};

const DEFAULT_STATE: HanaAutoLoginState = {
  failureCount: 0,
  lastFailureAt: null,
  disabledUntil: null,
  lastLoginAt: null,
  lastLoginResult: null,
};

function statePath(): string {
  return path.join(hanaSessionRoot(), "auto-login-state.json");
}

export function getHanaAutoLoginMaxFailures(): number {
  const n = Number(process.env.HANA_AUTO_LOGIN_MAX_FAILURES ?? "3");
  return Number.isFinite(n) && n >= 1 ? Math.min(10, Math.floor(n)) : 3;
}

export function isHanaAutoLoginFeatureEnabled(): boolean {
  const raw = (process.env.HANA_AUTO_LOGIN_ENABLED ?? "1").trim();
  return raw !== "0" && raw.toLowerCase() !== "false";
}

export function readAutoLoginState(): HanaAutoLoginState {
  try {
    const raw = fs.readFileSync(statePath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<HanaAutoLoginState>;
    return {
      ...DEFAULT_STATE,
      ...parsed,
      failureCount: Number(parsed.failureCount) || 0,
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function writeAutoLoginState(state: HanaAutoLoginState): void {
  fs.mkdirSync(hanaSessionRoot(), { recursive: true });
  fs.writeFileSync(statePath(), JSON.stringify(state, null, 2), "utf8");
}

/** Backoff after failure: 30s, 2m, then disabled. */
export function nextBackoffMs(failureCount: number): number {
  if (failureCount <= 1) return 30_000;
  if (failureCount === 2) return 120_000;
  return 0;
}

export function isAutoLoginTemporarilyDisabled(
  state: HanaAutoLoginState = readAutoLoginState()
): boolean {
  if (!state.disabledUntil) return false;
  const until = new Date(state.disabledUntil).getTime();
  if (Number.isNaN(until)) return false;
  return Date.now() < until;
}

export function recordAutoLoginSuccess(): HanaAutoLoginState {
  const next: HanaAutoLoginState = {
    failureCount: 0,
    lastFailureAt: null,
    disabledUntil: null,
    lastLoginAt: new Date().toISOString(),
    lastLoginResult: "CONNECTED",
  };
  writeAutoLoginState(next);
  return next;
}

export function recordAutoLoginFailure(
  result: NonNullable<HanaAutoLoginState["lastLoginResult"]>
): HanaAutoLoginState {
  const prev = readAutoLoginState();
  const failureCount = prev.failureCount + 1;
  const max = getHanaAutoLoginMaxFailures();
  const backoff = nextBackoffMs(failureCount);
  const disabledUntil =
    failureCount >= max
      ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      : backoff > 0
        ? new Date(Date.now() + backoff).toISOString()
        : null;

  const next: HanaAutoLoginState = {
    failureCount,
    lastFailureAt: new Date().toISOString(),
    disabledUntil,
    lastLoginAt: prev.lastLoginAt,
    lastLoginResult: result,
  };
  writeAutoLoginState(next);
  return next;
}

export function autoLoginEnabledLabel(
  state: HanaAutoLoginState = readAutoLoginState()
): "ENABLED" | "DISABLED" {
  if (!isHanaAutoLoginFeatureEnabled()) return "DISABLED";
  if (isAutoLoginTemporarilyDisabled(state)) return "DISABLED";
  if (state.failureCount >= getHanaAutoLoginMaxFailures()) return "DISABLED";
  return "ENABLED";
}
