"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatKRW } from "@/lib/utils";
import { trackClientEvent } from "@/lib/analytics/client";
import { MysticPage } from "@/components/mystic/celestial-background";
import { OrnamentCard, MysticPanel } from "@/components/mystic/ornament-card";
import type { CheckoutPageDTO } from "@/lib/services/get-checkout";

type Props = {
  checkout: CheckoutPageDTO;
};

export function CheckoutClient({ checkout }: Props) {
  const router = useRouter();
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const needsTossWidget =
    checkout.paymentMode === "toss" && Boolean(checkout.clientKey);
  const [widgetReady, setWidgetReady] = useState(!needsTossWidget);
  const widgetsRef = useRef<{
    requestPayment: (opts: Record<string, unknown>) => Promise<void>;
  } | null>(null);
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    trackClientEvent({
      eventName: "checkout_start",
      path: `/checkout/${checkout.orderId}`,
      metadata: {
        orderId: checkout.orderId,
        amount: checkout.amount,
        mode: checkout.paymentMode,
      },
    });
  }, [checkout.orderId, checkout.amount, checkout.paymentMode]);

  useEffect(() => {
    if (!needsTossWidget || !checkout.clientKey) return;

    let cancelled = false;

    async function mountWidget() {
      try {
        const { loadTossPayments } = await import(
          "@tosspayments/tosspayments-sdk"
        );
        const tossPayments = await loadTossPayments(checkout.clientKey!);
        const widgets = tossPayments.widgets({
          customerKey: checkout.customerKey,
        });
        await widgets.setAmount({
          currency: "KRW",
          value: checkout.amount,
        });
        await Promise.all([
          widgets.renderPaymentMethods({
            selector: "#toss-payment-methods",
            variantKey: "DEFAULT",
          }),
          widgets.renderAgreement({
            selector: "#toss-agreement",
            variantKey: "AGREEMENT",
          }),
        ]);
        if (!cancelled) {
          widgetsRef.current = widgets as unknown as {
            requestPayment: (opts: Record<string, unknown>) => Promise<void>;
          };
          setWidgetReady(true);
        }
      } catch {
        if (!cancelled) {
          setError(
            "결제 위젯을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요."
          );
        }
      }
    }

    void mountWidget();
    return () => {
      cancelled = true;
    };
  }, [
    needsTossWidget,
    checkout.clientKey,
    checkout.customerKey,
    checkout.amount,
  ]);

  const onPay = useCallback(async () => {
    if (!agree) {
      setError("이용약관·개인정보·환불정책에 동의해 주세요.");
      return;
    }
    setError("");
    setLoading(true);

    const origin = window.location.origin;
    const successUrl = `${origin}/payment/success`;
    const failUrl = `${origin}/payment/fail?checkoutOrderId=${encodeURIComponent(checkout.orderId)}`;

    trackClientEvent({
      eventName: "payment_request",
      path: `/checkout/${checkout.orderId}`,
      metadata: { orderId: checkout.orderId, amount: checkout.amount },
    });

    try {
      if (checkout.paymentMode === "mock") {
        const mockKey = `mock_pk_${checkout.orderNo}`;
        const qs = new URLSearchParams({
          paymentKey: mockKey,
          orderId: checkout.orderNo,
          amount: String(checkout.amount),
        });
        router.push(`/payment/success?${qs.toString()}`);
        return;
      }

      const widgets = widgetsRef.current;
      if (!widgets) {
        setError("결제 위젯이 준비되지 않았습니다.");
        setLoading(false);
        return;
      }

      await widgets.requestPayment({
        orderId: checkout.orderNo,
        orderName: checkout.productName,
        successUrl,
        failUrl,
        customerName: checkout.customerName ?? undefined,
      });
    } catch (e) {
      const message =
        e && typeof e === "object" && "message" in e
          ? String((e as { message: unknown }).message)
          : "";
      if (!/cancel|취소|closed/i.test(message)) {
        setError("결제를 시작하지 못했습니다. 다시 시도해 주세요.");
      }
      setLoading(false);
    }
  }, [agree, checkout, router]);

  return (
    <MysticPage>
      <div className="mx-auto w-full max-w-lg px-5 pb-28 pt-8">
        <p className="hanja-accent mb-2">運의結 · 리포트 구매</p>
        <h1 className="display-title text-3xl">결제</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          결제를 완료하면 당신의 사주 데이터를 기반으로 개인 리포트가 생성됩니다.
        </p>

        <OrnamentCard density="corners" className="mt-8 p-5">
          <p className="text-sm text-[var(--text-muted)]">선택 상품</p>
          <p className="display-title mt-2 text-xl">{checkout.productName}</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--gold-light)]">
            {formatKRW(checkout.amount)}
          </p>
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            주문번호 {checkout.orderNo}
          </p>
        </OrnamentCard>

        {checkout.paymentMode === "toss" ? (
          <div className="mt-6 space-y-4">
            <div
              id="toss-payment-methods"
              className="min-h-[180px] w-full overflow-hidden"
            />
            <div id="toss-agreement" className="w-full" />
          </div>
        ) : (
          <MysticPanel className="mt-6 border-dashed">
            <p className="text-sm font-medium text-[var(--text-primary)]">
              테스트 결제 (Mock)
            </p>
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              Toss 키가 없어 모의 결제 모드로 진행합니다. 실제 과금은 없습니다.
            </p>
          </MysticPanel>
        )}

        <label className="mt-6 flex items-start gap-3 text-sm text-[var(--text-secondary)]">
          <input
            type="checkbox"
            className="mt-1"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
          />
          <span>
            <Link href="/terms" className="underline">
              이용약관
            </Link>
            ,{" "}
            <Link href="/privacy" className="underline">
              개인정보처리방침
            </Link>
            ,{" "}
            <Link href="/refund" className="underline">
              환불정책
            </Link>
            에 동의합니다. (마케팅 동의는 별도)
          </span>
        </label>

        {error ? (
          <p
            role="alert"
            className="mt-4 border border-[var(--error-text)]/30 bg-[var(--error-bg)] px-4 py-3 text-sm text-[var(--error-text)]"
          >
            {error}
          </p>
        ) : null}

        <div className="fixed inset-x-0 bottom-[3.25rem] z-40 border-t border-[var(--border-subtle)] bg-[color-mix(in_oklab,var(--bg-primary)_92%,transparent)] px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md md:bottom-0">
          <div className="mx-auto max-w-lg">
            <Button
              size="full"
              onClick={() => void onPay()}
              disabled={loading || !widgetReady}
            >
              {loading
                ? "결제 창 여는 중..."
                : `${formatKRW(checkout.amount)} 결제하기`}
            </Button>
          </div>
        </div>
      </div>
    </MysticPage>
  );
}
