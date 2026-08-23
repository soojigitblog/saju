import { NextResponse } from "next/server";
import { getGuestSessionId } from "@/lib/guest/cookie";
import {
  getOrderById,
  markPaymentCheckRequested,
} from "@/lib/repositories/orders";
import { assertSameOrigin } from "@/lib/security/same-origin";
import { trackEvent } from "@/lib/repositories/analytics";
import { runBankPollCycle } from "@/lib/services/bank-poller";
import { isHanaAutomationEnabled } from "@/lib/bank/hana/playwright/config";

export const dynamic = "force-dynamic";

/**
 * User tapped "입금했어요" — does NOT mark PAID.
 * Records request + triggers one bank poll when automation is enabled.
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

  await markPaymentCheckRequested(order.id);

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

  let pollTriggered = false;
  let bankCheckDisconnected = false;
  let message =
    "입금 확인 요청을 받았습니다. 하나은행 자동 조회가 연결되면 곧 확인됩니다.";

  if (isHanaAutomationEnabled()) {
    pollTriggered = true;
    try {
      const cycle = await runBankPollCycle();
      if (
        cycle.errorSafe === "HANA_SESSION_EXPIRED" ||
        cycle.errorSafe === "AUTH_REQUIRED"
      ) {
        bankCheckDisconnected = true;
        message =
          "입금 확인 시스템 연결이 잠시 끊겼습니다.\n입금하셨다면 주문은 그대로 유지됩니다.";
      } else if (cycle.ok) {
        message =
          "입금 내역을 확인하고 있어요. 확인되면 자동으로 갱신됩니다.";
      } else {
        message =
          "입금 확인 요청을 받았습니다. 확인되면 자동으로 갱신됩니다.";
      }
    } catch {
      message =
        "입금 확인 요청을 받았습니다. 확인되면 자동으로 갱신됩니다.";
    }
  }

  return NextResponse.json({
    ok: true,
    alreadyResolved: false,
    status: order.status,
    pollTriggered,
    bankCheckDisconnected,
    message,
  });
}
