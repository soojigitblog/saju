import "server-only";

import { FreeFlowError } from "@/lib/services/free-flow-errors";
import { getFreeResultById } from "@/lib/repositories/free-results";
import { getProfileById } from "@/lib/repositories/profiles";
import { getProductById } from "@/lib/repositories/products";
import {
  createGuestOrder,
  findReusablePendingOrder,
  toOrderPublicDTO,
  type OrderPublicDTO,
} from "@/lib/repositories/orders";
import { createOrderNo } from "@/lib/orders/order-no";
import { assertPaymentMutationRateLimit } from "@/lib/payments/rate-limit";
import { trackEvent } from "@/lib/repositories/analytics";
import { normalizeDepositorName } from "@/lib/bank/hana/transaction-normalizer";
import {
  getBankTransferPublicAccount,
  isBankTransferAccountConfigured,
} from "@/lib/bank/account-public";

export type CreateOrderResult = {
  order: OrderPublicDTO;
  checkoutUrl: string;
  waitUrl: string;
  reused: boolean;
  bankAccount: ReturnType<typeof getBankTransferPublicAccount> | null;
};

function bankTransferTtlHours(): number {
  const n = Number(process.env.BANK_TRANSFER_ORDER_TTL_HOURS ?? "24");
  return Number.isFinite(n) && n > 0 ? n : 24;
}

/**
 * Server-only order creation.
 * Default payment method: BANK_TRANSFER (Toss preserved, UI-hidden for now).
 * Client amount/price is never trusted.
 */
export async function createOrderForGuest(input: {
  guestSessionId: string;
  productId: string;
  sourceResultId: string;
  depositorName?: string;
  paymentMethod?: "BANK_TRANSFER" | "TOSS";
  analyticsSessionId?: string;
}): Promise<CreateOrderResult> {
  assertPaymentMutationRateLimit({
    bucket: "order_create",
    guestSessionId: input.guestSessionId,
  });

  const paymentMethod = input.paymentMethod ?? "BANK_TRANSFER";
  if (paymentMethod === "TOSS") {
    const tossAllowed =
      process.env.ALLOW_TOSS_CHECKOUT === "1" ||
      process.env.NODE_ENV === "test";
    if (!tossAllowed) {
      throw new FreeFlowError(
        "PAYMENT_METHOD_UNAVAILABLE",
        "카드 결제는 준비 중입니다. 계좌이체를 이용해 주세요.",
        400
      );
    }
  }

  let depositor = "";
  let depositorNormalized: string | null = null;
  if (paymentMethod === "BANK_TRANSFER") {
    if (!isBankTransferAccountConfigured()) {
      throw new FreeFlowError(
        "BANK_ACCOUNT_NOT_CONFIGURED",
        "계좌이체 결제가 준비 중입니다. 잠시 후 다시 시도해 주세요.",
        503
      );
    }
    depositor = normalizeDepositorName(input.depositorName ?? "");
    if (depositor.length < 2 || depositor.length > 40) {
      throw new FreeFlowError(
        "INVALID_DEPOSITOR",
        "입금자명을 2자 이상 입력해 주세요.",
        400
      );
    }
    depositorNormalized = depositor;
  }

  if (!/^[0-9a-f-]{36}$/i.test(input.productId)) {
    throw new FreeFlowError("INVALID_PRODUCT", "상품을 확인해 주세요.", 400);
  }
  if (!/^[0-9a-f-]{36}$/i.test(input.sourceResultId)) {
    throw new FreeFlowError(
      "INVALID_SOURCE_RESULT",
      "사주 결과를 확인해 주세요.",
      400
    );
  }

  const product = await getProductById(input.productId);
  if (!product || product.status !== "ACTIVE") {
    throw new FreeFlowError(
      "PRODUCT_NOT_AVAILABLE",
      "현재 구매할 수 없는 상품입니다.",
      400
    );
  }

  if (product.productType === "tarot") {
    throw new FreeFlowError(
      "PRODUCT_NOT_AVAILABLE",
      "현재 구매할 수 없는 상품입니다.",
      400
    );
  }

  const free = await getFreeResultById(input.sourceResultId);
  if (!free || free.generation_status !== "COMPLETED") {
    throw new FreeFlowError("NOT_FOUND", "사주 결과를 찾을 수 없습니다.", 404);
  }

  const profile = await getProfileById(free.profile_id);
  if (!profile || profile.guest_session_id !== input.guestSessionId) {
    throw new FreeFlowError("FORBIDDEN", "접근 권한이 없습니다.", 403);
  }

  const amount = product.salePrice;
  if (amount < 0) {
    throw new FreeFlowError("INVALID_PRICE", "상품 가격이 올바르지 않습니다.", 400);
  }

  const reusable = await findReusablePendingOrder({
    guestSessionId: input.guestSessionId,
    productId: product.id,
    sourceResultId: free.id,
    expectedAmount: amount,
  });

  if (reusable && reusable.payment_method === paymentMethod) {
    return {
      order: toOrderPublicDTO(reusable),
      checkoutUrl:
        paymentMethod === "BANK_TRANSFER"
          ? `/payment/bank/${reusable.id}`
          : `/checkout/${reusable.id}`,
      waitUrl: `/payment/bank/${reusable.id}`,
      reused: true,
      bankAccount:
        paymentMethod === "BANK_TRANSFER"
          ? getBankTransferPublicAccount()
          : null,
    };
  }

  const expiresAt =
    paymentMethod === "BANK_TRANSFER"
      ? new Date(
          Date.now() + bankTransferTtlHours() * 60 * 60 * 1000
        ).toISOString()
      : null;

  const order = await createGuestOrder({
    order_no: createOrderNo(),
    guest_session_id: input.guestSessionId,
    profile_id: profile.id,
    product_id: product.id,
    source_result_id: free.id,
    amount,
    currency: "KRW",
    product_name_snapshot: product.name,
    payment_method: paymentMethod,
    depositor_name: depositor || null,
    depositor_name_normalized: depositorNormalized,
    expires_at: expiresAt,
    status: "PENDING",
  });

  try {
    await trackEvent({
      sessionId: input.analyticsSessionId ?? input.guestSessionId,
      eventName: "checkout_start",
      productId: product.id,
      metadata: {
        orderId: order.id,
        amount: order.amount,
        paymentMethod,
        reused: false,
      },
    });
  } catch {
    /* analytics best-effort */
  }

  return {
    order: toOrderPublicDTO(order),
    checkoutUrl:
      paymentMethod === "BANK_TRANSFER"
        ? `/payment/bank/${order.id}`
        : `/checkout/${order.id}`,
    waitUrl: `/payment/bank/${order.id}`,
    reused: false,
    bankAccount:
      paymentMethod === "BANK_TRANSFER"
        ? getBankTransferPublicAccount()
        : null,
  };
}
