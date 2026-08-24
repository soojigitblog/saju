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

/** Billing / quota policy tier — separate from provider name. */
export type AiBillingTier = "free" | "paid";

const DEFAULT_OPENAI_FREE = "gpt-5.6-luna";
const DEFAULT_OPENAI_PAID = "gpt-5.6-terra";
/** Official Gemini Flash with Structured Outputs. */
const DEFAULT_GEMINI_FREE = "gemini-3.6-flash";
const DEFAULT_GEMINI_PAID = "gemini-3.6-flash";

export function getOpenAiApiKey(): string | undefined {
  const key = process.env.OPENAI_API_KEY?.trim();
  return key || undefined;
}

export function getGeminiApiKey(): string | undefined {
  const key = process.env.GEMINI_API_KEY?.trim();
  return key || undefined;
}

/**
 * Free tier: GEMINI_API_KEY_FREE, else legacy GEMINI_API_KEY.
 * Paid tier: GEMINI_API_KEY_PAID only — never falls back to free/legacy key.
 */
export function getGeminiApiKeyForTier(tier: AiBillingTier): string | undefined {
  if (tier === "paid") {
    return process.env.GEMINI_API_KEY_PAID?.trim() || undefined;
  }
  return process.env.GEMINI_API_KEY_FREE?.trim() || getGeminiApiKey();
}

export function getOpenAiApiKeyForTier(tier: AiBillingTier): string | undefined {
  const tierKey =
    tier === "free"
      ? process.env.OPENAI_API_KEY_FREE?.trim()
      : process.env.OPENAI_API_KEY_PAID?.trim();
  if (tier === "paid") {
    return tierKey || undefined;
  }
  return tierKey || getOpenAiApiKey();
}

/**
 * Operation/runtime: paid Gemini must use an explicit paid billing key.
 * Never silently reuse free/legacy keys.
 */
export function assertPaidGeminiConfigured(): void {
  const provider = resolveAiProviderForPaid();
  if (provider !== "gemini") return;
  if (process.env.NODE_ENV === "test" && process.env.AI_PROVIDER_PAID === "mock") {
    return;
  }
  if (!process.env.GEMINI_API_KEY_PAID?.trim()) {
    throw new Error("PAID_AI_NOT_CONFIGURED");
  }
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
function parseProviderEnv(raw: string | undefined): AiProviderName | null {
  if (!raw) return null;
  const v = raw.trim().toLowerCase();
  if (v !== "gemini" && v !== "openai" && v !== "mock") {
    throw new Error(`CONFIGURATION_ERROR: unknown AI provider=${v}`);
  }
  if (v === "mock") {
    assertMockAllowed();
    return "mock";
  }
  return v;
}

function assertProviderKeyInProduction(
  provider: AiProviderName,
  tier: AiBillingTier
): void {
  if (!isProductionRuntime()) return;
  if (provider === "gemini" && !getGeminiApiKeyForTier(tier)) {
    throw new Error(
      `GEMINI API key is required for ${tier} tier when AI_PROVIDER=gemini in production.`
    );
  }
  if (provider === "openai" && !getOpenAiApiKeyForTier(tier)) {
    throw new Error(
      `OPENAI API key is required for ${tier} tier when AI_PROVIDER=openai in production.`
    );
  }
}

function resolveProviderForTier(tier: AiBillingTier): AiProviderName {
  const tierEnv =
    tier === "free"
      ? process.env.AI_PROVIDER_FREE?.trim()
      : process.env.AI_PROVIDER_PAID?.trim();
  const tierParsed = parseProviderEnv(tierEnv);
  if (tierParsed) {
    assertProviderKeyInProduction(tierParsed, tier);
    return tierParsed;
  }

  const legacy = process.env.AI_PROVIDER?.trim();
  const legacyParsed = parseProviderEnv(legacy);
  if (legacyParsed) {
    assertProviderKeyInProduction(legacyParsed, tier);
    return legacyParsed;
  }

  if (isProductionRuntime()) {
    throw new Error(
      `AI_PROVIDER_${tier.toUpperCase()} or AI_PROVIDER must be set in production.`
    );
  }

  if (getGeminiApiKeyForTier(tier)) return "gemini";
  if (getOpenAiApiKeyForTier(tier)) return "openai";
  return "mock";
}

/** Free fortune / tarot — uses AI_PROVIDER_FREE or legacy AI_PROVIDER. */
export function resolveAiProviderForFree(): AiProviderName {
  return resolveProviderForTier("free");
}

/** Paid report — uses AI_PROVIDER_PAID or legacy AI_PROVIDER. */
export function resolveAiProviderForPaid(): AiProviderName {
  return resolveProviderForTier("paid");
}

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

/** Cap paid report output tokens — prevents runaway generation cost. */
export function getPaidReportMaxOutputTokens(): number {
  const raw = process.env.PAID_REPORT_MAX_OUTPUT_TOKENS?.trim();
  const n = raw ? Number(raw) : 12_288;
  return Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), 65536) : 12_288;
}

/** USD per 1M tokens — override via env for billing updates. */
function geminiPricePer1M(input: "input" | "output"): number {
  const envKey =
    input === "input"
      ? process.env.GEMINI_PRICE_INPUT_PER_1M
      : process.env.GEMINI_PRICE_OUTPUT_PER_1M;
  const parsed = envKey ? Number(envKey) : NaN;
  if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  // gemini-3.6-flash approximate list pricing (USD / 1M tokens)
  return input === "input" ? 0.1 : 0.4;
}

function openAiPricePer1M(input: "input" | "output"): number {
  const envKey =
    input === "input"
      ? process.env.OPENAI_PRICE_INPUT_PER_1M
      : process.env.OPENAI_PRICE_OUTPUT_PER_1M;
  const parsed = envKey ? Number(envKey) : NaN;
  if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  return input === "input" ? 1.0 : 4.0;
}

/** Estimate AI cost in USD from token usage. Returns null when tokens unknown. */
export function estimateAiCostUsd(input: {
  provider: AiProviderName;
  inputTokens: number | null | undefined;
  outputTokens: number | null | undefined;
}): number | null {
  if (input.provider === "mock") return 0;
  const inTok = input.inputTokens ?? 0;
  const outTok = input.outputTokens ?? 0;
  if (inTok <= 0 && outTok <= 0) return null;

  const priceIn =
    input.provider === "gemini"
      ? geminiPricePer1M("input")
      : openAiPricePer1M("input");
  const priceOut =
    input.provider === "gemini"
      ? geminiPricePer1M("output")
      : openAiPricePer1M("output");

  const cost = (inTok / 1_000_000) * priceIn + (outTok / 1_000_000) * priceOut;
  return Math.round(cost * 1_000_000) / 1_000_000;
}

/** Display exchange rate for admin margin (KRW per USD). */
export function getUsdToKrwRate(): number {
  const raw = process.env.USD_TO_KRW_RATE?.trim();
  const n = raw ? Number(raw) : 1400;
  return Number.isFinite(n) && n > 0 ? n : 1400;
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
