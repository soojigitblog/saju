import Link from "next/link";
import { listBankTransactionsForAdmin } from "@/lib/repositories/bank-transactions";
import { getBankPollerHealth } from "@/lib/repositories/bank-transactions";
import { listPendingBankTransferOrders } from "@/lib/repositories/orders";
import { formatKRW } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "입금확인 | Admin" };

export default async function AdminBankDepositsPage() {
  const [txs, pending, health] = await Promise.all([
    listBankTransactionsForAdmin(40),
    listPendingBankTransferOrders(),
    getBankPollerHealth(),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">입금확인</h1>
        <Link href="/admin/orders" className="text-sm underline">
          주문
        </Link>
      </div>

      <section className="mt-8 rounded border p-4 text-sm">
        <p className="font-medium">Bank Poller</p>
        <p className="mt-2 text-muted-foreground">
          상태: {health?.status ?? "—"} · 마지막 성공:{" "}
          {health?.last_success_at ?? "—"} · 조회{" "}
          {health?.last_fetched_count ?? 0} · 매칭{" "}
          {health?.last_matched_count ?? 0} · 확인필요{" "}
          {health?.last_ambiguous_count ?? 0}
        </p>
        {health?.last_error_safe ? (
          <p className="mt-1 text-amber-700">오류: {health.last_error_safe}</p>
        ) : null}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-medium">대기 주문 ({pending.length})</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {pending.map((o) => (
            <li key={o.id} className="rounded border px-3 py-2">
              {o.order_no} · {o.product_name_snapshot} · {formatKRW(o.amount)} ·
              입금자 {o.depositor_name ?? "—"}
            </li>
          ))}
          {pending.length === 0 ? (
            <li className="text-muted-foreground">대기 주문 없음</li>
          ) : null}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-medium">입금 내역</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {txs.map((t) => (
            <li key={t.id} className="rounded border px-3 py-2">
              <span className="font-medium">{t.match_status}</span> ·{" "}
              {formatKRW(t.amount)} · {t.depositor_name_masked ?? "—"} ·{" "}
              {new Date(t.occurred_at).toLocaleString("ko-KR")}
              {t.matched_order_id ? (
                <span className="text-muted-foreground">
                  {" "}
                  · order {t.matched_order_id.slice(0, 8)}…
                </span>
              ) : null}
            </li>
          ))}
          {txs.length === 0 ? (
            <li className="text-muted-foreground">내역 없음</li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
