import "server-only";

import { FreeFlowError } from "@/lib/services/free-flow-errors";
import { getOrderById } from "@/lib/repositories/orders";
import { getReportById, getReportByOrderId } from "@/lib/repositories/reports";
import { hashOrderAccessToken } from "@/lib/orders/access-token";
import type { Report } from "@/lib/repositories/reports";
import type { Order } from "@/lib/repositories/orders";

export type PaidReportAccess = {
  order: Order;
  report: Report;
};

/**
 * Guest may access paid report if:
 * - guest_session_id matches cookie, OR
 * - access token hash matches (issued at payment confirm)
 */
export async function getPaidReportForOwner(input: {
  reportOrOrderId: string;
  guestSessionId: string | null;
  accessToken?: string | null;
}): Promise<PaidReportAccess> {
  let report =
    (await getReportById(input.reportOrOrderId)) ??
    (await getReportByOrderId(input.reportOrOrderId));

  let order: Order | null = null;
  if (report) {
    order = await getOrderById(report.order_id);
  } else {
    order = await getOrderById(input.reportOrOrderId);
    if (order) {
      report = await getReportByOrderId(order.id);
    }
  }

  if (!order || !report) {
    throw new FreeFlowError("NOT_FOUND", "리포트를 찾을 수 없습니다.", 404);
  }

  if (!order.paid_at) {
    throw new FreeFlowError("FORBIDDEN", "결제된 리포트가 아닙니다.", 403);
  }

  const guestOk =
    !!input.guestSessionId &&
    order.guest_session_id === input.guestSessionId;

  let tokenOk = false;
  if (input.accessToken && order.access_token_hash) {
    tokenOk =
      hashOrderAccessToken(input.accessToken) === order.access_token_hash;
  }

  if (!guestOk && !tokenOk) {
    throw new FreeFlowError("FORBIDDEN", "접근 권한이 없습니다.", 403);
  }

  return { order, report };
}
