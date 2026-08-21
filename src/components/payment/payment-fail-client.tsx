"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { MysticPage } from "@/components/mystic/celestial-background";
import { OrnamentCard } from "@/components/mystic/ornament-card";
import { trackClientEvent } from "@/lib/analytics/client";

export function PaymentFailClient() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const checkoutOrderId = searchParams.get("checkoutOrderId");
  const orderId = checkoutOrderId;

  useEffect(() => {
    trackClientEvent({
      eventName: "payment_fail",
      path: "/payment/fail",
      metadata: {
        // Safe code only — never raw provider dump
        code: code ? code.slice(0, 64) : "unknown",
      },
    });
  }, [code]);

  const retryHref = orderId ? `/checkout/${orderId}` : "/products";

  return (
    <MysticPage>
      <div className="mx-auto max-w-lg px-5 py-16 text-center">
        <p className="hanja-accent">PAYMENT</p>
        <h1 className="display-title mt-4 text-3xl">
          결제를 완료하지 못했습니다
        </h1>
        <OrnamentCard className="mt-8 p-6 text-left">
          <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
            결제는 처리되지 않았습니다. 다시 시도하거나 다른 결제수단을 이용해
            주세요.
          </p>
        </OrnamentCard>
        <div className="mt-8 flex flex-col gap-3">
          <Button asChild size="full">
            <Link href={retryHref}>다시 결제하기</Link>
          </Button>
          <Button asChild variant="outline" size="full">
            <Link href="/products">상품으로 돌아가기</Link>
          </Button>
        </div>
      </div>
    </MysticPage>
  );
}
