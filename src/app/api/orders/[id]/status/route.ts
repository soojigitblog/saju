import { NextResponse } from "next/server";
import { getGuestSessionId } from "@/lib/guest/cookie";
import { getOrderById, toOrderPublicDTO } from "@/lib/repositories/orders";
import { getReportByOrderId } from "@/lib/repositories/reports";
import { getBankTransferPublicAccount } from "@/lib/bank/account-public";
import { getBankPollerHealth } from "@/lib/repositories/bank-transactions";
import { isHanaAutomationEnabled } from "@/lib/bank/hana/playwright/config";
import {
  bankConnectionUserMessage,
  resolveBankConnectionLabel,
} from "@/lib/bank/connection-status";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json(
      { code: "INVALID_ORDER", message: "주문을 확인해 주세요." },
      { status: 400 }
    );
  }

  const guestSessionId = await getGuestSessionId();
  if (!guestSessionId) {
    return NextResponse.json(
      { code: "NO_SESSION", message: "세션이 없습니다." },
      { status: 401 }
    );
  }

  const order = await getOrderById(id);
  if (!order || order.guest_session_id !== guestSessionId) {
    return NextResponse.json(
      { code: "FORBIDDEN", message: "접근 권한이 없습니다." },
      { status: 403 }
    );
  }

  const report = await getReportByOrderId(order.id);
  const publicOrder = toOrderPublicDTO(order);

  const isPendingBank =
    order.payment_method === "BANK_TRANSFER" && order.status === "PENDING";

  let bankCheckDisconnected = false;
  let bankCheckUserMessage: string | null = null;
  if (isPendingBank && isHanaAutomationEnabled()) {
    const health = await getBankPollerHealth();
    const label = resolveBankConnectionLabel(health ?? null, true);
    bankCheckUserMessage = bankConnectionUserMessage(label);
    bankCheckDisconnected = Boolean(bankCheckUserMessage);
  }

  return NextResponse.json({
    order: publicOrder,
    report: report
      ? { id: report.id, generationStatus: report.generation_status }
      : null,
    bankAccount: isPendingBank ? getBankTransferPublicAccount() : null,
    depositorName: isPendingBank ? order.depositor_name : null,
    manualReviewRequired: isPendingBank,
    paymentCheckRequested: Boolean(order.payment_check_requested_at),
    bankCheckDisconnected,
    bankCheckUserMessage,
  });
}
