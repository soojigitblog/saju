import "server-only";

import { fortuneEngine } from "@/lib/fortune-engine";
import { FortuneEngineError } from "@/lib/fortune-engine/types";
import type { FortuneChart } from "@/lib/fortune-engine/types";
import {
  createFortuneInterpreter,
  generateFreeInterpretation,
} from "@/lib/ai/interpreters/free-interpreter";
import { buildGenerationKey } from "@/lib/ai/generation-key";
import {
  getAiModelFree,
  resolveAiProviderForFree,
} from "@/lib/ai/config";
import { AiEngineError } from "@/lib/ai/errors";
import type { Json } from "@/types/database.types";
import {
  createGuestProfile,
  findGuestProfileByCanonicalInput,
  getProfileById,
  updateProfileLifeContext,
} from "@/lib/repositories/profiles";
import {
  createFortuneChart,
  findFortuneChartByProfileAndHash,
  getFortuneChartById,
} from "@/lib/repositories/fortune-charts";
import {
  createFreeResult,
  getFreeResultByGenerationKey,
  getFreeResultById,
  updateFreeResult,
} from "@/lib/repositories/free-results";
import {
  createAiGeneration,
  updateAiGeneration,
} from "@/lib/repositories/ai-generations";
import { getDataMode } from "@/lib/repositories/data-mode";
import { mockStore } from "@/lib/mock-store";
import { FORTUNE_RELEASE_MANIFEST } from "@/lib/fortune-engine/release-manifest";
import {
  freeFortuneRequestSchema,
  buildLifeContextKey,
  type FreeFortuneRequest,
} from "@/lib/services/free-fortune-schema";
import {
  FREE_PROMPT_DEFINITION,
  FREE_PROMPT_VERSION,
} from "@/lib/services/free-prompt";
import {
  FreeFlowError,
  assertFreeFortuneRateLimit,
  mapEngineErrorToUser,
} from "@/lib/services/free-flow-errors";

export type CreateFreeFortuneResult = {
  freeResultId: string;
  status: "PENDING" | "GENERATING" | "COMPLETED" | "FAILED";
};

/**
 * Orchestrates free fortune creation.
 * Never holds a DB transaction across the OpenAI call.
 *
 * MVP: synchronous generation inside the request (serverless timeout applies).
 * Service is separated so a future queue worker can call the same steps.
 */
export async function createFreeFortune(input: {
  raw: unknown;
  guestSessionId: string;
  ipHash?: string;
}): Promise<CreateFreeFortuneResult> {
  const parsed = freeFortuneRequestSchema.safeParse(input.raw);
  if (!parsed.success) {
    throw new FreeFlowError(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요."
    );
  }

  const body = parsed.data;
  assertFreeFortuneRateLimit({
    guestSessionId: input.guestSessionId,
    ipHash: input.ipHash,
  });

  const profile = await resolveProfile(body, input.guestSessionId);

  let chart: FortuneChart;
  try {
    chart = fortuneEngine.calculate({
      gender: body.gender,
      calendarType: body.calendarType,
      birthDate: body.birthDate,
      birthTime: body.birthTimeUnknown ? null : body.birthTime,
      birthTimeUnknown: body.birthTimeUnknown,
      lunarLeapMonth:
        body.calendarType === "lunar" ? body.lunarLeapMonth : false,
      timezone: "Asia/Seoul",
      countryCode: "KR",
    });
  } catch (error) {
    if (error instanceof FortuneEngineError) {
      const mapped = mapEngineErrorToUser(error.code);
      throw new FreeFlowError(mapped.code, mapped.message);
    }
    throw new FreeFlowError(
      "CALCULATION_FAILED",
      "사주 계산 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.",
      500
    );
  }

  let chartRow = await findFortuneChartByProfileAndHash({
    profileId: profile.id,
    calculationHash: chart.engine.calculationHash,
  });
  if (!chartRow) {
    chartRow = await createFortuneChart({
      profileId: profile.id,
      chart,
    });
  }

  const provider = resolveAiProviderForFree();
  const model = getAiModelFree(provider);
  const lifeContextKey = buildLifeContextKey({
    maritalStatus: body.maritalStatus,
    hasChildren:
      body.maritalStatus === "married" ? body.hasChildren ?? null : null,
  });
  // Scope by profile so guest A never receives guest B's freeResultId
  // (status/result ownership is guest_session_id on the profile).
  const generationKey = buildGenerationKey({
    calculationHash: chart.engine.calculationHash,
    promptVersionId: FREE_PROMPT_VERSION.id,
    provider,
    model,
    resultType: "free",
    lifeContextKey: `${lifeContextKey}|owner:${profile.id}`,
  });

  const existing = await getFreeResultByGenerationKey(generationKey);
  if (existing && existing.profile_id === profile.id) {
    if (existing.generation_status === "COMPLETED") {
      return { freeResultId: existing.id, status: "COMPLETED" };
    }
    if (existing.generation_status === "GENERATING") {
      return { freeResultId: existing.id, status: "GENERATING" };
    }
    if (
      existing.generation_status === "FAILED" ||
      existing.generation_status === "PENDING"
    ) {
      return runAiGeneration({
        freeResultId: existing.id,
        chart,
        chartId: chartRow.id,
        profileId: profile.id,
        generationKey,
        model,
        attemptCount: Math.max(1, (existing.attempt_count ?? 0) + 1),
      });
    }
  }

  const pending = await createFreeResult({
    profile_id: profile.id,
    chart_id: chartRow.id,
    prompt_version_id: FREE_PROMPT_VERSION.id,
    prompt_version: String(FREE_PROMPT_VERSION.version),
    model,
    generation_key: generationKey,
    generation_status: "PENDING",
    attempt_count: 0,
  });

  const canonical = await getFreeResultByGenerationKey(generationKey);
  const freeResultId = canonical?.id ?? pending.id;
  if (canonical && canonical.id !== pending.id && canonical.profile_id === profile.id) {
    if (canonical.generation_status === "COMPLETED") {
      return { freeResultId: canonical.id, status: "COMPLETED" };
    }
    if (canonical.generation_status === "GENERATING") {
      return { freeResultId: canonical.id, status: "GENERATING" };
    }
    if (canonical.generation_status === "FAILED") {
      return runAiGeneration({
        freeResultId: canonical.id,
        chart,
        chartId: chartRow.id,
        profileId: profile.id,
        generationKey,
        model,
        attemptCount: Math.max(1, (canonical.attempt_count ?? 0) + 1),
      });
    }
  }

  return runAiGeneration({
    freeResultId,
    chart,
    chartId: chartRow.id,
    profileId: profile.id,
    generationKey,
    model,
    attemptCount: 1,
  });
}

export async function retryFailedFreeFortune(input: {
  freeResultId: string;
  guestSessionId: string;
  ipHash?: string;
}): Promise<CreateFreeFortuneResult> {
  const existing = await getFreeResultById(input.freeResultId);
  if (!existing) {
    throw new FreeFlowError("NOT_FOUND", "결과를 찾을 수 없습니다.", 404);
  }
  if (existing.generation_status !== "FAILED") {
    return {
      freeResultId: existing.id,
      status: existing.generation_status,
    };
  }

  const profile = await getProfileById(existing.profile_id);
  if (!profile || profile.guest_session_id !== input.guestSessionId) {
    throw new FreeFlowError("FORBIDDEN", "접근 권한이 없습니다.", 403);
  }

  assertFreeFortuneRateLimit({
    guestSessionId: input.guestSessionId,
    ipHash: input.ipHash,
  });

  const chartRow = await getFortuneChartById(existing.chart_id);
  const chart =
    chartRow?.chart ??
    (chartRow?.raw_chart_json as unknown as FortuneChart | undefined);
  if (!chart?.engine?.calculationHash) {
    throw new FreeFlowError(
      "CALCULATION_FAILED",
      "사주 데이터를 찾을 수 없습니다.",
      500
    );
  }

  const provider = resolveAiProviderForFree();
  const model = existing.model ?? getAiModelFree(provider);
  const generationKey =
    existing.generation_key ??
    buildGenerationKey({
      calculationHash: chart.engine.calculationHash,
      promptVersionId: FREE_PROMPT_VERSION.id,
      provider,
      model,
      resultType: "free",
    });

  return runAiGeneration({
    freeResultId: existing.id,
    chart,
    chartId: existing.chart_id,
    profileId: existing.profile_id,
    generationKey,
    model,
    attemptCount: (existing.attempt_count ?? 0) + 1,
  });
}

async function resolveProfile(
  body: FreeFortuneRequest,
  guestSessionId: string
) {
  const existing = await findGuestProfileByCanonicalInput({
    guestSessionId,
    gender: body.gender,
    birthDate: body.birthDate,
    birthTime: body.birthTimeUnknown ? null : body.birthTime,
    birthTimeUnknown: body.birthTimeUnknown,
    calendarType: body.calendarType,
    birthPlace: body.birthPlace,
  });

  if (existing) {
    return updateProfileLifeContext(existing.id, {
      nickname: body.nickname,
      marital_status: body.maritalStatus,
      has_children:
        body.maritalStatus === "married" ? body.hasChildren ?? null : null,
    });
  }

  return createGuestProfile({
    guest_session_id: guestSessionId,
    nickname: body.nickname,
    gender: body.gender,
    birth_date: body.birthDate,
    birth_time: body.birthTimeUnknown ? null : body.birthTime,
    birth_time_unknown: body.birthTimeUnknown,
    calendar_type: body.calendarType,
    birth_place: body.birthPlace,
    marital_status: body.maritalStatus,
    has_children:
      body.maritalStatus === "married" ? body.hasChildren ?? null : null,
  });
}

async function runAiGeneration(input: {
  freeResultId: string;
  chart: FortuneChart;
  chartId: string;
  profileId: string;
  generationKey: string;
  model: string;
  attemptCount: number;
}): Promise<CreateFreeFortuneResult> {
  await updateFreeResult(input.freeResultId, {
    generation_status: "GENERATING",
    attempt_count: input.attemptCount,
    error_code: null,
    error_message: null,
  });

  let generationId: string | null = null;
  try {
    const gen = await createAiGeneration({
      generation_key: `${input.generationKey}:attempt:${input.attemptCount}`,
      result_type: "free",
      profile_id: input.profileId,
      chart_id: input.chartId,
      prompt_version_id: FREE_PROMPT_VERSION.id,
      engine_version: FORTUNE_RELEASE_MANIFEST.engineVersion,
      provider_version: FORTUNE_RELEASE_MANIFEST.provider.version,
      provider: resolveAiProviderForFree(),
      model: input.model,
      status: "GENERATING",
      attempt_count: input.attemptCount,
      started_at: new Date().toISOString(),
    });
    generationId = gen.id;
  } catch {
    /* ledger best-effort */
  }

  try {
    const profile = await getProfileById(input.profileId);
    const interpreter = createFortuneInterpreter("auto");
    const result = await generateFreeInterpretation(
      input.chart,
      {
        promptDefinitionId: FREE_PROMPT_DEFINITION.id,
        promptVersionId: FREE_PROMPT_VERSION.id,
        promptVersionNumber: FREE_PROMPT_VERSION.version,
        productInstruction: FREE_PROMPT_VERSION.userPromptTemplate,
        systemPromptOverride: FREE_PROMPT_VERSION.systemPrompt,
      },
      {
        interpreter,
        model: input.model,
        product: {
          slug: FREE_PROMPT_DEFINITION.slug,
          name: FREE_PROMPT_DEFINITION.name,
        },
        presentation: {
          nickname: profile?.nickname,
          maritalStatus: profile?.marital_status ?? undefined,
          hasChildren: profile?.has_children ?? null,
        },
      }
    );

    await updateFreeResult(input.freeResultId, {
      generation_status: "COMPLETED",
      result_json: result as unknown as Json,
      model: result.meta.model,
      input_tokens: result.meta.usage?.inputTokens ?? null,
      output_tokens: result.meta.usage?.outputTokens ?? null,
      total_tokens: result.meta.usage?.totalTokens ?? null,
      provider_request_id: result.meta.providerRequestId ?? null,
      error_code: null,
      error_message: null,
    });

    if (generationId) {
      try {
        await updateAiGeneration(generationId, {
          status: "COMPLETED",
          input_tokens: result.meta.usage?.inputTokens ?? null,
          output_tokens: result.meta.usage?.outputTokens ?? null,
          total_tokens: result.meta.usage?.totalTokens ?? null,
          provider_request_id: result.meta.providerRequestId ?? null,
          completed_at: new Date().toISOString(),
        });
      } catch {
        /* ignore */
      }
    }

    return { freeResultId: input.freeResultId, status: "COMPLETED" };
  } catch (error) {
    const code =
      error instanceof AiEngineError ? error.code : "AI_GENERATION_FAILED";
    const diagnostic =
      error instanceof AiEngineError
        ? error.message.slice(0, 800)
        : error instanceof Error
          ? error.message.slice(0, 800)
          : "unknown";
    const safeMessage =
      code === "OPENAI_RATE_LIMIT"
        ? "현재 분석 요청이 많습니다. 잠시 후 다시 시도해 주세요."
        : "결과 생성 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";

    console.error("[createFreeFortune] generation failed", {
      freeResultId: input.freeResultId,
      code,
      diagnostic,
    });

    await updateFreeResult(input.freeResultId, {
      generation_status: "FAILED",
      error_code: code,
      error_message: safeMessage,
    });

    if (generationId) {
      try {
        await updateAiGeneration(generationId, {
          status: "FAILED",
          error_code: code,
          error_message: diagnostic,
          completed_at: new Date().toISOString(),
        });
      } catch {
        /* ignore */
      }
    }

    throw new FreeFlowError("AI_GENERATION_FAILED", safeMessage, 502);
  }
}

export function resetMockFreeFlowState() {
  if (getDataMode() === "mock") mockStore.clear();
}
