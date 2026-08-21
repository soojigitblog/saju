import { Suspense } from "react";
import { PaymentFailClient } from "@/components/payment/payment-fail-client";
import { MysticPage } from "@/components/mystic/celestial-background";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "결제 실패",
  robots: { index: false, follow: false },
};

export default function PaymentFailPage() {
  return (
    <Suspense
      fallback={
        <MysticPage>
          <div className="mx-auto max-w-lg px-5 py-16 text-center">
            <p className="text-sm text-[var(--text-secondary)]">불러오는 중…</p>
          </div>
        </MysticPage>
      }
    >
      <PaymentFailClient />
    </Suspense>
  );
}
