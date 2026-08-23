import { NextResponse } from "next/server";
import { getGuestSessionId } from "@/lib/guest/cookie";
import {
  listOrdersForGuestSession,
  toOrderPublicDTO,
} from "@/lib/repositories/orders";
import { getReportByOrderId } from "@/lib/repositories/reports";

export const dynamic = "force-dynamic";

export async function GET() {
  const guestSessionId = await getGuestSessionId();
  if (!guestSessionId) {
    return NextResponse.json(
      { code: "NO_SESSION", message: "세션이 없습니다." },
      { status: 401 }
    );
  }

  const orders = await listOrdersForGuestSession(guestSessionId);
  const items = await Promise.all(
    orders.map(async (order) => {
      const report = await getReportByOrderId(order.id);
      return {
        order: toOrderPublicDTO(order),
        report: report
          ? { id: report.id, generationStatus: report.generation_status }
          : null,
        paymentUrl:
          order.payment_method === "BANK_TRANSFER" &&
          (order.status === "PENDING" || order.status === "EXPIRED")
            ? `/payment/bank/${order.id}`
            : null,
        reportUrl:
          report && report.generation_status === "COMPLETED"
            ? `/report/${report.id}`
            : order.status === "COMPLETED" && report
              ? `/report/${report.id}`
              : null,
      };
    })
  );

  return NextResponse.json({ orders: items });
}
