import Link from "next/link";
import { listRefundRequestsForAdmin } from "@/lib/repositories/refund-requests";
import { listOrdersForAdmin } from "@/lib/repositories/orders";
import { RefundRequestsPanel } from "@/components/admin/refund-requests-panel";

export const dynamic = "force-dynamic";

export const metadata = { title: "환불 신청 | Admin" };

export default async function AdminRefundRequestsPage() {
  const [rows, orders] = await Promise.all([
    listRefundRequestsForAdmin(100),
    listOrdersForAdmin(200),
  ]);
  const orderById = new Map(orders.map((o) => [o.id, o]));

  const items = rows.map((row) => {
    const order = orderById.get(row.order_id);
    return {
      id: row.id,
      orderId: row.order_id,
      orderNo: order?.order_no ?? "—",
      productName: order?.product_name_snapshot ?? null,
      amount: order?.amount ?? 0,
      reason: row.reason,
      screenshotDataUrl: row.screenshot_data_url,
      status: row.status,
      adminNote: row.admin_note,
      createdAt: row.created_at,
      decidedAt: row.decided_at,
    };
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">환불 신청</h1>
        <Link href="/admin/dashboard" className="text-sm underline">
          대시보드
        </Link>
      </div>
      <p className="mt-2 text-sm text-[var(--ink-muted)]">
        승인해도 이 시스템이 자동으로 환불하지 않습니다. 승인은 주문 상태만
        REFUNDED로 표시하며, 실제 결제 취소/계좌이체 환불은 토스 대시보드 또는
        은행 앱에서 직접 처리해야 합니다.
      </p>

      <RefundRequestsPanel items={items} />
    </div>
  );
}
