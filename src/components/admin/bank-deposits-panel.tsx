"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatKRW } from "@/lib/utils";

const TOKEN_KEY = "admin_manual_token";

function readStoredToken(): string {
  if (typeof window === "undefined") return "";
  try {
    return sessionStorage.getItem(TOKEN_KEY) ?? "";
  } catch {
    return "";
  }
}

export type PendingOrderRow = {
  id: string;
  orderNo: string;
  productName: string | null;
  amount: number;
  depositorName: string | null;
  createdAt: string;
};

export type FailedPaidOrderRow = {
  id: string;
  orderNo: string;
  productName: string | null;
  amount: number;
};

function adminHeaders(token: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    "x-admin-manual-token": token,
  };
}

export function BankDepositsPanel({
  pending,
  failedPaid,
}: {
  pending: PendingOrderRow[];
  failedPaid: FailedPaidOrderRow[];
}) {
  const [token, setToken] = useState(readStoredToken);
  const [confirmTarget, setConfirmTarget] = useState<PendingOrderRow | null>(
    null
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function saveToken(value: string) {
    setToken(value);
    if (value.trim()) sessionStorage.setItem(TOKEN_KEY, value.trim());
    else sessionStorage.removeItem(TOKEN_KEY);
  }

  const confirmDeposit = useCallback(async () => {
    if (!confirmTarget || !token.trim()) {
      setError("관리자 토큰을 입력해 주세요.");
      return;
    }
    setBusy(confirmTarget.id);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/admin/bank/confirm-order", {
        method: "POST",
        headers: adminHeaders(token.trim()),
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
          : `${confirmTarget.orderNo} — 입금 확인 및 리포트 생성을 시작했습니다.`
      );
      setConfirmTarget(null);
      window.location.reload();
    } catch {
      setError("입금 확인에 실패했습니다.");
    } finally {
      setBusy(null);
    }
  }, [confirmTarget, token]);

  async function retryReport(orderId: string, orderNo: string) {
    if (!token.trim()) {
      setError("관리자 토큰을 입력해 주세요.");
      return;
    }
    setBusy(orderId);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/admin/reports/retry", {
        method: "POST",
        headers: adminHeaders(token.trim()),
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

  return (
    <div className="space-y-8">
      <section className="rounded border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-950/30">
        <Label htmlFor="admin-token">관리자 토큰</Label>
        <Input
          id="admin-token"
          type="password"
          className="mt-2 max-w-md"
          placeholder="ADMIN_MANUAL_TOKEN"
          value={token}
          onChange={(e) => saveToken(e.target.value)}
          autoComplete="off"
        />
        <p className="mt-2 text-muted-foreground">
          입금 확인·리포트 재생성 API에 사용됩니다. 브라우저 sessionStorage에만
          저장됩니다.
        </p>
      </section>

      {message ? (
        <p className="rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <section>
        <h2 className="text-lg font-medium">대기 주문 ({pending.length})</h2>
        <ul className="mt-3 space-y-3 text-sm">
          {pending.map((o) => (
            <li
              key={o.id}
              className="flex flex-col gap-3 rounded border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium">{o.productName ?? "상품"}</p>
                <p className="mt-1 text-muted-foreground">
                  {o.orderNo} · {formatKRW(o.amount)} · 입금자{" "}
                  {o.depositorName ?? "—"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(o.createdAt).toLocaleString("ko-KR")}
                </p>
              </div>
              <Button
                size="sm"
                disabled={busy === o.id}
                onClick={() => setConfirmTarget(o)}
              >
                입금 확인
              </Button>
            </li>
          ))}
          {pending.length === 0 ? (
            <li className="text-muted-foreground">대기 주문 없음</li>
          ) : null}
        </ul>
      </section>

      {failedPaid.length > 0 ? (
        <section>
          <h2 className="text-lg font-medium">리포트 생성 실패</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            결제는 완료되었습니다. AI만 다시 시도합니다.
          </p>
          <ul className="mt-3 space-y-3 text-sm">
            {failedPaid.map((o) => (
              <li
                key={o.id}
                className="flex flex-col gap-3 rounded border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{o.productName ?? "상품"}</p>
                  <p className="mt-1 text-muted-foreground">
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-deposit-title"
        >
          <div className="w-full max-w-md rounded-lg bg-[var(--paper)] p-6 shadow-lg">
            <h3 id="confirm-deposit-title" className="text-lg font-semibold">
              입금 확인
            </h3>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">상품</dt>
                <dd className="text-right font-medium">
                  {confirmTarget.productName ?? "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">금액</dt>
                <dd className="font-medium">{formatKRW(confirmTarget.amount)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">입금자명</dt>
                <dd>{confirmTarget.depositorName ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">주문번호</dt>
                <dd className="font-mono text-xs">{confirmTarget.orderNo}</dd>
              </div>
            </dl>
            <p className="mt-4 text-sm text-muted-foreground">
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
                입금 확인 및 리포트 생성
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">
        자동 입금 매칭은{" "}
        <Link href="/admin/bank-deposits" className="underline">
          Bank Poller
        </Link>
        가 연결되면 별도 확인 없이 처리됩니다.
      </p>
    </div>
  );
}
