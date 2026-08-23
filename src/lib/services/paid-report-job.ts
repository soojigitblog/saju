import "server-only";

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
import type { FortuneChart } from "@/lib/fortune-engine/types";
import { trackEvent } from "@/lib/repositories/analytics";
import type { Json } from "@/types/database.types";

export type PaidReportJobResult = {
  reportId: string | null;
  status: "PENDING" | "GENERATING" | "COMPLETED" | "FAILED" | "SKIPPED";
};

/**
 * Start paid report after order is PAID in DB.
 * Never call this based on client paymentSuccess flags alone.
 *
 * triggerOnly: ensure report row exists / return status without re-running AI.
 * runGeneration: attempt AI (idempotent via reports.order_id UNIQUE).
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

  const payableStatuses = new Set([
    "PAID",
    "GENERATING",
    "COMPLETED",
    "FAILED",
  ]);
  if (!payableStatuses.has(order.status)) {
    // AI must never run before PAID
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

  // Allow explicit retry to re-enter generation after FAILED / stuck GENERATING
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

  // Transition order → GENERATING (payment remains PAID conceptually via paid_at)
  if (order.status === "PAID") {
    await updateOrder(order.id, { status: "GENERATING" });
  }

  await updateReport(report.id, {
    generation_status: "GENERATING",
    attempt_count: (report.attempt_count ?? 0) + 1,
    error_message: null,
    error_code: null,
  });

  try {
    await trackEvent({
      sessionId: order.guest_session_id ?? order.id,
      eventName: "paid_report_start",
      productId: order.product_id,
      metadata: { orderId: order.id, reportId: report.id },
    });
  } catch {
    /* best-effort */
  }

  try {
    const profile = await getProfileById(order.profile_id);
    if (!profile) throw new Error("PROFILE_MISSING");

    let chart: FortuneChart | undefined;
    if (order.source_result_id) {
      const free = await getFreeResultById(order.source_result_id);
      if (free) {
        const chartRow = await getFortuneChartById(free.chart_id);
        chart = (chartRow?.chart ??
          (chartRow?.raw_chart_json as unknown as FortuneChart | undefined)) as
          | FortuneChart
          | undefined;
      }
    }
    if (!chart) {
      throw new Error("CHART_MISSING");
    }

    const generated = await generatePaidInterpretation(
      chart,
      {
        slug: product.slug,
        name: order.product_name_snapshot ?? product.name,
        targetLengthChars: 4000,
      },
      {
        promptDefinitionId: "11111111-1111-1111-1111-111111111101",
        promptVersionId:
          product.promptVersionId ?? "22222222-2222-2222-2222-222222222201",
        promptVersionNumber: 1,
        productInstruction: `${order.product_name_snapshot ?? product.name} 상세 리포트.`,
      },
      {
        presentation: {
          nickname: profile.nickname,
          maritalStatus: profile.marital_status ?? undefined,
          hasChildren: profile.has_children ?? null,
        },
      }
    );

    const { meta, ...resultBody } = generated;

    await updateReport(report.id, {
      generation_status: "COMPLETED",
      result_json: resultBody as unknown as Json,
      model: meta.model,
      prompt_version: String(meta.promptVersionId ?? ""),
      generated_at: new Date().toISOString(),
      error_message: null,
      error_code: null,
    });

    await updateOrder(order.id, { status: "COMPLETED" });

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
    const message =
      error instanceof Error ? error.message : "GENERATION_FAILED";
    await updateReport(report.id, {
      generation_status: "FAILED",
      error_code: "PAID_GENERATION_FAILED",
      error_message: message.slice(0, 500),
    });
    // Keep order as FAILED for fulfillment, but paid_at remains set
    await updateOrder(order.id, { status: "FAILED" });
    return { reportId: report.id, status: "FAILED" };
  }
}

/**
 * Admin retry — no guest session required. Payment stays PAID.
 */
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

  if (order.status === "FAILED" || order.status === "PAID") {
    await updateOrder(order.id, { status: "PAID" });
  }

  return startPaidReportJob({
    orderId: order.id,
    runGeneration: true,
    forceRetry: true,
  });
}

/**
 * Retry AI only — never creates a new order/payment.
 */
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

  if (order.status === "FAILED" || order.status === "PAID") {
    await updateOrder(order.id, { status: "PAID" });
  }

  return startPaidReportJob({
    orderId: order.id,
    runGeneration: true,
    forceRetry: true,
  });
}
