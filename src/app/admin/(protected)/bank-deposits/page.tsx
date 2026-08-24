import Link from "next/link";
import {
  listBankTransactionsForAdmin,
  getBankPollerHealth,
} from "@/lib/repositories/bank-transactions";
import {
  listOrdersForAdmin,
  listPendingBankTransferOrders,
} from "@/lib/repositories/orders";
import { listReportsForAdmin } from "@/lib/repositories/reports";
import { formatKRW } from "@/lib/utils";
import { BankDepositsPanel } from "@/components/admin/bank-deposits-panel";
import { isBankTransferAccountConfigured } from "@/lib/bank/account-public";

export const dynamic = "force-dynamic";
export const metadata = { title: "입금확인 | Admin" };

export default async function AdminBankDepositsPage() {
  const [txs, pending, reports, allOrders] = await Promise.all([
    listBankTransactionsForAdmin(40),
    listPendingBankTransferOrders(),
    listReportsForAdmin(100),
    listOrdersForAdmin(100),
  ]);
  const health = await getBankPollerHealth();
  const orderById = new Map(allOrders.map((o) => [o.id, o]));

  const failedPaid = reports
    .filter((r) => r.generation_status === "FAILED" && r.paid_at)
    .map((r) => {
      const order = orderById.get(r.order_id);
      return {
        id: r.order_id,
        orderNo: r.order_no ?? order?.order_no ?? "—",
        productName: r.product_name ?? order?.product_name_snapshot ?? null,
        amount: order?.amount ?? 0,
      };
    });

  const accountReady = isBankTransferAccountConfigured();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-[var(--admin-gold)]">
          입금 확인
        </h1>
        <Link
          href="/admin/bank"
          className="text-sm text-[var(--admin-muted)] underline"
        >
          은행 상태
        </Link>
      </div>

      <section className="rounded-xl border border-[var(--admin-line)] bg-[var(--admin-panel)] p-4 text-sm">
        <p className="font-medium text-[var(--admin-ink)]">실제 계좌</p>
        <p className="mt-2 text-[var(--admin-muted)]">
          {accountReady
            ? "하나은행 계좌가 설정되어 있습니다. (번호는 노출하지 않음)"
            : "⚠ BANK_TRANSFER_ACCOUNT_NUMBER / HOLDER 미설정 — 주문 생성 불가"}
        </p>
        <p className="mt-2 text-xs text-[var(--admin-muted)]">
          Poller: {health?.status ?? "—"} · 자동매칭{" "}
          {health?.last_matched_count ?? 0} · 확인필요{" "}
          {health?.last_ambiguous_count ?? 0}
        </p>
      </section>

      <BankDepositsPanel
        pending={pending.map((o) => ({
          id: o.id,
          orderNo: o.order_no,
          productName: o.product_name_snapshot,
          amount: o.amount,
          depositorName: o.depositor_name,
          createdAt: o.created_at,
          paymentCheckRequestedAt: o.payment_check_requested_at ?? null,
          status: o.status,
        }))}
        failedPaid={failedPaid}
      />

      <section>
        <h2 className="text-lg font-medium text-[var(--admin-ink)]">
          입금 내역 (자동 수집)
        </h2>
        <ul className="mt-3 space-y-2 text-sm">
          {txs.map((t) => (
            <li
              key={t.id}
              className="rounded-lg border border-[var(--admin-line)] px-3 py-2"
            >
              <span className="font-medium">{t.match_status}</span> ·{" "}
              {formatKRW(t.amount)} · {t.depositor_name_masked ?? "—"} ·{" "}
              {new Date(t.occurred_at).toLocaleString("ko-KR")}
            </li>
          ))}
          {txs.length === 0 ? (
            <li className="text-[var(--admin-muted)]">내역 없음</li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
