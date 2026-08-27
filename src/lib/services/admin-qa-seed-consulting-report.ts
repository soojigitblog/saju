import "server-only";

import { isAdminQaSeedExecutionAllowed } from "@/lib/ai/config";
import { createGuestSessionId } from "@/lib/guest/session";
import { createFreeFortune } from "@/lib/services/create-free-fortune";
import { createOrderForGuest } from "@/lib/services/create-order";
import { confirmTossPaymentForOwner } from "@/lib/services/confirm-payment";
import { startPaidReportJob } from "@/lib/services/paid-report-job";
import { getOrderById } from "@/lib/repositories/orders";
import { getReportByOrderId } from "@/lib/repositories/reports";
import { FreeFlowError } from "@/lib/services/free-flow-errors";
import {
  INTERPRETATION_VERSION_CONSULTING,
  REPORT_RENDER_VERSION_CONSULTING,
} from "@/lib/report/paid-report-versions";

const sampleInput = {
  nickname: "수지",
  gender: "female" as const,
  calendarType: "solar" as const,
  birthDate: "1990-05-15",
  birthTime: "10:30",
  birthTimeUnknown: false,
  lunarLeapMonth: false,
  birthPlace: "서울",
  maritalStatus: "unmarried" as const,
  hasChildren: null,
  timezone: "Asia/Seoul" as const,
};

/**
 * Admin-only QA seed for pre-live authenticity smoke.
 * Caller MUST have already passed assertAdminRequest.
 * Does NOT enable customer mock access or Paid Gemini Live.
 */
export async function seedAdminQaConsultingReport(input: {
  productId: string;
}): Promise<{
  guestSessionId: string;
  orderId: string;
  reportId: string;
  interpretationVersion: string | undefined;
  reportRenderVersion: string | undefined;
  generationMode: string | undefined;
}> {
  if (!isAdminQaSeedExecutionAllowed()) {
    throw new FreeFlowError(
      "FORBIDDEN",
      "Admin QA seed is not enabled in this environment.",
      403
    );
  }

  const guestSessionId = createGuestSessionId();
  const free = await createFreeFortune({
    raw: sampleInput,
    guestSessionId,
  });
  const created = await createOrderForGuest({
    guestSessionId,
    productId: input.productId,
    sourceResultId: free.freeResultId,
    paymentMethod: "TOSS",
    adminAuthenticatedCheckout: true,
  });
  await confirmTossPaymentForOwner({
    guestSessionId,
    orderIdParam: created.order.orderNo,
    paymentKey: `mock_pk_admin_seed_${created.order.orderNo}`,
    callbackAmount: created.order.amount,
  });
  await startPaidReportJob({
    orderId: created.order.id,
    runGeneration: true,
    forceRetry: true,
    actor: "qa",
    requestedProvider: "mock",
  });

  const order = await getOrderById(created.order.id);
  const report = await getReportByOrderId(created.order.id);
  if (!order || !report || report.generation_status !== "COMPLETED") {
    throw new FreeFlowError(
      "REPORT_NOT_READY",
      "Admin QA seed did not produce a completed report.",
      500
    );
  }

  const raw = report.result_json as {
    interpretationVersion?: string;
    reportRenderVersion?: string;
    generationMode?: string;
  };

  return {
    guestSessionId,
    orderId: order.id,
    reportId: report.id,
    interpretationVersion:
      raw.interpretationVersion ?? INTERPRETATION_VERSION_CONSULTING,
    reportRenderVersion:
      raw.reportRenderVersion ?? REPORT_RENDER_VERSION_CONSULTING,
    generationMode: raw.generationMode,
  };
}
