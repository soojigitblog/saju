import "server-only";

import type { TossPaymentObject } from "./types";

const SENSITIVE_KEYS = new Set([
  "number",
  "cardNumber",
  "accountNumber",
  "customerMobilePhone",
  "customerEmail",
  "secret",
  "authorization",
]);

/**
 * Persist only non-sensitive Toss fields for ops/support.
 * Never log or return the full paymentKey in public DTOs.
 */
export function redactTossPaymentResponse(
  payment: TossPaymentObject
): Record<string, unknown> {
  return {
    orderId: payment.orderId,
    status: payment.status,
    totalAmount: payment.totalAmount,
    method: payment.method ?? null,
    approvedAt: payment.approvedAt ?? null,
    // paymentKey fingerprint only (not the key itself)
    paymentKeyFingerprint: fingerprintKey(payment.paymentKey),
    cardCompany: payment.card?.company ?? null,
    easyPayProvider: payment.easyPay?.provider ?? null,
  };
}

export function fingerprintKey(key: string): string {
  if (!key || key.length < 8) return "****";
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}

export function stripSensitiveDeep(
  value: unknown,
  depth = 0
): unknown {
  if (depth > 6) return "[truncated]";
  if (Array.isArray(value)) {
    return value.map((v) => stripSensitiveDeep(v, depth + 1));
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(k)) {
        out[k] = "[redacted]";
        continue;
      }
      if (k === "paymentKey" && typeof v === "string") {
        out.paymentKeyFingerprint = fingerprintKey(v);
        continue;
      }
      out[k] = stripSensitiveDeep(v, depth + 1);
    }
    return out;
  }
  return value;
}

export function mapTossMethod(payment: TossPaymentObject): string | null {
  if (payment.method) return String(payment.method);
  if (payment.easyPay?.provider) return `EASYPAY:${payment.easyPay.provider}`;
  return null;
}
