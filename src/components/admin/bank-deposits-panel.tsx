"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatKRW } from "@/lib/utils";
import { isQaDryRunDepositor } from "@/lib/ops/qa-dry-run-order";

export type PendingOrderRow = {
  id: string;
  orderNo: string;
  productName: string | null;
  amount: number;
  depositorName: string | null;
  createdAt: string;
  paymentCheckRequestedAt?: string | null;
  status?: string;
};

export type FailedPaidOrderRow = {
  id: string;
  orderNo: string;
  productName: string | null;
  amount: number;
};

function statusLabel(o: PendingOrderRow): string {
  if (o.paymentCheckRequestedAt) return "입금확인 요청";
  return "입금대기";
}

function QaDryRunBadge({ depositorName }: { depositorName: string | null }) {
  if (!isQaDryRunDepositor(depositorName)) return null;
  return (
    <span className="ml-2 inline-block rounded bg-blue-900/50 px-2 py-0.5 text-xs font-semibold text-blue-200">
      QA 드라이런
    </span>
  );
}

export function BankDepositsPanel({
  pending,
  failedPaid,
}: {
  pending: PendingOrderRow[];
  failedPaid: FailedPaidOrderRow[];
}) {
  const [confirmTarget, setConfirmTarget] = useState<PendingOrderRow | null>(
    null
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const confirmDeposit = useCallback(async () => {
    if (!confirmTarget) return;
    setBusy(confirmTarget.id);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/admin/bank/confirm-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: confirmTarget.id }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        already?: boolean;
        message?: string;
        code?: string;
      };
      if (!res.ok) {
        setError(data.message ?? "입금 확인에 실패했습니다.");
        return;
      }
      setMessage(
        data.already
          ? `${confirmTarget.orderNo} — 이미 확인된 주문입니다.`
          : `${confirmTarget.orderNo} — 입금 확인 완료. 리포트는 준비 대기 상태입니다.`
      );
      setConfirmTarget(null);
      window.location.reload();
    } catch {
      setError("입금 확인에 실패했습니다.");
    } finally {
      setBusy(null);
    }
  }, [confirmTarget]);

  async function retryReport(orderId: string, orderNo: string) {
    setBusy(orderId);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/admin/reports/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) {
        setError(data.message ?? "리포트 재생성에 실패했습니다.");
        return;
      }
      setMessage(`${orderNo} — 리포트 재생성을 시작했습니다.`);
      window.location.reload();
    } catch {
      setError("리포트 재생성에 실패했습니다.");
    } finally {
      setBusy(null);
    }
  }

  const requested = pending.filter((o) => o.paymentCheckRequestedAt);
  const waiting = pending.filter((o) => !o.paymentCheckRequestedAt);

  return (
    <div className="space-y-8">
      {message ? (
        <p className="rounded border border-green-700/40 bg-green-950/40 px-3 py-2 text-sm text-green-200">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded border border-red-700/40 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <section>
        <h2 className="text-lg font-medium text-[var(--admin-ink)]">
          입금확인 요청됨 ({requested.length})
        </h2>
        <ul className="mt-3 space-y-3 text-sm">
          {requested.map((o) => (
            <li
              key={o.id}
              className="flex flex-col gap-3 rounded-lg border border-[var(--admin-gold)]/50 bg-[var(--admin-accent-soft)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <span className="inline-block rounded bg-[var(--admin-gold)]/20 px-2 py-0.5 text-xs font-semibold text-[var(--admin-gold)]">
                  입금확인 요청됨
                </span>
                <p className="mt-2 font-medium text-[var(--admin-ink)]">
                  {o.productName ?? "상품"}
                  <QaDryRunBadge depositorName={o.depositorName} />
                </p>
                <p className="mt-1 text-[var(--admin-muted)]">
                  {o.orderNo} · {formatKRW(o.amount)} · 입금자{" "}
                  {o.depositorName ?? "—"}
                </p>
                <p className="mt-1 text-xs text-[var(--admin-muted)]">
                  주문 {new Date(o.createdAt).toLocaleString("ko-KR")} · 요청{" "}
                  {new Date(o.paymentCheckRequestedAt!).toLocaleString("ko-KR")}
                </p>
                <p className="mt-1 text-xs text-[var(--admin-muted)]">
                  상태: {statusLabel(o)}
                </p>
              </div>
              <Button
                size="sm"
                className="shrink-0"
                disabled={busy === o.id}
                onClick={() => setConfirmTarget(o)}
              >
                입금 확인
              </Button>
            </li>
          ))}
          {requested.length === 0 ? (
            <li className="text-[var(--admin-muted)]">입금확인 요청 없음</li>
          ) : null}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-medium text-[var(--admin-ink)]">
          입금대기 ({waiting.length})
        </h2>
        <ul className="mt-3 space-y-3 text-sm">
          {waiting.map((o) => (
            <li
              key={o.id}
              className="flex flex-col gap-3 rounded-lg border border-[var(--admin-line)] bg-[var(--admin-panel)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-[var(--admin-ink)]">
                  {o.productName ?? "상품"}
                  <QaDryRunBadge depositorName={o.depositorName} />
                </p>
                <p className="mt-1 text-[var(--admin-muted)]">
                  {o.orderNo} · {formatKRW(o.amount)} · 입금자{" "}
                  {o.depositorName ?? "—"}
                </p>
                <p className="mt-1 text-xs text-[var(--admin-muted)]">
                  주문 {new Date(o.createdAt).toLocaleString("ko-KR")} · 상태{" "}
                  {statusLabel(o)}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={busy === o.id}
                onClick={() => setConfirmTarget(o)}
              >
                입금 확인
              </Button>
            </li>
          ))}
          {waiting.length === 0 ? (
            <li className="text-[var(--admin-muted)]">기타 대기 주문 없음</li>
          ) : null}
        </ul>
      </section>

      {failedPaid.length > 0 ? (
        <section>
          <h2 className="text-lg font-medium text-red-300">리포트 생성 실패</h2>
          <p className="mt-1 text-sm text-[var(--admin-muted)]">
            결제는 완료되었습니다. AI만 다시 시도합니다.
          </p>
          <ul className="mt-3 space-y-3 text-sm">
            {failedPaid.map((o) => (
              <li
                key={o.id}
                className="flex flex-col gap-3 rounded-lg border border-red-800/60 bg-red-950/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{o.productName ?? "상품"}</p>
                  <p className="mt-1 text-[var(--admin-muted)]">
                    {o.orderNo} · {formatKRW(o.amount)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy === o.id}
                  onClick={() => void retryReport(o.id, o.orderNo)}
                >
                  리포트 다시 생성
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {confirmTarget ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-deposit-title"
        >
          <div className="w-full max-w-md rounded-lg border border-[var(--admin-line)] bg-[var(--admin-panel)] p-6 shadow-lg">
            <h3
              id="confirm-deposit-title"
              className="text-lg font-semibold text-[var(--admin-ink)]"
            >
              입금 확인
            </h3>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--admin-muted)]">주문번호</dt>
                <dd className="font-mono text-xs">{confirmTarget.orderNo}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--admin-muted)]">상품명</dt>
                <dd className="text-right font-medium">
                  {confirmTarget.productName ?? "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--admin-muted)]">금액</dt>
                <dd className="font-medium">{formatKRW(confirmTarget.amount)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--admin-muted)]">입금자명</dt>
                <dd>{confirmTarget.depositorName ?? "—"}</dd>
              </div>
            </dl>
            <p className="mt-4 text-sm text-[var(--admin-muted)]">
              실제 하나은행 입금내역을 확인했습니까?
            </p>
            <div className="mt-6 flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setConfirmTarget(null)}
                disabled={busy !== null}
              >
                취소
              </Button>
              <Button
                className="flex-1"
                disabled={busy !== null}
                onClick={() => void confirmDeposit()}
              >
                입금 확인
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
