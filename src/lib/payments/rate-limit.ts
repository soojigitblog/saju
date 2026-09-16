import "server-only";

/**
 * Soft rate limit for order create / payment confirm.
 * Idempotent confirm refreshes should stay under the limit.
 */
export function assertPaymentMutationRateLimit(input: {
  bucket: "order_create" | "payment_confirm" | "access_restore";
  guestSessionId: string;
  limit?: number;
  windowMs?: number;
}): void {
  const limit =
    input.limit ??
    (input.bucket === "order_create"
      ? 20
      : input.bucket === "access_restore"
        ? 10
        : 60);
  const windowMs = input.windowMs ?? 60_000;
  const key = `${input.bucket}:${input.guestSessionId}`;
  const now = Date.now();

  const g = globalThis as unknown as {
    __payRate?: Map<string, number[]>;
  };
  if (!g.__payRate) g.__payRate = new Map();

  const timestamps = (g.__payRate.get(key) ?? []).filter(
    (t) => now - t < windowMs
  );
  if (timestamps.length >= limit) {
    const err = new Error("RATE_LIMITED");
    (err as Error & { code: string; status: number }).code = "RATE_LIMITED";
    (err as Error & { code: string; status: number }).status = 429;
    throw err;
  }
  timestamps.push(now);
  g.__payRate.set(key, timestamps);
}
