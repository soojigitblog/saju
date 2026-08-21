import { getGuestSessionId } from "@/lib/guest/cookie";
import { getOrderById } from "@/lib/repositories/orders";
import { BankTransferWaitClient } from "@/components/payment/bank-transfer-wait-client";
import { MysticPage } from "@/components/mystic/celestial-background";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "계좌이체 입금 안내",
  robots: { index: false, follow: false },
};

export default async function BankTransferWaitPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) {
    return (
      <MysticPage>
        <div className="mx-auto max-w-lg px-5 py-16 text-center">
          <h1 className="display-title text-2xl">주문을 찾을 수 없습니다</h1>
          <Button asChild className="mt-8" variant="outline">
            <Link href="/products">상품 목록</Link>
          </Button>
        </div>
      </MysticPage>
    );
  }

  const guest = await getGuestSessionId();
  if (!guest) {
    return (
      <MysticPage>
        <div className="mx-auto max-w-lg px-5 py-16 text-center">
          <h1 className="display-title text-2xl">세션이 없습니다</h1>
          <Button asChild className="mt-8" variant="outline">
            <Link href="/fortune">사주 보기</Link>
          </Button>
        </div>
      </MysticPage>
    );
  }

  const order = await getOrderById(orderId);
  if (!order || order.guest_session_id !== guest) {
    return (
      <MysticPage>
        <div className="mx-auto max-w-lg px-5 py-16 text-center">
          <h1 className="display-title text-2xl">접근할 수 없습니다</h1>
          <Button asChild className="mt-8" variant="outline">
            <Link href="/products">상품 목록</Link>
          </Button>
        </div>
      </MysticPage>
    );
  }

  return <BankTransferWaitClient orderId={orderId} />;
}
