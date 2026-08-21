import Link from "next/link";
import { getGuestSessionId } from "@/lib/guest/cookie";
import { getCheckoutPageForOwner } from "@/lib/services/get-checkout";
import { FreeFlowError } from "@/lib/services/free-flow-errors";
import { CheckoutClient } from "@/components/checkout/checkout-client";
import { MysticPage } from "@/components/mystic/celestial-background";
import { Button } from "@/components/ui/button";
import type { CheckoutPageDTO } from "@/lib/services/get-checkout";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "결제",
  robots: { index: false, follow: false },
};

function Message({
  title,
  body,
  href,
  label,
}: {
  title: string;
  body: string;
  href: string;
  label: string;
}) {
  return (
    <MysticPage>
      <div className="mx-auto max-w-lg px-5 py-16 text-center">
        <p className="hanja-accent">CHECKOUT</p>
        <h1 className="display-title mt-4 text-2xl">{title}</h1>
        <p className="mt-4 text-sm text-[var(--text-secondary)]">{body}</p>
        <Button asChild className="mt-8" variant="outline">
          <Link href={href}>{label}</Link>
        </Button>
      </div>
    </MysticPage>
  );
}

type CheckoutModel =
  | { kind: "checkout"; checkout: CheckoutPageDTO }
  | {
      kind: "message";
      title: string;
      body: string;
      href: string;
      label: string;
    };

async function loadCheckout(orderId: string): Promise<CheckoutModel> {
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) {
    return {
      kind: "message",
      title: "주문을 찾을 수 없습니다",
      body: "결제 링크가 올바르지 않습니다.",
      href: "/products",
      label: "상품 목록으로",
    };
  }

  const guestSessionId = await getGuestSessionId();
  if (!guestSessionId) {
    return {
      kind: "message",
      title: "세션이 없습니다",
      body: "사주 결과 페이지에서 다시 들어와 주세요.",
      href: "/fortune",
      label: "사주 보기",
    };
  }

  try {
    const checkout = await getCheckoutPageForOwner({
      orderId,
      guestSessionId,
    });
    return { kind: "checkout", checkout };
  } catch (error) {
    if (error instanceof FreeFlowError) {
      if (error.code === "FORBIDDEN") {
        return {
          kind: "message",
          title: "접근할 수 없습니다",
          body: "다른 사람의 결제 페이지에는 접근할 수 없습니다.",
          href: "/products",
          label: "상품 목록으로",
        };
      }
      if (
        error.code === "PRICE_CHANGED" ||
        error.code === "PRODUCT_NOT_AVAILABLE"
      ) {
        return {
          kind: "message",
          title: error.message,
          body: "상품 페이지에서 다시 주문을 생성해 주세요.",
          href: "/products",
          label: "상품으로 돌아가기",
        };
      }
      if (error.code === "ORDER_NOT_PAYABLE") {
        return {
          kind: "message",
          title: error.message,
          body: "결제 상태를 확인해 주세요.",
          href: "/my-results",
          label: "내 결과 보기",
        };
      }
      return {
        kind: "message",
        title: "결제를 진행할 수 없습니다",
        body: error.message,
        href: "/products",
        label: "상품 목록으로",
      };
    }
    return {
      kind: "message",
      title: "오류가 발생했습니다",
      body: "잠시 후 다시 시도해 주세요.",
      href: "/products",
      label: "상품 목록으로",
    };
  }
}

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const model = await loadCheckout(id);

  if (model.kind === "checkout") {
    return <CheckoutClient checkout={model.checkout} />;
  }

  return (
    <Message
      title={model.title}
      body={model.body}
      href={model.href}
      label={model.label}
    />
  );
}
