import { Suspense } from "react";
import { listOrdersForAdmin } from "@/lib/repositories/orders";
import { AdminOrdersClient } from "@/components/admin/admin-orders-client";
import type { Order } from "@/lib/repositories/orders";

export const dynamic = "force-dynamic";
export const metadata = { title: "주문 | Admin" };

const ALLOWED = new Set([
  "PENDING",
  "PAID",
  "GENERATING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
]);

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const status =
    sp.status && ALLOWED.has(sp.status)
      ? (sp.status as Order["status"])
      : undefined;
  const orderNo = sp.q?.trim() ?? "";

  const orders = await listOrdersForAdmin(100, { status, orderNo });

  return (
    <Suspense fallback={<p className="text-sm text-[var(--admin-muted)]">로딩…</p>}>
      <AdminOrdersClient
        status={status ?? ""}
        orderNo={orderNo}
        orders={orders.map((o) => ({
          id: o.id,
          orderNo: o.order_no,
          productName: o.product_name_snapshot,
          amount: o.amount,
          paymentMethod: o.payment_method ?? "BANK_TRANSFER",
          createdAt: o.created_at,
          paidAt: o.paid_at,
          status: o.status,
        }))}
      />
    </Suspense>
  );
}
