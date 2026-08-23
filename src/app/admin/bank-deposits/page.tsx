import Link from "next/link";
import { listBankTransactionsForAdmin } from "@/lib/repositories/bank-transactions";
import { getBankPollerHealth } from "@/lib/repositories/bank-transactions";
import {
  listOrdersForAdmin,
  listPendingBankTransferOrders,
} from "@/lib/repositories/orders";
import { formatKRW } from "@/lib/utils";
import { BankDepositsPanel } from "@/components/admin/bank-deposits-panel";
import { isBankTransferAccountConfigured } from "@/lib/bank/account-public";
import { isHanaAutomationEnabled } from "@/lib/bank/hana/playwright/config";
import {
  bankConnectionMessage,
  resolveBankConnectionLabel,
} from "@/lib/bank/connection-status";

export const dynamic = "force-dynamic";

export const metadata = { title: "입금확인 | Admin" };

export default async function AdminBankDepositsPage() {
  const [txs, pending, health, allOrders] = await Promise.all([
    listBankTransactionsForAdmin(40),
    listPendingBankTransferOrders(),
    getBankPollerHealth(),
    listOrdersForAdmin(100),
  ]);

  const failedPaid = allOrders
    .filter((o) => o.status === "FAILED" && o.paid_at)
    .map((o) => ({
      id: o.id,
      orderNo: o.order_no,
      productName: o.product_name_snapshot,
      amount: o.amount,
    }));

  const accountReady = isBankTransferAccountConfigured();
  const automationEnabled = isHanaAutomationEnabled();
  const connectionLabel = resolveBankConnectionLabel(
    health ?? null,
    automationEnabled
  );
  const connectionMessage = bankConnectionMessage(connectionLabel);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">입금확인</h1>
        <Link href="/admin/dashboard" className="text-sm underline">
          대시보드
        </Link>
      </div>

      <section className="mt-6 rounded border p-4 text-sm">
        <p className="font-medium">실제 계좌</p>
        <p className="mt-2 text-muted-foreground">
          {accountReady
            ? "하나은행 계좌가 설정되어 있습니다. (번호는 로그·화면에 노출하지 않음)"
            : "⚠ BANK_TRANSFER_ACCOUNT_NUMBER / HOLDER 미설정 — 주문 생성 불가"}
        </p>
      </section>

      <section className="mt-8 rounded border p-4 text-sm">
        <p className="font-medium">하나은행 연결</p>
        <p className="mt-2 font-medium text-amber-800 dark:text-amber-200">
          {connectionLabel}
        </p>
        <p className="mt-2 text-muted-foreground">{connectionMessage}</p>
        {connectionLabel === "SESSION_EXPIRED" ? (
          <p className="mt-2 text-xs text-muted-foreground">
            npm run bank:hana:login 후 거래내역 화면까지 이동하면 자동으로
            CONNECTED로 복구됩니다. 주문은 PENDING으로 유지됩니다.
          </p>
        ) : null}
        <p className="mt-3 text-muted-foreground">
          Poller: {health?.status ?? "—"} · 마지막 성공:{" "}
          {health?.last_success_at
            ? new Date(health.last_success_at).toLocaleString("ko-KR")
            : "—"}{" "}
          · 조회 {health?.last_fetched_count ?? 0} · 자동 매칭{" "}
          {health?.last_matched_count ?? 0} · 확인필요{" "}
          {health?.last_ambiguous_count ?? 0}
        </p>
        {health?.last_error_safe ? (
          <p className="mt-1 text-amber-700">오류 코드: {health.last_error_safe}</p>
        ) : null}
        {!automationEnabled ? (
          <p className="mt-2 text-xs text-muted-foreground">
            자동 조회: HANA_BANK_AUTOMATION_ENABLED=1 · npm run bank:hana:login
          </p>
        ) : null}
      </section>

      <div className="mt-8">
        <BankDepositsPanel
          pending={pending.map((o) => ({
            id: o.id,
            orderNo: o.order_no,
            productName: o.product_name_snapshot,
            amount: o.amount,
            depositorName: o.depositor_name,
            createdAt: o.created_at,
          }))}
          failedPaid={failedPaid}
        />
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-medium">입금 내역 (자동 수집)</h2>
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
