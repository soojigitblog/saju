import "server-only";

/**
 * Soft in-memory rate limit for client issue ingestion.
 */
export function assertClientIssueRateLimit(input: {
  kind: "BUG_REPORT" | "CLIENT_ERROR";
  key: string;
}): void {
  const limit = input.kind === "BUG_REPORT" ? 8 : 30;
  const windowMs = 60 * 60 * 1000;
  const bucketKey = `${input.kind}:${input.key}`;
  const now = Date.now();

  const g = globalThis as unknown as {
    __clientIssueRate?: Map<string, number[]>;
  };
  if (!g.__clientIssueRate) g.__clientIssueRate = new Map();

  const timestamps = (g.__clientIssueRate.get(bucketKey) ?? []).filter(
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
  g.__clientIssueRate.set(bucketKey, timestamps);
}
