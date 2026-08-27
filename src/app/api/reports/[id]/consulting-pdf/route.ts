import { NextResponse } from "next/server";
import { tryAdminRequest } from "@/lib/admin/manual-auth";
import { getGuestSessionId } from "@/lib/guest/cookie";
import { trackEvent } from "@/lib/repositories/analytics";
import {
  getPaidReportForAdmin,
  getPaidReportForOwner,
} from "@/lib/services/get-paid-report";
import { FreeFlowError } from "@/lib/services/free-flow-errors";
import { serveConsultingPdf } from "@/lib/services/serve-consulting-pdf";
import { REPORT_RENDER_VERSION_CONSULTING } from "@/lib/report/paid-report-versions";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const url = new URL(request.url);
  const accessToken = url.searchParams.get("access");

  try {
    const adminAuth = await tryAdminRequest(request);
    const accessActor = adminAuth ? "admin" : "customer";

    const { order, report } = adminAuth
      ? await getPaidReportForAdmin({ reportOrOrderId: id })
      : await getPaidReportForOwner({
          reportOrOrderId: id,
          guestSessionId: (await getGuestSessionId()) ?? null,
          accessToken,
        });

    const served = await serveConsultingPdf({
      order,
      report,
      accessActor,
    });

    try {
      await trackEvent({
        sessionId: order.guest_session_id ?? order.id,
        eventName: "paid_pdf_opened",
        productId: order.product_id,
        metadata: {
          orderId: order.id,
          reportId: report.id,
          renderVersion: REPORT_RENDER_VERSION_CONSULTING,
          accessActor,
        },
      });
    } catch {
      /* best-effort */
    }

    return new NextResponse(new Uint8Array(served.pdfBuffer), {
      status: 200,
      headers: {
        ...served.headers,
        "X-Paid-Report-Pdf-Entry": "generatePaidReportPdf",
        "X-Report-Access-Actor": accessActor,
      },
    });
  } catch (error) {
    if (error instanceof FreeFlowError) {
      return NextResponse.json(
        { code: error.code, message: error.message },
        { status: error.status, headers: { "Cache-Control": "private, no-store" } }
      );
    }
    console.error("[consulting-pdf] generation failed", {
      reportId: id,
      requestId: crypto.randomUUID(),
    });
    return NextResponse.json(
      { code: "INTERNAL", message: "PDF를 생성하지 못했습니다." },
      { status: 500, headers: { "Cache-Control": "private, no-store" } }
    );
  }
}
