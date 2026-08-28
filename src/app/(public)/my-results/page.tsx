"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatKRW } from "@/lib/utils";
import { MysticPage } from "@/components/mystic/celestial-background";
import { OrnamentCard, MysticPanel } from "@/components/mystic/ornament-card";
import {
  isReportWaitingForAi,
  PAID_REPORT_WAITING_ERROR_CODE,
} from "@/lib/services/paid-report-waiting";

type OrderItem = {
  order: {
    id: string;
    orderNo: string;
    productName: string | null;
    amount: number;
    status: string;
    paymentMethod: string;
    paidAt: string | null;
  };
  report: { id: string; generationStatus: string; errorCode?: string | null } | null;
  paymentUrl: string | null;
  reportUrl: string | null;
};

function statusLabel(
  status: string,
  reportStatus?: string,
  paymentMethod?: string,
  paidAt?: string | null,
  reportErrorCode?: string | null
): string {
  const paid = Boolean(paidAt);
  if (
    paid &&
    isReportWaitingForAi({
      generationStatus: reportStatus ?? "",
      errorCode: reportErrorCode,
    })
  ) {
    return "결제 확인됨 · 리포트 준비 중";
  }
  if (status === "PENDING") {
    return paymentMethod === "BANK_TRANSFER"
      ? "입금 확인 대기 (운영자 확인 필요)"
      : "입금 대기";
  }
  if (
    paid &&
    reportStatus === "FAILED" &&
    reportErrorCode === "PAID_REPORT_LIVE_DISABLED"
  ) {
    return "결제 확인됨 · 리포트 준비 중";
  }
  if (
    paid &&
    reportStatus === "FAILED" &&
    reportErrorCode === PAID_REPORT_WAITING_ERROR_CODE
  ) {
    return "결제 확인됨 · 리포트 준비 중";
  }
  if (reportStatus === "FAILED" && paid) return "결제 확인됨 · 리포트 준비 중";
  if (status === "PAID" && reportStatus === "GENERATING") {
    return "결제 완료 · 리포트 준비 중";
  }
  if (status === "PAID" && !reportStatus) return "결제 완료 · 리포트 준비 중";
  if (status === "PAID") return "결제 완료";
  if (status === "GENERATING" || reportStatus === "GENERATING") {
    return "리포트 생성 중";
  }
  if (status === "COMPLETED" || reportStatus === "COMPLETED") {
    return "완료";
  }
  if (status === "FAILED" && paid) return "결제 확인됨 · 리포트 준비 중";
  if (status === "EXPIRED") return "입금 기한 만료";
  return status;
}

export default function MyResultsPage() {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const ac = new AbortController();
    async function load() {
      try {
        const res = await fetch("/api/orders/mine", { signal: ac.signal });
        const data = (await res.json()) as {
          orders?: OrderItem[];
          message?: string;
        };
        if (!res.ok) {
          setError(data.message ?? "주문을 불러오지 못했습니다.");
          setLoading(false);
          return;
        }
        setOrders(data.orders ?? []);
        setLoading(false);
      } catch {
        if (ac.signal.aborted) return;
        setError("주문을 불러오지 못했습니다.");
        setLoading(false);
      }
    }
    void load();
    return () => ac.abort();
  }, []);

  return (
    <MysticPage>
      <div className="mx-auto w-full max-w-lg px-5 pb-16 pt-8">
        <p className="hanja-accent mb-2">ARCHIVE</p>
        <h1 className="display-title text-3xl">내 결과</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          이 기기에서 진행한 주문과 리포트입니다.
        </p>

        {loading ? (
          <p className="mt-8 text-sm text-[var(--text-muted)]">불러오는 중…</p>
        ) : null}

        {error ? (
          <p className="mt-8 text-sm text-[var(--error-text)]">{error}</p>
        ) : null}

        {!loading && !error && orders.length === 0 ? (
          <MysticPanel className="mt-8">
            <p className="text-sm text-[var(--text-secondary)]">
              아직 주문이 없습니다. 무료 사주 결과에서 유료 리포트를 선택해
              주세요.
            </p>
            <Button asChild className="mt-4" size="sm" variant="outline">
              <Link href="/fortune">사주 보기</Link>
            </Button>
          </MysticPanel>
        ) : null}

        <ul className="mt-8 space-y-4">
          {orders.map((item) => (
            <li key={item.order.id}>
              <OrnamentCard density="corners" className="p-5">
                <p className="display-title text-lg">
                  {item.order.productName ?? "유료 리포트"}
                </p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  {item.order.orderNo} · {formatKRW(item.order.amount)}
                </p>
                <p className="mt-2 text-xs text-[var(--gold-primary)]">
                  {statusLabel(
                    item.order.status,
                    item.report?.generationStatus,
                    item.order.paymentMethod,
                    item.order.paidAt,
                    item.report?.errorCode
                  )}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {item.paymentUrl ? (
                    <Button asChild size="sm" variant="outline">
                      <Link href={item.paymentUrl}>입금 안내</Link>
                    </Button>
                  ) : null}
                  {item.reportUrl ? (
                    <Button asChild size="sm">
                      <Link href={item.reportUrl}>전체 리포트 보기</Link>
                    </Button>
                  ) : null}
                  {!item.paymentUrl && !item.reportUrl ? (
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/payment/bank/${item.order.id}`}>
                        주문 상태 보기
                      </Link>
                    </Button>
                  ) : null}
                </div>
              </OrnamentCard>
            </li>
          ))}
        </ul>
      </div>
    </MysticPage>
  );
}
