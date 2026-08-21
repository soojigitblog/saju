import "server-only";

import {
  PaymentConfirmError,
  type ConfirmedPayment,
  type ConfirmPaymentInput,
  type PaymentProvider,
} from "@/lib/payments/provider";

/**
 * In-process mock for E2E / local without Toss.
 * Production must never select this provider.
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly id = "MOCK" as const;

  async confirm(input: ConfirmPaymentInput): Promise<ConfirmedPayment> {
    if (process.env.NODE_ENV === "production" && process.env.ALLOW_MOCK_PAYMENT !== "1") {
      throw new PaymentConfirmError(
        "PAYMENT_CONFIG_ERROR",
        "운영 환경에서 mock 결제는 사용할 수 없습니다.",
        503
      );
    }

    if (!input.paymentKey || input.paymentKey.startsWith("invalid_")) {
      throw new PaymentConfirmError(
        "PAYMENT_INVALID_KEY",
        "유효하지 않은 결제 정보입니다.",
        400,
        "MOCK_INVALID_KEY"
      );
    }

    if (input.paymentKey.startsWith("mismatch_")) {
      throw new PaymentConfirmError(
        "PAYMENT_AMOUNT_MISMATCH",
        "결제 금액이 일치하지 않습니다.",
        400
      );
    }

    return {
      provider: "MOCK",
      paymentKey: input.paymentKey,
      orderId: input.orderId,
      approvedAmount: input.amount,
      method: "MOCK_CARD",
      status: "DONE",
      approvedAt: new Date().toISOString(),
      redactedRaw: {
        orderId: input.orderId,
        status: "DONE",
        totalAmount: input.amount,
        method: "MOCK_CARD",
        paymentKeyFingerprint: "mock…key",
      },
    };
  }
}
