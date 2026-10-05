import "server-only";

import { PaymentClient } from "@portone/server-sdk";
import { isUnrecognizedPayment } from "@portone/server-sdk/payment";
import { PaymentConfirmError, type ConfirmedPayment, type ConfirmPaymentInput, type PaymentProvider } from "@/lib/payments/provider";

function secret(): string {
  const value = process.env.PORTONE_API_SECRET?.trim() ?? "";
  if (!value) throw new PaymentConfirmError("PAYMENT_CONFIG_ERROR", "PortOne 샌드박스 설정이 완료되지 않았습니다.", 503);
  return value;
}

/** Re-fetches the payment: browser redirects are never proof of payment. */
export async function portoneVerifyPayment(input: ConfirmPaymentInput): Promise<ConfirmedPayment> {
  try {
    const payment = await PaymentClient({ secret: secret() }).getPayment({ paymentId: input.paymentKey });
    if (isUnrecognizedPayment(payment) || payment.status !== "PAID") {
      throw new PaymentConfirmError("PAYMENT_PROVIDER_REJECTED", "승인된 결제를 확인하지 못했습니다.", 400);
    }
    const customData = typeof payment.customData === "string"
      ? payment.customData
      : payment.customData && typeof payment.customData === "object" && "orderNo" in payment.customData
        ? String(payment.customData.orderNo)
        : "";
    if (payment.amount.total !== input.amount || payment.currency !== "KRW" || customData !== input.orderId) {
      throw new PaymentConfirmError("PAYMENT_AMOUNT_MISMATCH", "결제 정보가 주문과 일치하지 않습니다.", 400);
    }
    return {
      provider: "PORTONE", paymentKey: payment.id, orderId: input.orderId,
      approvedAmount: payment.amount.total, method: payment.method?.type ? String(payment.method.type) : null,
      status: payment.status, approvedAt: payment.paidAt,
      redactedRaw: { paymentId: payment.id, status: payment.status, amount: payment.amount.total, currency: payment.currency, method: payment.method?.type ?? null },
    };
  } catch (error) {
    if (error instanceof PaymentConfirmError) throw error;
    throw new PaymentConfirmError("PAYMENT_PROVIDER_UNAVAILABLE", "결제 정보를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.", 502);
  }
}

export class PortOnePaymentProvider implements PaymentProvider {
  readonly id = "PORTONE" as const;
  confirm(input: ConfirmPaymentInput) { return portoneVerifyPayment(input); }
}
