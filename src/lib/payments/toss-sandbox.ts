import "server-only";

function appEnv(): string {
  return (process.env.APP_ENV ?? "").trim().toLowerCase();
}

export function isTossCheckoutAllowed(): boolean {
  return (
    process.env.ALLOW_TOSS_CHECKOUT === "1" ||
    process.env.NODE_ENV === "test"
  );
}

export function isTossTestKeyPair(): boolean {
  const client = (process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? "").trim();
  const secret = (process.env.TOSS_SECRET_KEY ?? "").trim();
  const clientOk =
    client.startsWith("test_ck_") || client.startsWith("test_gck_");
  const secretOk =
    secret.startsWith("test_sk_") || secret.startsWith("test_gsk_");
  return clientOk && secretOk;
}

/** Local/QA only. Never true when APP_ENV=production. */
export function isNonProductionAppEnv(): boolean {
  const env = appEnv();
  if (env === "production") return false;
  return (
    env === "development" ||
    env === "local" ||
    env === "test" ||
    process.env.NODE_ENV !== "production"
  );
}

/**
 * Toss sandbox (test keys) — local friend-test checkout/report only.
 * Live keys and APP_ENV=production never take this path.
 */
export function isTossTestSandboxCheckoutAllowed(): boolean {
  return (
    process.env.ALLOW_TOSS_CHECKOUT === "1" &&
    isTossTestKeyPair() &&
    isNonProductionAppEnv()
  );
}
