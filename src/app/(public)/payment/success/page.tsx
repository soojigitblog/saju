import { Suspense } from "react";
import { PaymentSuccessClient } from "@/components/payment/payment-success-client";
import { MysticPage } from "@/components/mystic/celestial-background";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "결제 완료",
  robots: { index: false, follow: false },
};

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <MysticPage>
          <div className="mx-auto max-w-lg px-5 py-16 text-center">
            <p className="hanja-accent">結 · PAYMENT</p>
            <p className="mt-6 text-sm text-[var(--text-secondary)]">
              결제를 확인하고 있습니다…
            </p>
          </div>
        </MysticPage>
      }
    >
      <PaymentSuccessClient />
    </Suspense>
  );
}
