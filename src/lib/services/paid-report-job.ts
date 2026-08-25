import "server-only";

import { FORTUNE_RELEASE_MANIFEST } from "@/lib/fortune-engine/release-manifest";
import {
  assertPaidGeminiConfigured,
  estimateAiCostUsd,
  getAiModelPaid,
  resolveAiProviderForPaid,
} from "@/lib/ai/config";
import { buildGenerationKey } from "@/lib/ai/generation-key";
import { AiEngineError } from "@/lib/ai/errors";
import {
  createAiGeneration,
  getAiGenerationByKey,
  updateAiGeneration,
} from "@/lib/repositories/ai-generations";
import { FreeFlowError } from "@/lib/services/free-flow-errors";
import { getOrderById, updateOrder } from "@/lib/repositories/orders";
import { getProductById } from "@/lib/repositories/products";
import { getProfileById } from "@/lib/repositories/profiles";
import { getFreeResultById } from "@/lib/repositories/free-results";
import { getFortuneChartById } from "@/lib/repositories/fortune-charts";
import {
  createReportIfAbsent,
  getReportByOrderId,
  updateReport,
} from "@/lib/repositories/reports";
import { generatePaidInterpretation } from "@/lib/ai/interpreters/free-interpreter";
import { generatePaidCrossReading } from "@/lib/ai/paid-cross-reading";
import { resolvePaidTarotContext } from "@/lib/services/resolve-paid-tarot-context";
import { buildPaidProductInstruction } from "@/lib/ai/prompts/build-paid-prompt";
import { targetLengthForPaidProduct } from "@/lib/ai/schemas/paid-report";
import { notifyPaidReportFailed } from "@/lib/notifications";
import type { FortuneChart } from "@/lib/fortune-engine/types";
import { trackEvent } from "@/lib/repositories/analytics";
import type { Json } from "@/types/database.types";

export type PaidReportJobResult = {
  reportId: string | null;
  status: "PENDING" | "GENERATING" | "COMPLETED" | "FAILED" | "SKIPPED";
};

/** Normalize legacy rows where payment succeeded but order.status was FAILED. */
async function normalizePaidOrderStatus(order: {
  id: string;
  status: string;
  paid_at: string | null;
}): Promise<void> {
  if (!order.paid_at) return;
  if (order.status === "FAILED") {
    await updateOrder(order.id, { status: "PAID" });
  }
}

function isPayableOrder(order: {
  paid_at: string | null;
  status: string;
}): boolean {
  if (!order.paid_at) return false;
  if (order.status === "PENDING" || order.status === "EXPIRED") return false;
  return (
    order.status === "PAID" ||
    order.status === "GENERATING" ||
    order.status === "COMPLETED" ||
    order.status === "FAILED"
  );
}

/**
 * Start paid report after order is PAID in DB.
 * Never call this based on client paymentSuccess flags alone.
 */
export async function startPaidReportJob(input: {
  orderId: string;
  runGeneration?: boolean;
  triggerOnly?: boolean;
  forceRetry?: boolean;
}): Promise<PaidReportJobResult> {
  const order = await getOrderById(input.orderId);
  if (!order) {
    throw new FreeFlowError("NOT_FOUND", "주문을 찾을 수 없습니다.", 404);
  }

  await normalizePaidOrderStatus(order);

  if (!isPayableOrder(order)) {
    return { reportId: null, status: "SKIPPED" };
  }

  const product = await getProductById(order.product_id);
  if (!product) {
    return { reportId: null, status: "SKIPPED" };
  }

  let report = await getReportByOrderId(order.id);
  if (!report) {
    report = await createReportIfAbsent({
      order_id: order.id,
      profile_id: order.profile_id,
      product_id: order.product_id,
      prompt_version_id: product.promptVersionId ?? null,
      generation_status: "PENDING",
      generation_key: `paid:${order.id}`,
    });
  }

  if (input.triggerOnly && !input.runGeneration) {
    return {
      reportId: report.id,
      status: report.generation_status,
    };
  }

  if (report.generation_status === "COMPLETED") {
    return { reportId: report.id, status: "COMPLETED" };
  }

  if (
    report.generation_status === "GENERATING" &&
    report.attempt_count > 0 &&
    !input.forceRetry
  ) {
    return { reportId: report.id, status: "GENERATING" };
  }

  if (!input.runGeneration) {
    return { reportId: report.id, status: report.generation_status };
  }

  try {
    assertPaidGeminiConfigured();
  } catch (error) {
    const code =
      error instanceof Error && error.message === "PAID_AI_NOT_CONFIGURED"
        ? "PAID_AI_NOT_CONFIGURED"
        : "CONFIGURATION_ERROR";
    await updateReport(report.id, {
      generation_status: "FAILED",
      error_code: code,
      error_message:
        "유료 AI 키가 설정되지 않아 리포트를 생성할 수 없습니다. 관리는 GEMINI_API_KEY_PAID를 설정하세요.",
    });
    await updateOrder(order.id, { status: "PAID" });
    try {
      await notifyPaidReportFailed({
        orderNo: order.order_no,
        productName: order.product_name_snapshot ?? product.name,
        amount: order.amount,
        errorCode: code,
      });
    } catch {
      /* best-effort */
    }
    return { reportId: report.id, status: "FAILED" };
  }

  const attemptCount = (report.attempt_count ?? 0) + 1;
  const provider = resolveAiProviderForPaid();
  const model = getAiModelPaid(provider);
  const promptVersionId =
    product.promptVersionId ?? "22222222-2222-2222-2222-222222222201";

  let chart: FortuneChart | undefined;
  let chartId: string | null = null;
  if (order.source_result_id) {
    const free = await getFreeResultById(order.source_result_id);
    if (free) {
      chartId = free.chart_id;
      const chartRow = await getFortuneChartById(free.chart_id);
      chart = (chartRow?.chart ??
        (chartRow?.raw_chart_json as unknown as FortuneChart | undefined)) as
        | FortuneChart
        | undefined;
    }
  }
  if (!chart) {
    throw new FreeFlowError(
      "CHART_MISSING",
      "사주 데이터가 없어 리포트를 생성할 수 없습니다.",
      400
    );
  }

  const isPaidTarot = product.productType === "tarot_paid";
  const baseGenerationKey = buildGenerationKey({
    calculationHash: chart.engine.calculationHash,
    promptVersionId,
    provider,
    model,
    resultType: "paid",
    productSlug: product.slug,
  });
  const ledgerKey = `${baseGenerationKey}:order:${order.id}`;

  const existingLedger = await getAiGenerationByKey(ledgerKey);
  if (existingLedger?.status === "COMPLETED" && !input.forceRetry) {
    return { reportId: report.id, status: "COMPLETED" };
  }

  if (order.status === "PAID" || order.status === "FAILED") {
    await updateOrder(order.id, { status: "GENERATING" });
  }

  await updateReport(report.id, {
    generation_status: "GENERATING",
    attempt_count: attemptCount,
    error_message: null,
    error_code: null,
  });

  let generationId: string | null = existingLedger?.id ?? null;
  try {
    if (existingLedger) {
      const updated = await updateAiGeneration(existingLedger.id, {
        status: "GENERATING",
        provider,
        model,
        attempt_count: attemptCount,
        error_code: null,
        error_message: null,
        started_at: new Date().toISOString(),
        completed_at: null,
      });
      generationId = updated.id;
    } else {
      const gen = await createAiGeneration({
        generation_key: ledgerKey,
        result_type: isPaidTarot ? "paid_tarot_cross" : "paid",
        profile_id: order.profile_id,
        chart_id: chartId,
        order_id: order.id,
        prompt_version_id: promptVersionId,
        engine_version: FORTUNE_RELEASE_MANIFEST.engineVersion,
        provider_version: FORTUNE_RELEASE_MANIFEST.provider.version,
        provider,
        model,
        status: "GENERATING",
        attempt_count: attemptCount,
        started_at: new Date().toISOString(),
      });
      generationId = gen.id;
    }
  } catch {
    /* ledger best-effort */
  }

  try {
    await trackEvent({
      sessionId: order.guest_session_id ?? order.id,
      eventName: isPaidTarot ? "paid_report_start" : "paid_report_start",
      productId: order.product_id,
      metadata: {
        orderId: order.id,
        reportId: report.id,
        kind: isPaidTarot ? "paid_tarot" : "paid_report",
      },
    });
  } catch {
    /* best-effort */
  }

  try {
    const profile = await getProfileById(order.profile_id);
    if (!profile) throw new Error("PROFILE_MISSING");

    let resultBody: Record<string, unknown>;
    let meta: {
      provider: string;
      model: string;
      promptVersionId?: string;
      usage?: {
        inputTokens: number | null;
        outputTokens: number | null;
        totalTokens: number | null;
      };
      providerRequestId?: string;
    };

    if (isPaidTarot) {
      const { tarotContext } = await resolvePaidTarotContext({
        sourceTarotReadingId:
          (order as { source_tarot_reading_id?: string | null })
            .source_tarot_reading_id ?? null,
        freeResultId: order.source_result_id,
        questionCategoryFallback: "advice",
      });
      const generated = await generatePaidCrossReading({
        chart,
        tarotContext,
        orderId: order.id,
      });
      const { meta: m, ...body } = generated;
      resultBody = body as unknown as Record<string, unknown>;
      meta = m;
      try {
        await trackEvent({
          sessionId: order.guest_session_id ?? order.id,
          eventName: "paid_tarot_generation_complete",
          productId: order.product_id,
          metadata: { orderId: order.id, reportId: report.id },
        });
      } catch {
        /* best-effort */
      }
    } else {
      const generated = await generatePaidInterpretation(
        chart,
        {
          slug: product.slug,
          name: order.product_name_snapshot ?? product.name,
          targetLengthChars: targetLengthForPaidProduct(product.slug),
        },
        {
          promptDefinitionId: "11111111-1111-1111-1111-111111111101",
          promptVersionId,
          promptVersionNumber: 1,
          productInstruction: buildPaidProductInstruction({
            slug: product.slug,
            name: order.product_name_snapshot ?? product.name,
          }),
        },
        {
          presentation: {
            nickname: profile.nickname,
            maritalStatus: profile.marital_status ?? undefined,
            hasChildren: profile.has_children ?? null,
          },
        }
      );
      const { meta: m, ...body } = generated;
      resultBody = body as unknown as Record<string, unknown>;
      meta = m;
    }

    const estimatedCost = estimateAiCostUsd({
      provider: meta.provider as "gemini" | "openai" | "mock",
      inputTokens: meta.usage?.inputTokens,
      outputTokens: meta.usage?.outputTokens,
    });

    await updateReport(report.id, {
      generation_status: "COMPLETED",
      result_json: resultBody as unknown as Json,
      model: meta.model,
      prompt_version: String(meta.promptVersionId ?? ""),
      generated_at: new Date().toISOString(),
      error_message: null,
      error_code: null,
      input_tokens: meta.usage?.inputTokens ?? null,
      output_tokens: meta.usage?.outputTokens ?? null,
      total_tokens: meta.usage?.totalTokens ?? null,
      provider_request_id: meta.providerRequestId ?? null,
      estimated_ai_cost_usd: estimatedCost,
    });

    await updateOrder(order.id, { status: "COMPLETED" });

    if (generationId) {
      try {
        await updateAiGeneration(generationId, {
          status: "COMPLETED",
          input_tokens: meta.usage?.inputTokens ?? null,
          output_tokens: meta.usage?.outputTokens ?? null,
          total_tokens: meta.usage?.totalTokens ?? null,
          provider_request_id: meta.providerRequestId ?? null,
          latency_ms:
            "latencyMs" in meta
              ? ((meta as { latencyMs?: number | null }).latencyMs ?? null)
              : null,
          estimated_ai_cost_usd: estimatedCost,
          completed_at: new Date().toISOString(),
        });
      } catch {
        /* ignore */
      }
    }

    try {
      await trackEvent({
        sessionId: order.guest_session_id ?? order.id,
        eventName: "paid_report_completed",
        productId: order.product_id,
        metadata: { orderId: order.id, reportId: report.id },
      });
    } catch {
      /* best-effort */
    }

    return { reportId: report.id, status: "COMPLETED" };
  } catch (error) {
    const code =
      error instanceof AiEngineError ? error.code : "PAID_GENERATION_FAILED";
    const diagnostic =
      error instanceof AiEngineError
        ? error.message.slice(0, 800)
        : error instanceof Error
          ? error.message.slice(0, 800)
          : "GENERATION_FAILED";
    const safeMessage =
      "입금은 정상적으로 확인되었습니다. 리포트를 준비하는 중 문제가 발생했습니다. 잠시 후 다시 생성됩니다.";

    await updateReport(report.id, {
      generation_status: "FAILED",
      error_code: code,
      error_message: safeMessage.slice(0, 500),
    });
    // Payment succeeded — never mark order FAILED after paid_at is set.
    await updateOrder(order.id, { status: "PAID" });

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

    try {
      await notifyPaidReportFailed({
        orderNo: order.order_no,
        productName: order.product_name_snapshot ?? product.name,
        amount: order.amount,
        errorCode: code,
      });
    } catch {
      /* best-effort alert */
    }

    return { reportId: report.id, status: "FAILED" };
  }
}

export async function adminRetryPaidReportGeneration(input: {
  orderId: string;
}): Promise<PaidReportJobResult> {
  const order = await getOrderById(input.orderId);
  if (!order) {
    throw new FreeFlowError("NOT_FOUND", "주문을 찾을 수 없습니다.", 404);
  }
  if (!order.paid_at) {
    throw new FreeFlowError(
      "ORDER_NOT_PAID",
      "결제가 완료된 주문만 재생성할 수 있습니다.",
      400
    );
  }

  const report = await getReportByOrderId(order.id);
  if (report?.generation_status === "COMPLETED") {
    return { reportId: report.id, status: "COMPLETED" };
  }

  await normalizePaidOrderStatus(order);

  return startPaidReportJob({
    orderId: order.id,
    runGeneration: true,
    forceRetry: true,
  });
}

export async function retryPaidReportGeneration(input: {
  orderId: string;
  guestSessionId: string;
}): Promise<PaidReportJobResult> {
  const order = await getOrderById(input.orderId);
  if (!order || order.guest_session_id !== input.guestSessionId) {
    throw new FreeFlowError("FORBIDDEN", "접근 권한이 없습니다.", 403);
  }
  if (!order.paid_at) {
    throw new FreeFlowError(
      "ORDER_NOT_PAID",
      "결제가 완료된 주문만 재생성할 수 있습니다.",
      400
    );
  }

  const report = await getReportByOrderId(order.id);
  if (report?.generation_status === "COMPLETED") {
    return { reportId: report.id, status: "COMPLETED" };
  }

  await normalizePaidOrderStatus(order);

  return startPaidReportJob({
    orderId: order.id,
    runGeneration: true,
    forceRetry: true,
  });
}
