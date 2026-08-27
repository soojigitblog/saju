import { NextResponse } from "next/server";
import { getGuestSessionId } from "@/lib/guest/cookie";
import { generatePaidReportPdf } from "@/lib/report/generate-paid-report-pdf";
import { REPORT_RENDER_VERSION_CONSULTING } from "@/lib/report/paid-report-versions";
import { trackEvent } from "@/lib/repositories/analytics";
import { getPaidReportForOwner } from "@/lib/services/get-paid-report";
import { FreeFlowError } from "@/lib/services/free-flow-errors";
import { loadConsultingReportRenderContext } from "@/lib/services/load-consulting-report-render";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const url = new URL(request.url);
  const accessToken = url.searchParams.get("access");

  try {
    const guestSessionId = await getGuestSessionId();
    const { order, report } = await getPaidReportForOwner({
      reportOrOrderId: id,
      guestSessionId: guestSessionId ?? null,
      accessToken,
    });

    const renderCtx = await loadConsultingReportRenderContext({ order, report });
    const { html } = generatePaidReportPdf({
      nickname: renderCtx.nickname,
      productName: renderCtx.productName,
      productSlug: renderCtx.productSlug,
      report: renderCtx.report,
      chart: renderCtx.chart,
      live: renderCtx.live,
    });

    try {
      await trackEvent({
        sessionId: order.guest_session_id ?? order.id,
        eventName: "paid_report_viewed",
        productId: order.product_id,
        metadata: {
          orderId: order.id,
          reportId: report.id,
          renderVersion: REPORT_RENDER_VERSION_CONSULTING,
        },
      });
    } catch {
      /* best-effort */
    }

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, no-store",
        "X-Report-Render-Version": REPORT_RENDER_VERSION_CONSULTING,
      },
    });
  } catch (error) {
    if (error instanceof FreeFlowError) {
      return NextResponse.json(
        { code: error.code, message: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { code: "INTERNAL", message: "리포트를 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}
