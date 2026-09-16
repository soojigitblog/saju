import "server-only";

import { FreeFlowError } from "@/lib/services/free-flow-errors";
import { hashOrderAccessToken } from "@/lib/orders/access-token";
import { getOrderByAccessTokenHash } from "@/lib/repositories/orders";
import { getReportByOrderId } from "@/lib/repositories/reports";

export type RestoreOrderAccessResult = {
  orderId: string;
  orderNo: string;
  status: string;
  paid: boolean;
  waitUrl: string;
  reportUrl: string | null;
};

/**
 * Guest restore: raw access token → order. Hash only is stored.
 * Works across devices because the customer saved the token at checkout/wait.
 */
export async function restoreOrderByAccessToken(
  rawToken: string
): Promise<RestoreOrderAccessResult> {
  const token = rawToken.trim();
  if (token.length < 16 || token.length > 128) {
    throw new FreeFlowError(
      "INVALID_ACCESS_TOKEN",
      "결과 보관 코드를 확인해 주세요.",
      400
    );
  }

  const order = await getOrderByAccessTokenHash(hashOrderAccessToken(token));
  if (!order) {
    throw new FreeFlowError(
      "NOT_FOUND",
      "해당 코드로 주문을 찾지 못했습니다.",
      404
    );
  }

  const report = order.paid_at ? await getReportByOrderId(order.id) : null;
  const reportReady =
    report &&
    (order.status === "COMPLETED" || report.generation_status === "COMPLETED");

  return {
    orderId: order.id,
    orderNo: order.order_no,
    status: order.status,
    paid: Boolean(order.paid_at),
    waitUrl: `/payment/bank/${order.id}`,
    reportUrl: reportReady ? `/report/${report.id}` : null,
  };
}
