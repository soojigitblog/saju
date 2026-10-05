import "server-only";

import { FreeFlowError } from "@/lib/services/free-flow-errors";
import {
  getOrderById,
  getOrderByOrderNo,
  markOrderPaidIfPending,
  toOrderPublicDTO,
  type Order,
  type OrderPublicDTO,
} from "@/lib/repositories/orders";
import {
  createPaymentIdempotent,
  getPaymentByPaymentKey,
  getPaymentsByOrderId,
} from "@/lib/repositories/payments";
import { getProductById } from "@/lib/repositories/products";
import { getPaymentProvider } from "@/lib/payments";
import {
  PaymentConfirmError,
  type ConfirmedPayment,
} from "@/lib/payments/provider";
import { createOrderAccessToken } from "@/lib/orders/access-token";
import { assertPaymentMutationRateLimit } from "@/lib/payments/rate-limit";
import { startPaidReportJob } from "@/lib/services/paid-report-job";
import { trackEvent } from "@/lib/repositories/analytics";
import { notifyPaidOrderConfirmed } from "@/lib/notifications";
import type { Json } from "@/types/database.types";

export type ConfirmPaymentResult = {
  order: OrderPublicDTO;
  reportId: string | null;
  accessToken: string | null;
  alreadyPaid: boolean;
};

function assertOrderOwner(order: Order, guestSessionId: string): void {
  if (order.guest_session_id !== guestSessionId) {
    throw new FreeFlowError("FORBIDDEN", "접근 권한이 없습니다.", 403);
  }
}

/**
 * Server confirm — never trust client amount as source of truth.
 * DB order.amount is authoritative; callback + provider must match.
 */
export async function confirmPaymentForOwner(input: {
  guestSessionId: string;
  /** Toss orderId (= order_no) or internal order UUID */
  orderIdParam: string;
  paymentKey: string;
  callbackAmount: number;
  analyticsSessionId?: string;
}): Promise<ConfirmPaymentResult> {
  assertPaymentMutationRateLimit({
    bucket: "payment_confirm",
    guestSessionId: input.guestSessionId,
  });

  if (!input.paymentKey || input.paymentKey.length > 200) {
    throw new FreeFlowError(
      "PAYMENT_INVALID_KEY",
      "유효하지 않은 결제 정보입니다.",
      400
    );
  }

  if (
    !Number.isInteger(input.callbackAmount) ||
    input.callbackAmount < 0
  ) {
    throw new FreeFlowError(
      "PAYMENT_AMOUNT_MISMATCH",
      "결제 금액이 일치하지 않습니다.",
      400
    );
  }

  const order =
    (await getOrderByOrderNo(input.orderIdParam)) ??
    (await getOrderById(input.orderIdParam));

  if (!order) {
    throw new FreeFlowError("NOT_FOUND", "주문을 찾을 수 없습니다.", 404);
  }

  assertOrderOwner(order, input.guestSessionId);

  // --- Idempotency: already PAID with same payment ---
  if (
    order.status === "PAID" ||
    order.status === "GENERATING" ||
    order.status === "COMPLETED" ||
    order.status === "FAILED"
  ) {
    const existingByKey = await getPaymentByPaymentKey(input.paymentKey);
    if (existingByKey && existingByKey.order_id === order.id) {
      const report = await startPaidReportJob({
        orderId: order.id,
        triggerOnly: true,
      });
      return {
        order: toOrderPublicDTO(order),
        reportId: report.reportId,
        accessToken: null,
        alreadyPaid: true,
      };
    }

    const payments = await getPaymentsByOrderId(order.id);
    const approved = payments.find((p) => p.approved_at);
    if (approved && approved.payment_key !== input.paymentKey) {
      throw new FreeFlowError(
        "PAYMENT_CONFLICT",
        "이미 다른 결제로 완료된 주문입니다.",
        409
      );
    }
    if (approved) {
      const report = await startPaidReportJob({
        orderId: order.id,
        triggerOnly: true,
      });
      return {
        order: toOrderPublicDTO(order),
        reportId: report.reportId,
        accessToken: null,
        alreadyPaid: true,
      };
    }

    // PAID/GENERATING/COMPLETED/FAILED without matching payment row — treat as paid funnel
    return {
      order: toOrderPublicDTO(order),
      reportId: null,
      accessToken: null,
      alreadyPaid: true,
    };
  }

  if (order.status !== "PENDING") {
    throw new FreeFlowError(
      "ORDER_NOT_PAYABLE",
      "결제할 수 없는 주문 상태입니다.",
      400
    );
  }

  // DB amount is the only trusted price.
  if (input.callbackAmount !== order.amount) {
    throw new FreeFlowError(
      "PAYMENT_AMOUNT_MISMATCH",
      "결제 금액이 일치하지 않습니다.",
      400
    );
  }

  // Product still ACTIVE check is soft at confirm — order snapshot already locked amount.
  const product = await getProductById(order.product_id);
  if (!product) {
    throw new FreeFlowError("NOT_FOUND", "상품을 찾을 수 없습니다.", 404);
  }

  // Existing payment_key → return success without re-confirming Toss
  const byKey = await getPaymentByPaymentKey(input.paymentKey);
  if (byKey) {
    if (byKey.order_id !== order.id) {
      throw new FreeFlowError(
        "PAYMENT_CONFLICT",
        "결제 정보가 올바르지 않습니다.",
        409
      );
    }
    const report = await startPaidReportJob({
      orderId: order.id,
      triggerOnly: true,
    });
    return {
      order: toOrderPublicDTO(
        (await getOrderById(order.id)) ?? order
      ),
      reportId: report.reportId,
      accessToken: null,
      alreadyPaid: true,
    };
  }

  let confirmed: ConfirmedPayment;
  try {
    const provider = getPaymentProvider();
    confirmed = await provider.confirm({
      paymentKey: input.paymentKey,
      orderId: order.order_no,
      amount: order.amount,
    });
  } catch (error) {
    if (error instanceof PaymentConfirmError) {
      if (error.code === "PAYMENT_ALREADY_PROCESSED") {
        // Provider says already done — still need local persistence path carefully.
        // Do not mark PAID without verified amounts from our DB match.
        throw new FreeFlowError(
          error.code,
          "이미 처리된 결제입니다. 주문 상태를 확인해 주세요.",
          409
        );
      }
      throw new FreeFlowError(error.code, error.message, error.status);
    }
    throw error;
  }

  if (confirmed.approvedAmount !== order.amount) {
    throw new FreeFlowError(
      "PAYMENT_AMOUNT_MISMATCH",
      "결제 금액이 일치하지 않습니다.",
      400
    );
  }
  if (confirmed.orderId !== order.order_no) {
    throw new FreeFlowError(
      "PAYMENT_CONFLICT",
      "주문 정보가 일치하지 않습니다.",
      400
    );
  }

  const { rawToken, tokenHash } = createOrderAccessToken();
  const paidAt = confirmed.approvedAt ?? new Date().toISOString();

  const { payment, created } = await createPaymentIdempotent({
    order_id: order.id,
    provider: confirmed.provider as "TOSS" | "PORTONE" | "KAKAO" | "NAVER",
    payment_key: confirmed.paymentKey,
    payment_method: confirmed.method,
    provider_status: confirmed.status,
    amount: confirmed.approvedAmount,
    requested_amount: order.amount,
    approved_amount: confirmed.approvedAmount,
    provider_order_id: order.order_no,
    approved_at: paidAt,
    raw_response: confirmed.redactedRaw as Json,
  });

  if (!created && payment.order_id === order.id) {
    const report = await startPaidReportJob({
      orderId: order.id,
      triggerOnly: true,
    });
    return {
      order: toOrderPublicDTO((await getOrderById(order.id)) ?? order),
      reportId: report.reportId,
      accessToken: null,
      alreadyPaid: true,
    };
  }

  const paidOrder = await markOrderPaidIfPending({
    orderId: order.id,
    paidAt,
    accessTokenHash: tokenHash,
  });

  if (!paidOrder) {
    // Race: another confirm won — ensure we don't double-generate
    const latest = await getOrderById(order.id);
    if (
      latest &&
      (latest.status === "PAID" ||
        latest.status === "GENERATING" ||
        latest.status === "COMPLETED" ||
        latest.status === "FAILED")
    ) {
      const report = await startPaidReportJob({
        orderId: order.id,
        triggerOnly: true,
      });
      return {
        order: toOrderPublicDTO(latest),
        reportId: report.reportId,
        accessToken: null,
        alreadyPaid: true,
      };
    }
    throw new FreeFlowError(
      "PAYMENT_CONFLICT",
      "결제 처리 중 충돌이 발생했습니다.",
      409
    );
  }

  try {
    await trackEvent({
      sessionId: input.analyticsSessionId ?? input.guestSessionId,
      eventName: "payment_success",
      productId: order.product_id,
      metadata: {
        orderId: order.id,
        amount: order.amount,
      },
    });
  } catch {
    /* best-effort */
  }

  // Payment is durable before AI — never reverse PAID if AI fails.
  const report = await startPaidReportJob({
    orderId: paidOrder.id,
    runGeneration: true,
  });

  try {
    await notifyPaidOrderConfirmed({
      orderNo: paidOrder.order_no,
      productName: paidOrder.product_name_snapshot ?? product.name,
      paidAt: paidOrder.paid_at ?? paidAt,
    });
  } catch {
    /* best-effort */
  }

  return {
    order: toOrderPublicDTO(paidOrder),
    reportId: report.reportId,
    accessToken: rawToken,
    alreadyPaid: false,
  };
}

/** Legacy QA helper name; provider selection remains server-side. */
export const confirmTossPaymentForOwner = confirmPaymentForOwner;

/**
 * Toss webhook fallback. The webhook payload is not treated as payment proof:
 * this delegates to the normal provider confirmation with the server-side
 * Toss secret before any order or report state can change.
 */
export async function confirmTossPaymentFromWebhook(input: {
  orderNo: string;
  paymentKey: string;
  amount: number;
}): Promise<ConfirmPaymentResult> {
  const order = await getOrderByOrderNo(input.orderNo);
  if (!order) {
    throw new FreeFlowError("NOT_FOUND", "주문을 찾을 수 없습니다.", 404);
  }
  if (!order.guest_session_id) {
    throw new FreeFlowError(
      "ORDER_OWNER_MISSING",
      "주문 소유 정보를 확인할 수 없습니다.",
      409
    );
  }
  const guestSessionId = order.guest_session_id;
  return confirmPaymentForOwner({
    guestSessionId,
    orderIdParam: order.order_no,
    paymentKey: input.paymentKey,
    callbackAmount: input.amount,
    analyticsSessionId: guestSessionId,
  });
}
