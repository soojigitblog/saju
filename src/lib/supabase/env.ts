/**
 * Environment helpers for Supabase (publishable + secret key model).
 *
 * Browser-safe: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 * Server-only:  SUPABASE_SECRET_KEY
 */

export function getSupabaseUrl(): string | undefined {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  return url || undefined;
}

export function getSupabasePublishableKey(): string | undefined {
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  return key || undefined;
}

export function getSupabaseSecretKey(): string | undefined {
  const key = process.env.SUPABASE_SECRET_KEY?.trim();
  return key || undefined;
}

/** True when browser/server user client can be created. */
export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabasePublishableKey());
}

/** True when privileged admin client can be created (server only). */
export function isSupabaseAdminConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseSecretKey());
}

/**
 * Production traffic must have Supabase configured.
 * `next build` may run without secrets (npm_lifecycle_event === "build").
 */
export function assertProductionSupabaseConfig(): void {
  if (process.env.NODE_ENV !== "production") return;
  if (isBuildLifecycle()) return;
  if (isSupabaseConfigured()) return;

  throw new Error(
    "Supabase is required in production. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
  );
}

function isBuildLifecycle(): boolean {
  return (
    process.env.npm_lifecycle_event === "build" ||
    process.env.NEXT_PHASE === "phase-production-build"
  );
}
