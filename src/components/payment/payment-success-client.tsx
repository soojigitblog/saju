"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MysticPage } from "@/components/mystic/celestial-background";
import { OrnamentCard } from "@/components/mystic/ornament-card";
import { trackClientEvent } from "@/lib/analytics/client";
import { saveOrderAccessToken } from "@/lib/orders/client-access-token";

type Phase =
  | "confirming"
  | "paid_generating"
  | "completed"
  | "generation_failed"
  | "error";

type ConfirmParams = {
  paymentKey: string | null;
  tossOrderId: string | null;
  amount: number;
  valid: boolean;
  provider: "toss" | "portone";
};

function readConfirmParams(searchParams: URLSearchParams): ConfirmParams {
  const paymentKey = searchParams.get("paymentKey");
  const portonePaymentId = searchParams.get("paymentId");
  const tossOrderId = searchParams.get("orderId");
  const amountRaw = searchParams.get("amount");
  const amount = amountRaw ? Number(amountRaw) : NaN;
  const valid = Boolean(
    (paymentKey || portonePaymentId) && tossOrderId && Number.isFinite(amount)
  );
  return { paymentKey: paymentKey ?? portonePaymentId, tossOrderId, amount, valid, provider: searchParams.get("provider") === "portone" ? "portone" : "toss" };
}

export function PaymentSuccessClient() {
  const searchParams = useSearchParams();
  const params = readConfirmParams(searchParams);

  const [phase, setPhase] = useState<Phase>(
    params.valid ? "confirming" : "error"
  );
  const [message, setMessage] = useState(
    params.valid
      ? "결제를 확인하고 있습니다…"
      : "결제 정보가 올바르지 않습니다. 결제가 완료되지 않았을 수 있습니다."
  );
  const [productName, setProductName] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!params.valid || started.current) return;
    started.current = true;

    const paymentKey = params.paymentKey!;
    const tossOrderId = params.tossOrderId!;
    const amount = params.amount;

    async function pollStatus(oid: string) {
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 1500));
        try {
          const res = await fetch(
            `/api/payments/status?orderId=${encodeURIComponent(oid)}`
          );
          if (!res.ok) continue;
          const data = (await res.json()) as {
            order?: { status: string };
            report?: { id: string; generationStatus: string } | null;
          };
          if (data.report?.id) setReportId(data.report.id);
          if (
            data.order?.status === "COMPLETED" ||
            data.report?.generationStatus === "COMPLETED"
          ) {
            setPhase("completed");
            setMessage("리포트가 준비되었습니다.");
            return;
          }
          if (
            data.report?.generationStatus === "FAILED" ||
            (data.order?.status === "FAILED" && data.report?.generationStatus !== "COMPLETED")
          ) {
            setPhase("generation_failed");
            setMessage(
              "입금은 정상적으로 확인되었습니다. 리포트를 준비하는 중 문제가 발생했습니다."
            );
            return;
          }
        } catch {
          /* continue */
        }
      }
    }

    async function run() {
      try {
        const res = await fetch(`/api/payments/${params.provider}/confirm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentKey,
            orderId: tossOrderId,
            amount,
          }),
        });
        const data = (await res.json()) as {
          code?: string;
          message?: string;
          orderId?: string;
          status?: string;
          productName?: string | null;
          reportId?: string | null;
          alreadyPaid?: boolean;
          accessToken?: string | null;
        };

        if (!res.ok) {
          trackClientEvent({
            eventName: "payment_fail",
            path: "/payment/success",
            metadata: { code: data.code ?? "CONFIRM_FAILED" },
          });
          setPhase("error");
          setMessage(
            data.message ??
              "결제를 완료하지 못했습니다. 결제는 처리되지 않았을 수 있습니다."
          );
          return;
        }

        setOrderId(data.orderId ?? null);
        setProductName(data.productName ?? null);
        setReportId(data.reportId ?? null);

        if (data.accessToken && data.orderId) {
          saveOrderAccessToken(data.orderId, data.accessToken);
        }

        trackClientEvent({
          eventName: "payment_success",
          path: "/payment/success",
          metadata: {
            orderId: data.orderId,
            alreadyPaid: data.alreadyPaid ?? false,
          },
        });

        if (data.status === "COMPLETED") {
          setPhase("completed");
          setMessage("리포트가 준비되었습니다.");
          return;
        }
        if (data.status === "FAILED") {
          setPhase("generation_failed");
          setMessage(
            "결제는 정상적으로 완료되었습니다. 리포트 생성 중 문제가 발생했습니다."
          );
          return;
        }

        setPhase("paid_generating");
        setMessage("더 깊은 리포트를 준비하고 있습니다.");

        if (data.orderId) {
          void pollStatus(data.orderId);
        }
      } catch {
        setPhase("error");
        setMessage("결제 확인 중 문제가 발생했습니다.");
      }
    }

    void run();
  }, [params.valid, params.paymentKey, params.tossOrderId, params.amount, params.provider]);

  async function onRetryGeneration() {
    if (!orderId) return;
    setMessage("리포트 생성을 다시 시도합니다…");
    const res = await fetch("/api/payments/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    });
    const data = (await res.json()) as { status?: string; message?: string };
    if (!res.ok) {
      setMessage(data.message ?? "재시도에 실패했습니다.");
      return;
    }
    if (data.status === "COMPLETED") {
      setPhase("completed");
      setMessage("리포트가 준비되었습니다.");
    } else if (data.status === "FAILED") {
      setPhase("generation_failed");
    } else {
      setPhase("paid_generating");
    }
  }

  return (
    <MysticPage>
      <div className="mx-auto max-w-lg px-5 py-16 text-center">
        <p className="hanja-accent">結 · PAYMENT</p>
        <h1 className="display-title mt-4 text-3xl">
          {phase === "error" ? "결제를 확인하지 못했습니다" : "결이 이어졌습니다"}
        </h1>

        <OrnamentCard className="mt-8 p-6 text-left">
          {productName ? (
            <p className="text-sm text-[var(--text-secondary)]">
              <span className="text-[var(--gold-light)]">{productName}</span>
              {phase === "error" ? "" : " 결제가 완료되었습니다."}
            </p>
          ) : null}
          <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
            {phase === "confirming"
              ? "결제를 확인하고 있습니다…"
              : phase === "paid_generating"
                ? "지금 당신의 사주를 바탕으로 더 깊은 리포트를 준비하고 있습니다."
                : phase === "completed"
                  ? "리포트가 준비되었습니다."
                  : phase === "generation_failed"
                    ? message
                    : message}
          </p>
          {phase === "paid_generating" ? (
            <p className="mt-4 text-xs text-[var(--gold-primary)]">리포트 생성 중</p>
          ) : null}
        </OrnamentCard>

        <div className="mt-8 flex flex-col gap-3">
          {phase === "completed" && (reportId || orderId) ? (
            <Button asChild size="full">
              <Link href={`/report/${reportId ?? orderId}`}>
                내 전체 리포트 보기
              </Link>
            </Button>
          ) : null}
          {phase === "generation_failed" && orderId ? (
            <Button size="full" onClick={() => void onRetryGeneration()}>
              리포트 다시 생성하기
            </Button>
          ) : null}
          {phase === "error" ? (
            <Button asChild size="full">
              <Link href="/products">상품으로 돌아가기</Link>
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
