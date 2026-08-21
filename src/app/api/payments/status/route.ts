import { NextResponse } from "next/server";
import { z } from "zod";
import { getGuestSessionId } from "@/lib/guest/cookie";
import { getOrderById, toOrderPublicDTO } from "@/lib/repositories/orders";
import { getReportByOrderId } from "@/lib/repositories/reports";
import { FreeFlowError } from "@/lib/services/free-flow-errors";
import { assertSameOrigin } from "@/lib/security/same-origin";
import { retryPaidReportGeneration } from "@/lib/services/paid-report-job";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  orderId: z.string().uuid(),
});

/** Poll payment/fulfillment status for success page refresh. */
export async function GET(request: Request) {
  try {
    assertSameOrigin(request);
  } catch {
    // GET may omit Origin — allow same host navigations
  }

  const url = new URL(request.url);
  const orderId = url.searchParams.get("orderId");
  if (!orderId || !/^[0-9a-f-]{36}$/i.test(orderId)) {
    return NextResponse.json(
      { code: "INVALID_ORDER", message: "주문을 확인해 주세요." },
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

    const order = await getOrderById(orderId);
    if (!order || order.guest_session_id !== guestSessionId) {
      return NextResponse.json(
        { code: "FORBIDDEN", message: "접근 권한이 없습니다." },
        { status: 403 }
      );
    }

    const report = await getReportByOrderId(order.id);

    return NextResponse.json({
      order: toOrderPublicDTO(order),
      report: report
        ? {
            id: report.id,
            generationStatus: report.generation_status,
          }
        : null,
    });
  } catch {
    return NextResponse.json(
      { code: "INTERNAL", message: "상태 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
  } catch {
    return NextResponse.json(
      { code: "FORBIDDEN", message: "잘못된 요청입니다." },
      { status: 403 }
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
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

    const result = await retryPaidReportGeneration({
      orderId: parsed.data.orderId,
      guestSessionId,
    });

    return NextResponse.json({
      reportId: result.reportId,
      status: result.status,
    });
  } catch (error) {
    if (error instanceof FreeFlowError) {
      return NextResponse.json(
        { code: error.code, message: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { code: "INTERNAL", message: "재시도에 실패했습니다." },
      { status: 500 }
    );
  }
}
