import "server-only";

import { createHash } from "node:crypto";
import { getDataMode } from "@/lib/repositories/data-mode";
import { mockStore } from "@/lib/mock-store";
import {
  getFreeFortuneLimit,
  getFreeFortuneWindowSeconds,
} from "@/lib/services/free-prompt";

/**
 * Guest-session keyed rate limit. Optional IP hash is secondary.
 * Raw IP is never persisted.
 */
export function assertFreeFortuneRateLimit(input: {
  guestSessionId: string;
  ipHash?: string;
}): void {
  const limit = getFreeFortuneLimit();
  const windowMs = getFreeFortuneWindowSeconds() * 1000;
  const key = `free:${input.guestSessionId}:${input.ipHash ?? "noip"}`;
  const now = Date.now();

  if (getDataMode() === "mock") {
    const timestamps = (mockStore.rateBuckets.get(key) ?? []).filter(
      (t) => now - t < windowMs
    );
    if (timestamps.length >= limit) {
      throw new FreeFlowError(
        "RATE_LIMITED",
        "잠시 후 다시 시도해 주세요. 요청이 너무 많습니다."
      );
    }
    timestamps.push(now);
    mockStore.rateBuckets.set(key, timestamps);
    return;
  }

  // Production: use same in-process bucket as soft limit.
  // Durable rate limiting can move to Redis later.
  const g = globalThis as unknown as {
    __freeRate?: Map<string, number[]>;
  };
  if (!g.__freeRate) g.__freeRate = new Map();
  const timestamps = (g.__freeRate.get(key) ?? []).filter(
    (t) => now - t < windowMs
  );
  if (timestamps.length >= limit) {
    throw new FreeFlowError(
      "RATE_LIMITED",
      "잠시 후 다시 시도해 주세요. 요청이 너무 많습니다."
    );
  }
  timestamps.push(now);
  g.__freeRate.set(key, timestamps);
}

export function hashIp(ip: string | null | undefined): string | undefined {
  if (!ip) return undefined;
  return createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

export class FreeFlowError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "FreeFlowError";
    this.code = code;
    this.status = status;
  }
}

export function mapEngineErrorToUser(code: string): { code: string; message: string } {
  switch (code) {
    case "INVALID_LUNAR_DATE":
      return {
        code,
        message: "음력 생년월일을 확인해 주세요. 존재하지 않는 날짜일 수 있습니다.",
      };
    case "UNSUPPORTED_DATE_RANGE":
      return {
        code,
        message: "지원하지 않는 생년월일입니다. 1900–2050년 사이를 입력해 주세요.",
      };
    case "INVALID_BIRTH_TIME":
      return { code, message: "출생시간을 다시 확인해 주세요." };
    case "INVALID_SOLAR_DATE":
      return { code, message: "양력 생년월일을 다시 확인해 주세요." };
    case "INVALID_LEAP_MONTH":
      return { code, message: "해당 연월에는 윤달이 없습니다." };
    default:
      return {
        code: "CALCULATION_FAILED",
        message: "사주 계산 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.",
      };
  }
}
