import "server-only";

/**
 * Payment provider abstraction — keep business logic out of Toss-specific code.
 * MVP supports Toss (+ Mock for tests). Do not build a multi-PSP framework.
 */

export type PaymentProviderId = "TOSS" | "PORTONE" | "MOCK";

export type ConfirmPaymentInput = {
  paymentKey: string;
  /** Provider-facing order id (= orders.order_no for Toss). */
  orderId: string;
  amount: number;
};

export type ConfirmedPayment = {
  provider: PaymentProviderId;
  paymentKey: string;
  orderId: string;
  /** Approved total — must match DB order.amount. */
  approvedAmount: number;
  method: string | null;
  status: string;
  approvedAt: string | null;
  /** Redacted fields only — safe to persist. */
  redactedRaw: Record<string, unknown>;
};

export type PaymentConfirmErrorCode =
  | "PAYMENT_AMOUNT_MISMATCH"
  | "PAYMENT_PROVIDER_REJECTED"
  | "PAYMENT_ALREADY_PROCESSED"
  | "PAYMENT_INVALID_KEY"
  | "PAYMENT_PROVIDER_UNAVAILABLE"
  | "PAYMENT_CONFIG_ERROR";

export class PaymentConfirmError extends Error {
  readonly code: PaymentConfirmErrorCode;
  readonly status: number;
  readonly providerCode?: string;

  constructor(
    code: PaymentConfirmErrorCode,
    message: string,
    status = 400,
    providerCode?: string
  ) {
    super(message);
    this.name = "PaymentConfirmError";
    this.code = code;
    this.status = status;
    this.providerCode = providerCode;
  }
}

export interface PaymentProvider {
  readonly id: PaymentProviderId;
  confirm(input: ConfirmPaymentInput): Promise<ConfirmedPayment>;
}
