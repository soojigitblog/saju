import "server-only";

import {
  PaymentConfirmError,
  type ConfirmedPayment,
  type ConfirmPaymentInput,
  type PaymentProvider,
} from "@/lib/payments/provider";
import {
  mapTossMethod,
  redactTossPaymentResponse,
} from "@/lib/payments/toss/mapper";
import type { TossErrorBody, TossPaymentObject } from "@/lib/payments/toss/types";

const TOSS_CONFIRM_URL = "https://api.tosspayments.com/v1/payments/confirm";

export function getTossSecretKey(): string {
  const key = process.env.TOSS_SECRET_KEY?.trim() ?? "";
  if (!key) {
    throw new PaymentConfirmError(
      "PAYMENT_CONFIG_ERROR",
      "결제 설정이 완료되지 않았습니다.",
      503
    );
  }
  assertTossSecretSafeForEnv(key);
  return key;
}

/**
 * Block accidental production secret use outside production.
 * Test keys typically start with test_sk_ / test_gsk_.
 */
export function assertTossSecretSafeForEnv(secret: string): void {
  const isLive =
    secret.startsWith("live_sk_") || secret.startsWith("live_gsk_");
  const nodeEnv = process.env.NODE_ENV;
  const appEnv = (process.env.APP_ENV ?? "").toLowerCase();

  if (isLive && nodeEnv !== "production") {
    throw new PaymentConfirmError(
      "PAYMENT_CONFIG_ERROR",
      "개발 환경에서 운영 결제 키를 사용할 수 없습니다.",
      503
    );
  }
  if (isLive && appEnv && appEnv !== "production") {
    throw new PaymentConfirmError(
      "PAYMENT_CONFIG_ERROR",
      "비운영 APP_ENV에서 운영 결제 키를 사용할 수 없습니다.",
      503
    );
  }
}

function basicAuthHeader(secret: string): string {
  const token = Buffer.from(`${secret}:`, "utf8").toString("base64");
  return `Basic ${token}`;
}

export async function tossConfirmPayment(
  input: ConfirmPaymentInput
): Promise<ConfirmedPayment> {
  const secret = getTossSecretKey();
  let response: Response;
  try {
    response = await fetch(TOSS_CONFIRM_URL, {
      method: "POST",
      headers: {
        Authorization: basicAuthHeader(secret),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        paymentKey: input.paymentKey,
        orderId: input.orderId,
        amount: input.amount,
      }),
    });
  } catch {
    throw new PaymentConfirmError(
      "PAYMENT_PROVIDER_UNAVAILABLE",
      "결제 서비스에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.",
      502
    );
  }

  const body = (await response.json().catch(() => ({}))) as
    | TossPaymentObject
    | TossErrorBody;

  if (!response.ok) {
    const err = body as TossErrorBody;
    const code = err.code ?? "UNKNOWN";
    if (code === "ALREADY_PROCESSED_PAYMENT") {
      throw new PaymentConfirmError(
        "PAYMENT_ALREADY_PROCESSED",
        "이미 처리된 결제입니다.",
        409,
        code
      );
    }
    if (
      code === "NOT_FOUND_PAYMENT_SESSION" ||
      code === "NOT_FOUND_PAYMENT" ||
      code === "INVALID_PAYMENT_KEY"
    ) {
      throw new PaymentConfirmError(
        "PAYMENT_INVALID_KEY",
        "유효하지 않은 결제 정보입니다.",
        400,
        code
      );
    }
    throw new PaymentConfirmError(
      "PAYMENT_PROVIDER_REJECTED",
      "결제 승인이 거절되었습니다.",
      400,
      code
    );
  }

  const payment = body as TossPaymentObject;
  if (
    typeof payment.totalAmount !== "number" ||
    payment.totalAmount !== input.amount
  ) {
    throw new PaymentConfirmError(
      "PAYMENT_AMOUNT_MISMATCH",
      "결제 금액이 일치하지 않습니다.",
      400
    );
  }

  return {
    provider: "TOSS",
    paymentKey: payment.paymentKey,
    orderId: payment.orderId,
    approvedAmount: payment.totalAmount,
    method: mapTossMethod(payment),
    status: payment.status,
    approvedAt: payment.approvedAt ?? new Date().toISOString(),
    redactedRaw: {
      ...redactTossPaymentResponse(payment),
      // Distinguish local TEST traffic from future production revenue
      appEnv: process.env.APP_ENV ?? process.env.NODE_ENV ?? "unknown",
      keyMode: process.env.TOSS_SECRET_KEY?.startsWith("live_")
        ? "live"
        : "test",
    },
  };
}

export class TossPaymentProvider implements PaymentProvider {
  readonly id = "TOSS" as const;

  confirm(input: ConfirmPaymentInput): Promise<ConfirmedPayment> {
    return tossConfirmPayment(input);
  }
}
