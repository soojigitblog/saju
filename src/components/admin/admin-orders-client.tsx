"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { formatKRW } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const STATUSES = [
  "PENDING",
  "PAID",
  "GENERATING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
] as const;

export type AdminOrderRow = {
  id: string;
  orderNo: string;
  productName: string | null;
  amount: number;
  paymentMethod: string;
  createdAt: string;
  paidAt: string | null;
  status: string;
};

export function AdminOrdersClient({
  orders,
  status,
  orderNo,
}: {
  orders: AdminOrderRow[];
  status: string;
  orderNo: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function apply(next: { status?: string; q?: string }) {
    const p = new URLSearchParams(searchParams.toString());
    if (next.status !== undefined) {
      if (next.status) p.set("status", next.status);
      else p.delete("status");
    }
    if (next.q !== undefined) {
      if (next.q) p.set("q", next.q);
      else p.delete("q");
    }
    router.push(`/admin/orders?${p.toString()}`);
  }

  return (
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-display)] text-2xl text-[var(--admin-gold)]">
        주문
      </h1>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={!status ? "default" : "outline"}
            onClick={() => apply({ status: "" })}
          >
            전체
          </Button>
          {STATUSES.map((s) => (
            <Button
              key={s}
              size="sm"
              variant={status === s ? "default" : "outline"}
              onClick={() => apply({ status: s })}
            >
              {s}
            </Button>
          ))}
        </div>
        <form
          className="flex flex-1 gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            apply({ q: String(fd.get("q") ?? "") });
          }}
        >
          <Input
            name="q"
            defaultValue={orderNo}
            placeholder="주문번호 검색"
            className="max-w-xs"
          />
          <Button type="submit" size="sm" variant="outline">
            검색
          </Button>
        </form>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[var(--admin-line)]">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-[var(--admin-panel)] text-[var(--admin-muted)]">
            <tr>
              <th className="px-3 py-2 font-medium">주문번호</th>
              <th className="px-3 py-2 font-medium">상품</th>
              <th className="px-3 py-2 font-medium">금액</th>
              <th className="px-3 py-2 font-medium">결제</th>
              <th className="px-3 py-2 font-medium">주문일</th>
              <th className="px-3 py-2 font-medium">결제일</th>
              <th className="px-3 py-2 font-medium">상태</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-[var(--admin-line)]">
                <td className="px-3 py-2 font-mono text-xs">{o.orderNo}</td>
                <td className="px-3 py-2">{o.productName ?? "—"}</td>
                <td className="px-3 py-2">{formatKRW(o.amount)}</td>
                <td className="px-3 py-2">{o.paymentMethod}</td>
                <td className="px-3 py-2 text-[var(--admin-muted)]">
                  {new Date(o.createdAt).toLocaleString("ko-KR")}
                </td>
                <td className="px-3 py-2 text-[var(--admin-muted)]">
                  {o.paidAt ? new Date(o.paidAt).toLocaleString("ko-KR") : "—"}
                </td>
                <td className="px-3 py-2">
                  <span className="rounded bg-[var(--admin-accent-soft)] px-2 py-0.5 text-xs text-[var(--admin-gold)]">
                    {o.status}
                  </span>
                </td>
              </tr>
            ))}
            {orders.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-6 text-[var(--admin-muted)]"
                >
                  주문 없음
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
