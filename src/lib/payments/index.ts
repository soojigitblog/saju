import "server-only";

import type { PaymentProvider } from "@/lib/payments/provider";
import { MockPaymentProvider } from "@/lib/payments/mock-provider";
import { TossPaymentProvider } from "@/lib/payments/toss/server";

/**
 * Resolve payment provider.
 * - PAYMENT_PROVIDER=mock → Mock (tests / local without Toss)
 * - Otherwise Toss when TOSS_SECRET_KEY is set
 * - Test/dev without Toss keys falls back to Mock
 * - Production without keys fails closed at confirm time
 */
export function getPaymentProvider(): PaymentProvider {
  const explicit = (process.env.PAYMENT_PROVIDER ?? "").toLowerCase();
  if (explicit === "mock") {
    return new MockPaymentProvider();
  }

  // Explicit toss — never silently fall back to mock (PHASE 6.1)
  if (explicit === "toss") {
    return new TossPaymentProvider();
  }

  const secret = process.env.TOSS_SECRET_KEY?.trim() ?? "";
  if (secret) {
    return new TossPaymentProvider();
  }

  if (process.env.NODE_ENV === "production") {
    return new TossPaymentProvider(); // will throw PAYMENT_CONFIG_ERROR on use
  }

  return new MockPaymentProvider();
}

export function getPublicPaymentMode(): "toss" | "mock" {
  const provider = getPaymentProvider();
  return provider.id === "MOCK" ? "mock" : "toss";
}
