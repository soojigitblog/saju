"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatKRW } from "@/lib/utils";
import { MysticPage } from "@/components/mystic/celestial-background";
import { OrnamentCard } from "@/components/mystic/ornament-card";

type StatusPayload = {
  order: {
    id: string;
    orderNo: string;
    productName: string | null;
    amount: number;
    status: string;
  };
  report: { id: string; generationStatus: string } | null;
  bankAccount: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
  } | null;
  depositorName: string | null;
};

function hintForStatus(status: string): string {
  if (status === "PENDING") return "입금을 확인하고 있어요";
  if (status === "PAID" || status === "GENERATING") {
    return "입금이 확인되었습니다. 리포트를 만들고 있어요.";
  }
  if (status === "COMPLETED") return "리포트가 준비되었습니다.";
  if (status === "FAILED") {
    return "결제는 확인되었지만 리포트 생성 중 문제가 발생했습니다.";
  }
  if (status === "EXPIRED") {
    return "입금 기한이 지났습니다. 새로 주문해 주세요.";
  }
  return "입금을 기다리고 있어요";
}

export function BankTransferWaitClient({ orderId }: { orderId: string }) {
  const [data, setData] = useState<StatusPayload | null>(null);
  const [error, setError] = useState("");
  const [pollingHint, setPollingHint] = useState("입금을 기다리고 있어요");

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const res = await fetch(`/api/orders/${orderId}/status`);
        const json = (await res.json()) as StatusPayload & {
          code?: string;
          message?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          setError(json.message ?? "상태를 불러오지 못했습니다.");
          return;
        }
        setData(json);
        setError("");
        setPollingHint(hintForStatus(json.order.status));
      } catch {
        if (!cancelled) setError("상태를 불러오지 못했습니다.");
      }
    }

    const initial = window.setTimeout(() => {
      void refresh();
    }, 0);
    const interval = window.setInterval(() => {
      void refresh();
    }, 8000);

    return () => {
      cancelled = true;
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [orderId]);

  const reportReady =
    data?.order.status === "COMPLETED" ||
    data?.report?.generationStatus === "COMPLETED";

  return (
    <MysticPage>
      <div className="mx-auto max-w-lg px-5 py-12">
        <p className="hanja-accent">運의結 · 계좌이체</p>
        <h1 className="display-title mt-4 text-3xl">
          {data?.order.productName ?? "리포트 구매"}
        </h1>
        <p className="mt-3 text-sm text-[var(--text-secondary)]">{pollingHint}</p>

        <OrnamentCard className="mt-8 space-y-4 p-6">
          <div>
            <p className="text-xs text-[var(--text-muted)]">입금금액</p>
            <p className="mt-1 text-2xl font-semibold text-[var(--gold-light)]">
              {data ? formatKRW(data.order.amount) : "—"}
            </p>
          </div>
          {data?.bankAccount ? (
            <>
              <div>
                <p className="text-xs text-[var(--text-muted)]">입금 계좌</p>
                <p className="mt-1 text-sm text-[var(--text-primary)]">
                  {data.bankAccount.bankName}
                </p>
                <p className="mt-1 font-mono text-sm tracking-wide">
                  {data.bankAccount.accountNumber}
                </p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  예금주 {data.bankAccount.accountHolder}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">입금자명</p>
                <p className="mt-1 text-sm">{data.depositorName ?? "—"}</p>
              </div>
            </>
          ) : null}
          <p className="text-xs text-[var(--text-muted)]">
            주문번호 {data?.order.orderNo ?? "—"}
          </p>
          <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
            입금 확인 후 자동으로 리포트가 생성됩니다. 「입금 완료했어요」는
            결제 처리가 아니라 확인 요청입니다.
          </p>
        </OrnamentCard>

        {error ? (
          <p className="mt-4 text-sm text-[var(--error-text)]">{error}</p>
        ) : null}

        <div className="mt-8 flex flex-col gap-3">
          {data?.order.status === "PENDING" ? (
            <Button
              size="full"
              variant="outline"
              onClick={() => {
                void fetch(`/api/orders/${orderId}/status`)
                  .then((res) => res.json())
                  .then((json: StatusPayload) => {
                    setData(json);
                    setPollingHint(hintForStatus(json.order.status));
                  })
                  .catch(() => setError("상태를 불러오지 못했습니다."));
              }}
            >
              입금 완료했어요
            </Button>
          ) : null}
          {reportReady && (data?.report?.id || data?.order.id) ? (
            <Button asChild size="full">
              <Link href={`/report/${data?.report?.id ?? data?.order.id}`}>
                전체 리포트 보기
              </Link>
            </Button>
          ) : null}
          <Button asChild variant="outline" size="full">
            <Link href="/my-results">내 결과</Link>
          </Button>
        </div>
      </div>
    </MysticPage>
  );
}
