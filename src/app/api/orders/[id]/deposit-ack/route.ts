import { NextResponse } from "next/server";
import { getGuestSessionId } from "@/lib/guest/cookie";
import {
  getOrderById,
  markPaymentCheckNotified,
  markPaymentCheckRequested,
} from "@/lib/repositories/orders";
import { assertSameOrigin } from "@/lib/security/same-origin";
import { trackEvent } from "@/lib/repositories/analytics";
import { runBankPollCycle } from "@/lib/services/bank-poller";
import { isHanaAutomationEnabled } from "@/lib/bank/hana/playwright/config";
import { notifyDepositCheckRequested } from "@/lib/notifications";

export const dynamic = "force-dynamic";

/**
 * User tapped "입금했어요" — does NOT mark PAID.
 * Records request + Telegram admin alert (deduped) + optional bank poll.
 */
export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    assertSameOrigin(_request);
  } catch {
    return NextResponse.json(
      { code: "FORBIDDEN", message: "잘못된 요청입니다." },
      { status: 403 }
    );
  }

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

  if (order.status !== "PENDING") {
    return NextResponse.json({
      ok: true,
      alreadyResolved: true,
      status: order.status,
      message:
        order.status === "COMPLETED" || order.status === "GENERATING"
          ? "입금이 확인되었습니다."
          : "이미 처리된 주문입니다.",
    });
  }

  if (order.payment_check_requested_at) {
    return NextResponse.json({
      ok: true,
      alreadyRequested: true,
      status: order.status,
      paymentCheckRequested: true,
      message: "이미 입금 확인 요청을 보냈어요.",
    });
  }

  const updated = await markPaymentCheckRequested(order.id);
  const requestedAt =
    updated.payment_check_requested_at ?? new Date().toISOString();

  try {
    await trackEvent({
      sessionId: guestSessionId,
      eventName: "bank_deposit_ack",
      productId: order.product_id,
      metadata: {
        orderId: order.id,
        orderNo: order.order_no,
        amount: order.amount,
      },
    });
  } catch {
    /* best-effort */
  }

  // Telegram must not fail the user request
  let notificationSent = false;
  try {
    const result = await notifyDepositCheckRequested({
      orderNo: order.order_no,
      productName: order.product_name_snapshot,
      amount: order.amount,
      depositorName: order.depositor_name,
      requestedAt,
    });
    if (result.sent > 0) {
      notificationSent = true;
      try {
        await markPaymentCheckNotified(order.id);
      } catch {
        /* notify succeeded; stamp is best-effort */
      }
    }
  } catch {
    console.error("[deposit-ack] admin notification failed", {
      orderId: order.id,
    });
  }

  let pollTriggered = false;
  let bankCheckDisconnected = false;
  let message =
    "입금 확인 요청을 보냈어요. 확인되면 알려드릴게요.";

  if (isHanaAutomationEnabled()) {
    pollTriggered = true;
    try {
      const cycle = await runBankPollCycle();
      if (
        cycle.errorSafe === "HANA_SESSION_EXPIRED" ||
        cycle.errorSafe === "AUTH_REQUIRED" ||
        cycle.errorSafe === "LOGIN_REQUIRED" ||
        cycle.errorSafe === "CAPTCHA_REQUIRED"
      ) {
        bankCheckDisconnected = true;
        message =
          "입금 확인 요청을 보냈어요. 운영자가 확인하면 자동으로 진행됩니다.";
      } else if (cycle.ok) {
        message =
          "입금 내역을 확인하고 있어요. 확인되면 자동으로 갱신됩니다.";
      }
    } catch {
      message =
        "입금 확인 요청을 보냈어요. 운영자가 확인하면 자동으로 진행됩니다.";
    }
  }

  return NextResponse.json({
    ok: true,
    alreadyRequested: false,
    status: order.status,
    paymentCheckRequested: true,
    notificationSent,
    pollTriggered,
    bankCheckDisconnected,
    message,
  });
}
