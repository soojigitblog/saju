import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { getGuestSessionId } from "@/lib/guest/cookie";
import { confirmPaymentForOwner } from "@/lib/services/confirm-payment";
import { FreeFlowError } from "@/lib/services/free-flow-errors";
import { assertSameOrigin } from "@/lib/security/same-origin";
import { trackEvent } from "@/lib/repositories/analytics";

export const dynamic = "force-dynamic";

const MAX_BODY = 4_096;

const bodySchema = z.object({
  paymentKey: z.string().min(8).max(200),
  orderId: z.string().min(6).max(64),
  amount: z.number().int().nonnegative(),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
  } catch {
    return NextResponse.json(
      { code: "FORBIDDEN", message: "잘못된 요청입니다." },
      { status: 403 }
    );
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > MAX_BODY) {
    return NextResponse.json(
      { code: "PAYLOAD_TOO_LARGE", message: "요청이 너무 큽니다." },
      { status: 413 }
    );
  }

  let raw: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY) {
      return NextResponse.json(
        { code: "PAYLOAD_TOO_LARGE", message: "요청이 너무 큽니다." },
        { status: 413 }
      );
    }
    raw = JSON.parse(text);
  } catch {
    return NextResponse.json(
      { code: "INVALID_JSON", message: "잘못된 요청입니다." },
      { status: 400 }
    );
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { code: "INVALID_BODY", message: "요청 값이 올바르지 않습니다." },
      { status: 400 }
    );
  }

  try {
    const guestSessionId = await getGuestSessionId();
    if (!guestSessionId) {
      return NextResponse.json(
        { code: "NO_SESSION", message: "세션이 없습니다." },
        { status: 401 }
      );
    }

    const jar = await cookies();
    const analyticsId =
      jar.get("fortune_analytics_session")?.value ?? guestSessionId;

    const result = await confirmPaymentForOwner({
      guestSessionId,
      orderIdParam: parsed.data.orderId,
      paymentKey: parsed.data.paymentKey,
      callbackAmount: parsed.data.amount,
      analyticsSessionId: analyticsId,
    });

    return NextResponse.json({
      orderId: result.order.id,
      orderNo: result.order.orderNo,
      status: result.order.status,
      amount: result.order.amount,
      productName: result.order.productName,
      reportId: result.reportId,
      alreadyPaid: result.alreadyPaid,
      // accessToken returned once for guest report access (optional cookie set client-side)
      accessToken: result.accessToken,
    });
  } catch (error) {
    if (error instanceof FreeFlowError) {
      try {
        const jar = await cookies();
        const sid =
          jar.get("fortune_analytics_session")?.value ??
          (await getGuestSessionId()) ??
          "unknown";
        await trackEvent({
          sessionId: sid,
          eventName: "payment_fail",
          metadata: { code: error.code },
        });
      } catch {
        /* best-effort */
      }
      return NextResponse.json(
        { code: error.code, message: error.message },
        { status: error.status }
      );
    }
    if (
      error instanceof Error &&
      (error as Error & { code?: string }).code === "RATE_LIMITED"
    ) {
      return NextResponse.json(
        {
          code: "RATE_LIMITED",
          message: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
        },
        { status: 429 }
      );
    }
    console.error("[payments/confirm] failed", {
      requestId: crypto.randomUUID(),
    });
    return NextResponse.json(
      { code: "INTERNAL", message: "결제 승인 중 문제가 발생했습니다." },
      { status: 500 }
    );
  }
}
