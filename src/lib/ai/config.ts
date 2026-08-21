import "server-only";

/**
 * AI provider / model configuration.
 * Models are never hardcoded at call sites — read from here / env.
 */

export const AI_ENGINE_NAME = "fortune-ai" as const;
export const AI_SCHEMA_VERSION = "1.1" as const;
export const AI_SCORE_SOURCE = "ai_v1" as const;
export const GENERATION_KEY_VERSION = "v2" as const;

export type AiProviderName = "gemini" | "openai" | "mock";

const DEFAULT_OPENAI_FREE = "gpt-5.6-luna";
const DEFAULT_OPENAI_PAID = "gpt-5.6-terra";
/** Free-tier friendly Flash model with structured JSON support. */
const DEFAULT_GEMINI_FREE = "gemini-2.5-flash";
const DEFAULT_GEMINI_PAID = "gemini-2.5-flash";

export function getOpenAiApiKey(): string | undefined {
  const key = process.env.OPENAI_API_KEY?.trim();
  return key || undefined;
}

export function getGeminiApiKey(): string | undefined {
  const key = process.env.GEMINI_API_KEY?.trim();
  return key || undefined;
}

/** Explicit fallback provider — empty means NONE (no silent paid switch). */
export function getAiFallbackProvider(): AiProviderName | null {
  const raw = process.env.AI_FALLBACK_PROVIDER?.trim().toLowerCase();
  if (!raw) return null;
  if (raw === "gemini" || raw === "openai" || raw === "mock") return raw;
  throw new Error(`CONFIGURATION_ERROR: invalid AI_FALLBACK_PROVIDER=${raw}`);
}

function isBuildLifecycle(): boolean {
  return (
    process.env.npm_lifecycle_event === "build" ||
    process.env.NEXT_PHASE === "phase-production-build"
  );
}

function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production" && !isBuildLifecycle();
}

/**
 * Mock AI is blocked in real production deploys.
 * Local friend-testing often uses `next start` (NODE_ENV=production) with
 * APP_ENV=development — allow mock there, or with ALLOW_MOCK_AI=1.
 */
export function assertMockAllowed(): void {
  if (!isProductionRuntime()) return;
  if (process.env.ALLOW_MOCK_AI === "1") return;
  const appEnv = (process.env.APP_ENV ?? "").toLowerCase();
  if (appEnv === "development" || appEnv === "local" || appEnv === "test") {
    return;
  }
  throw new Error(
    "AI_PROVIDER=mock is forbidden in production. Set AI_PROVIDER=gemini or openai (or APP_ENV=development / ALLOW_MOCK_AI=1 for local next start)."
  );
}

/**
 * Resolve configured provider.
 * - Explicit AI_PROVIDER wins
 * - Default preference when unset (non-production): gemini → openai → mock
 * - Production requires explicit AI_PROVIDER and matching API key
 */
export function resolveAiProviderName(): AiProviderName {
  const raw = process.env.AI_PROVIDER?.trim().toLowerCase();

  if (raw) {
    if (raw !== "gemini" && raw !== "openai" && raw !== "mock") {
      throw new Error(`CONFIGURATION_ERROR: unknown AI_PROVIDER=${raw}`);
    }
    if (raw === "mock") {
      assertMockAllowed();
      return "mock";
    }
    if (isProductionRuntime()) {
      if (raw === "gemini" && !getGeminiApiKey()) {
        throw new Error("GEMINI_API_KEY is required when AI_PROVIDER=gemini in production.");
      }
      if (raw === "openai" && !getOpenAiApiKey()) {
        throw new Error("OPENAI_API_KEY is required when AI_PROVIDER=openai in production.");
      }
    }
    return raw;
  }

  if (isProductionRuntime()) {
    throw new Error(
      "AI_PROVIDER must be set in production (gemini|openai). Mock is forbidden."
    );
  }

  // Dev/test defaults when AI_PROVIDER unset
  if (getGeminiApiKey()) return "gemini";
  if (getOpenAiApiKey()) return "openai";
  return "mock";
}

/** @deprecated Prefer resolveAiProviderName — kept for call-site compatibility. */
export type AiRuntimeMode = AiProviderName;

export function resolveAiRuntimeMode(): AiRuntimeMode {
  return resolveAiProviderName();
}

export function getAiModelFree(provider?: AiProviderName): string {
  const p = provider ?? resolveAiProviderName();
  if (p === "gemini") {
    return process.env.GEMINI_MODEL_FREE?.trim() || DEFAULT_GEMINI_FREE;
  }
  if (p === "openai") {
    return process.env.AI_MODEL_FREE?.trim() || DEFAULT_OPENAI_FREE;
  }
  return "mock";
}

export function getAiModelPaid(provider?: AiProviderName): string {
  const p = provider ?? resolveAiProviderName();
  if (p === "gemini") {
    return process.env.GEMINI_MODEL_PAID?.trim() || DEFAULT_GEMINI_PAID;
  }
  if (p === "openai") {
    return process.env.AI_MODEL_PAID?.trim() || DEFAULT_OPENAI_PAID;
  }
  return "mock";
}

export function getAiTimeoutMs(): number {
  const raw = process.env.AI_TIMEOUT_MS?.trim();
  const n = raw ? Number(raw) : 60_000;
  return Number.isFinite(n) && n > 0 ? n : 60_000;
}

export function getAiMaxRetries(): number {
  const raw = process.env.AI_MAX_RETRIES?.trim();
  const n = raw ? Number(raw) : 2;
  return Number.isFinite(n) && n >= 0 ? Math.min(n, 3) : 2;
}

export function assertProductionOpenAiConfig(): void {
  if (!isProductionRuntime()) return;
  const provider = resolveAiProviderName();
  if (provider === "openai" && !getOpenAiApiKey()) {
    throw new Error("OPENAI_API_KEY is required in production when AI_PROVIDER=openai.");
  }
  if (provider === "gemini" && !getGeminiApiKey()) {
    throw new Error("GEMINI_API_KEY is required in production when AI_PROVIDER=gemini.");
  }
}
