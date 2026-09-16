import "server-only";

/**
 * Soft in-memory rate limit for refund request submission.
 */
export function assertRefundRequestRateLimit(key: string): void {
  const limit = 5;
  const windowMs = 60 * 60 * 1000;
  const bucketKey = `REFUND_REQUEST:${key}`;
  const now = Date.now();

  const g = globalThis as unknown as {
    __refundRequestRate?: Map<string, number[]>;
  };
  if (!g.__refundRequestRate) g.__refundRequestRate = new Map();

  const timestamps = (g.__refundRequestRate.get(bucketKey) ?? []).filter(
    (t) => now - t < windowMs
  );
  if (timestamps.length >= limit) {
    const err = new Error("RATE_LIMITED") as Error & {
      code: string;
      status: number;
    };
    err.code = "RATE_LIMITED";
    err.status = 429;
    throw err;
  }
  timestamps.push(now);
  g.__refundRequestRate.set(bucketKey, timestamps);
}
