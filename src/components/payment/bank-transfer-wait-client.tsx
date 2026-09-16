"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatKRW } from "@/lib/utils";
import { MysticPage } from "@/components/mystic/celestial-background";
import { OrnamentCard } from "@/components/mystic/ornament-card";
import {
  readOrderAccessToken,
  reportHrefWithAccess,
} from "@/lib/orders/client-access-token";

type StatusPayload = {
  order: {
    id: string;
    orderNo: string;
    productName: string | null;
    amount: number;
    status: string;
    paidAt?: string | null;
  };
  report: {
    id: string;
    generationStatus: string;
    customerPhase?: string;
    customerLabel?: string;
  } | null;
  bankAccount: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
  } | null;
  depositorName: string | null;
  manualReviewRequired?: boolean;
  paymentCheckRequested?: boolean;
  bankCheckDisconnected?: boolean;
  bankCheckUserMessage?: string | null;
};

function depositAckKey(orderId: string) {
  return `bank_deposit_ack:${orderId}`;
}

function hintForStatus(
  status: string,
  reportStatus?: string,
  depositAcked?: boolean,
  bankDisconnected?: boolean,
  paid?: boolean,
  customerLabel?: string
): string {
  if (customerLabel && paid && reportStatus !== "COMPLETED") {
    return customerLabel;
  }
  if (status === "PENDING") {
    if (bankDisconnected) {
      return "입금 확인 시스템 연결이 잠시 끊겼습니다. 입금하셨다면 주문은 그대로 유지됩니다.";
    }
    if (depositAcked) {
      return "입금 내역을 확인하고 있어요.";
    }
    return "입금을 기다리고 있어요.";
  }
  if (status === "PAID" || (paid && reportStatus !== "COMPLETED")) {
    return customerLabel ?? "결제 확인됨 · 리포트 준비 중";
  }
  if (status === "GENERATING" || reportStatus === "GENERATING") {
    return "리포트를 준비하고 있습니다.";
  }
  if (status === "COMPLETED" || reportStatus === "COMPLETED") {
    return "리포트가 준비되었습니다.";
  }
  if (reportStatus === "FAILED" && paid) {
    return "결제 확인됨 · 리포트 준비 중";
  }
  if (status === "FAILED" && paid) {
    return "결제 확인됨 · 리포트 준비 중";
  }
  if (status === "EXPIRED") {
    return "입금 기한이 지났습니다. 새로 주문해 주세요.";
  }
  return "입금을 기다리고 있어요.";
}

async function copyText(value: string, onDone: () => void) {
  try {
    await navigator.clipboard.writeText(value);
    onDone();
  } catch {
    /* ignore */
  }
}

export function BankTransferWaitClient({ orderId }: { orderId: string }) {
  const [data, setData] = useState<StatusPayload | null>(null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [pollingHint, setPollingHint] = useState("입금을 기다리고 있어요.");
  const [copyFeedback, setCopyFeedback] = useState("");
  const [depositAcked, setDepositAcked] = useState(false);
  const [ackLoading, setAckLoading] = useState(false);
  const [refreshLoading, setRefreshLoading] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const applyStatus = useCallback(
    (json: StatusPayload, acked?: boolean) => {
      const ack =
        acked ??
        json.paymentCheckRequested ??
        (typeof window !== "undefined" &&
          sessionStorage.getItem(depositAckKey(orderId)) === "1");
      setData(json);
      setError("");
      setPollingHint(
        hintForStatus(
          json.order.status,
          json.report?.generationStatus,
          ack,
          json.bankCheckDisconnected,
          Boolean(json.order.paidAt),
          json.report?.customerLabel
        )
      );
      if (json.order.status !== "PENDING") {
        sessionStorage.removeItem(depositAckKey(orderId));
        setDepositAcked(false);
      } else {
        setDepositAcked(ack);
      }
    },
    [orderId]
  );

  useEffect(() => {
    setAccessToken(readOrderAccessToken(orderId));
  }, [orderId]);

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
        applyStatus(json);
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
  }, [orderId, applyStatus]);

  useEffect(() => {
    if (!copyFeedback) return;
    const t = window.setTimeout(() => setCopyFeedback(""), 2000);
    return () => window.clearTimeout(t);
  }, [copyFeedback]);

  async function onDepositAck() {
    setAckLoading(true);
    setError("");
    setInfo("");
    try {
      const res = await fetch(`/api/orders/${orderId}/deposit-ack`, {
        method: "POST",
      });
      const json = (await res.json()) as {
        ok?: boolean;
        message?: string;
        code?: string;
        status?: string;
      };
      if (!res.ok) {
        setError(json.message ?? "요청에 실패했습니다.");
        return;
      }
      sessionStorage.setItem(depositAckKey(orderId), "1");
      setDepositAcked(true);
      setInfo(json.message ?? "입금 확인 요청을 받았습니다.");
      const statusRes = await fetch(`/api/orders/${orderId}/status`);
      const statusJson = (await statusRes.json()) as StatusPayload;
      if (statusRes.ok) applyStatus(statusJson, true);
    } catch {
      setError("요청에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setAckLoading(false);
    }
  }

  async function onRefreshStatus() {
    setRefreshLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/orders/${orderId}/status`);
      const json = (await res.json()) as StatusPayload & { message?: string };
      if (!res.ok) {
        setError(json.message ?? "상태를 불러오지 못했습니다.");
        return;
      }
      applyStatus(json);
      if (json.order.status === "PENDING" && (depositAcked || json.paymentCheckRequested)) {
        setInfo("아직 입금내역을 찾고 있어요. 확인되면 자동으로 갱신됩니다.");
      }
    } catch {
      setError("상태를 불러오지 못했습니다.");
    } finally {
      setRefreshLoading(false);
    }
  }

  const reportReady =
    data?.order.status === "COMPLETED" ||
    data?.report?.generationStatus === "COMPLETED";

  const amountText = data ? String(data.order.amount) : "";
  const isPending = data?.order.status === "PENDING";

  return (
    <MysticPage>
      <div className="mx-auto max-w-lg px-5 py-12">
        <p className="hanja-accent">運의結 · 계좌이체</p>
        <h1 className="display-title mt-4 text-3xl">
          {data?.order.productName ?? "리포트 구매"}
        </h1>
        <p className="mt-3 text-sm text-[var(--text-secondary)]">{pollingHint}</p>

        {isPending && data?.bankCheckDisconnected ? (
          <p className="mt-3 whitespace-pre-line rounded border border-[var(--border-subtle)] bg-[var(--surface-strong)] px-4 py-3 text-xs leading-relaxed text-[var(--text-secondary)]">
            {data.bankCheckUserMessage ??
              "입금 확인 시스템 연결이 잠시 끊겼습니다.\n입금하셨다면 주문은 그대로 유지됩니다."}
          </p>
        ) : null}

        {isPending && data?.manualReviewRequired && !data?.bankCheckDisconnected ? (
          <p className="mt-3 rounded border border-[var(--border-subtle)] bg-[var(--surface-strong)] px-4 py-3 text-xs leading-relaxed text-[var(--text-secondary)]">
            입금 후 하나은행 거래내역을 자동으로 확인합니다. 「입금했어요」를
            누르면 즉시 확인을 시도합니다. 자동 확인이 어려운 경우 운영자가
            수동으로 승인합니다.
          </p>
        ) : null}

        <OrnamentCard className="mt-8 space-y-4 p-6">
          <div>
            <p className="text-xs text-[var(--text-muted)]">입금금액</p>
            <div className="mt-1 flex items-center gap-3">
              <p className="text-2xl font-semibold text-[var(--gold-light)]">
                {data ? formatKRW(data.order.amount) : "—"}
              </p>
              {isPending && data ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    void copyText(amountText, () =>
                      setCopyFeedback("입금금액을 복사했습니다.")
                    )
                  }
                >
                  금액 복사
                </Button>
              ) : null}
            </div>
          </div>
          {data?.bankAccount ? (
            <>
              <div>
                <p className="text-xs text-[var(--text-muted)]">은행</p>
                <p className="mt-1 text-sm text-[var(--text-primary)]">
                  {data.bankAccount.bankName}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">계좌번호</p>
                <div className="mt-1 flex flex-wrap items-center gap-3">
                  <p className="font-mono text-sm tracking-wide">
                    {data.bankAccount.accountNumber}
                  </p>
                  {isPending ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void copyText(
                          data.bankAccount!.accountNumber.replace(/\s/g, ""),
                          () => setCopyFeedback("계좌번호를 복사했습니다.")
                        )
                      }
                    >
                      계좌 복사
                    </Button>
                  ) : null}
                </div>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">예금주</p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  {data.bankAccount.accountHolder}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">입금자명</p>
                <p className="mt-1 text-sm">{data.depositorName ?? "—"}</p>
              </div>
            </>
          ) : null}
          <div>
            <p className="text-xs text-[var(--text-muted)]">주문번호</p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <p className="font-mono text-sm">{data?.order.orderNo ?? "—"}</p>
              {isPending && data?.order.orderNo ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    void copyText(data.order.orderNo, () =>
                      setCopyFeedback("주문번호를 복사했습니다.")
                    )
                  }
                >
                  주문번호 복사
                </Button>
              ) : null}
            </div>
          </div>
          {accessToken ? (
            <div>
              <p className="text-xs text-[var(--text-muted)]">결과 보관 코드</p>
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <p className="break-all font-mono text-xs leading-relaxed">
                  {accessToken}
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    void copyText(accessToken, () =>
                      setCopyFeedback("결과 보관 코드를 복사했습니다.")
                    )
                  }
                >
                  코드 복사
                </Button>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-[var(--text-secondary)]">
                다른 기기에서 결과를 보려면 이 코드를 저장해 두세요. 입금 확인 후에도
                유효합니다.
              </p>
            </div>
          ) : null}
          {isPending ? (
            <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
              위 금액을 정확히 입금해 주세요. 입금 확인 후 「내 결과」에서 리포트
              준비 상태를 확인할 수 있습니다.
            </p>
          ) : null}
        </OrnamentCard>

        {copyFeedback ? (
          <p className="mt-3 text-xs text-[var(--gold-primary)]">{copyFeedback}</p>
        ) : null}

        {info ? (
          <p className="mt-4 text-sm text-[var(--gold-primary)]">{info}</p>
        ) : null}

        {error ? (
          <p className="mt-4 text-sm text-[var(--error-text)]">{error}</p>
        ) : null}

        <div className="mt-8 flex flex-col gap-3">
          {isPending ? (
            <>
              <Button
                size="full"
                variant="outline"
                disabled={ackLoading}
                onClick={() => void onDepositAck()}
              >
                {ackLoading
                  ? "요청 중…"
                  : depositAcked
                    ? "입금 확인 요청됨"
                    : "입금했어요"}
              </Button>
              <Button
                size="full"
                variant="ghost"
                disabled={refreshLoading}
                onClick={() => void onRefreshStatus()}
              >
                {refreshLoading ? "확인 중…" : "상태 새로고침"}
              </Button>
            </>
          ) : null}
          {reportReady && (data?.report?.id || data?.order.id) ? (
            <Button asChild size="full">
              <Link
                href={reportHrefWithAccess(
                  data?.report?.id ?? data?.order.id ?? orderId,
                  orderId
                )}
              >
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
