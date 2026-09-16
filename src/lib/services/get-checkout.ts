import "server-only";

import { FreeFlowError } from "@/lib/services/free-flow-errors";
import { getOrderById, toOrderPublicDTO } from "@/lib/repositories/orders";
import { getProductById } from "@/lib/repositories/products";
import { getProfileById } from "@/lib/repositories/profiles";
import { getPublicPaymentMode } from "@/lib/payments";
import { getTossClientKey } from "@/lib/payments/toss/client";
import { isTossTestKeyPair } from "@/lib/payments/checkout-policy";

export type CheckoutPageDTO = {
  orderId: string;
  orderNo: string;
  amount: number;
  currency: "KRW";
  productName: string;
  productSlug: string | null;
  customerName: string | null;
  clientKey: string | null;
  paymentMode: "toss" | "mock";
  customerKey: string;
  testMode: boolean;
};

export async function getCheckoutPageForOwner(input: {
  orderId: string;
  guestSessionId: string;
}): Promise<CheckoutPageDTO> {
  const order = await getOrderById(input.orderId);
  if (!order) {
    throw new FreeFlowError("NOT_FOUND", "주문을 찾을 수 없습니다.", 404);
  }
  if (order.guest_session_id !== input.guestSessionId) {
    throw new FreeFlowError("FORBIDDEN", "접근 권한이 없습니다.", 403);
  }
  if (order.status !== "PENDING") {
    throw new FreeFlowError(
      "ORDER_NOT_PAYABLE",
      order.status === "PAID" ||
        order.status === "GENERATING" ||
        order.status === "COMPLETED"
        ? "이미 결제가 완료된 주문입니다."
        : "결제할 수 없는 주문입니다.",
      400
    );
  }

  const product = await getProductById(order.product_id);
  if (!product || product.status !== "ACTIVE") {
    throw new FreeFlowError(
      "PRODUCT_NOT_AVAILABLE",
      "현재 구매할 수 없는 상품입니다. 상품 페이지에서 다시 시도해 주세요.",
      400
    );
  }

  // Price drift: do not silently update PENDING amount — force new order.
  if (product.salePrice !== order.amount) {
    throw new FreeFlowError(
      "PRICE_CHANGED",
      "상품 가격이 변경되었습니다. 상품 페이지에서 다시 주문해 주세요.",
      409
    );
  }

  const profile = await getProfileById(order.profile_id);
  const paymentMode = getPublicPaymentMode();
  const clientKey =
    paymentMode === "toss" ? getTossClientKey() || null : null;

  if (paymentMode === "toss" && !clientKey) {
    throw new FreeFlowError(
      "PAYMENT_CONFIG_ERROR",
      "결제 설정이 완료되지 않았습니다.",
      503
    );
  }

  // Toss customerKey: stable per guest, not PII
  const customerKey = `guest_${input.guestSessionId.replace(/-/g, "").slice(0, 40)}`;

  return {
    orderId: order.id,
    orderNo: order.order_no,
    amount: order.amount,
    currency: "KRW",
    productName: order.product_name_snapshot ?? product.name,
    productSlug: product.slug,
    customerName: profile?.nickname ?? null,
    clientKey,
    paymentMode,
    customerKey,
    testMode: paymentMode === "toss" && isTossTestKeyPair(),
  };
}

export function toCheckoutPublic(orderDTO: ReturnType<typeof toOrderPublicDTO>) {
  return orderDTO;
}
