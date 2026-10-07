import { beforeEach, describe, expect, it } from "vitest";
import {
  createFreeFortune,
  resetMockFreeFlowState,
} from "@/lib/services/create-free-fortune";
import { createOrderForGuest } from "@/lib/services/create-order";
import { confirmTossPaymentForOwner } from "@/lib/services/confirm-payment";
import { getReportByOrderId } from "@/lib/repositories/reports";
import { resolvePaidProvider } from "@/lib/ai/config";
import { createGuestSessionId } from "@/lib/guest/session";
import { MOCK_PRODUCT_IDS } from "@/lib/mock-data";
import {
  isTossTestSandboxCheckoutAllowed,
  isCustomerPaidCheckoutOpen,
  isPgReviewMode,
} from "@/lib/payments/checkout-policy";

const sampleInput = {
  nickname: "토스샌드박스",
  gender: "female" as const,
  calendarType: "solar" as const,
  birthDate: "1991-02-02",
  birthTime: "08:00",
  birthTimeUnknown: false,
  lunarLeapMonth: false,
  birthPlace: "서울",
  maritalStatus: "unmarried" as const,
  hasChildren: null,
  timezone: "Asia/Seoul" as const,
};

describe("Toss test sandbox checkout", () => {
  beforeEach(() => {
    resetMockFreeFlowState();
    process.env.AI_PROVIDER = "mock";
    process.env.PAYMENT_PROVIDER = "toss";
    process.env.PAID_REPORT_LIVE_ENABLED = "false";
    delete process.env.ALLOW_PAID_QA_CHECKOUT;
    process.env.APP_ENV = "development";
    process.env.ALLOW_TOSS_CHECKOUT = "1";
    process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY = "test_ck_sandbox_client";
    process.env.TOSS_SECRET_KEY = "test_sk_sandbox_secret";
    process.env.ALLOW_MOCK_AI = "1";
    delete process.env.PG_REVIEW_MODE;
  });

  it("opens customer checkout with Toss TEST keys while live sales are off", () => {
    expect(isTossTestSandboxCheckoutAllowed()).toBe(true);
    expect(isCustomerPaidCheckoutOpen()).toBe(true);
  });

  it("keeps PG review mode separate from customer sales", () => {
    process.env.ALLOW_TOSS_CHECKOUT = "0";
    process.env.PG_REVIEW_MODE = "true";
    expect(isPgReviewMode()).toBe(true);
    expect(isCustomerPaidCheckoutOpen()).toBe(false);
  });

  it("creates a TOSS order without bank depositor name", async () => {
    const guest = createGuestSessionId();
    const free = await createFreeFortune({
      raw: sampleInput,
      guestSessionId: guest,
    });
    const created = await createOrderForGuest({
      guestSessionId: guest,
      productId: MOCK_PRODUCT_IDS.total,
      sourceResultId: free.freeResultId,
      paymentMethod: "TOSS",
    });
    expect(created.order.paymentMethod).toBe("TOSS");
    expect(created.checkoutUrl).toBe(`/checkout/${created.order.id}`);
    expect(created.waitUrl).toBe(`/checkout/${created.order.id}`);
    expect(created.bankAccount).toBeNull();
  });

  it("does not open sandbox checkout in production APP_ENV", () => {
    process.env.APP_ENV = "production";
    expect(isTossTestSandboxCheckoutAllowed()).toBe(false);
    expect(isCustomerPaidCheckoutOpen()).toBe(false);
  });

  it("uses mock paid provider for sandbox customers without live Gemini", () => {
    expect(resolvePaidProvider({ actor: "customer" })).toBe("mock");
    expect(() =>
      resolvePaidProvider({ actor: "customer", requestedProvider: "mock" })
    ).toThrow(/CUSTOMER_MOCK_PROVIDER_FORBIDDEN/);
  });

  it("delivers a paid report after mock confirm in toss sandbox", async () => {
    process.env.PAYMENT_PROVIDER = "mock";
    const guest = createGuestSessionId();
    const free = await createFreeFortune({
      raw: sampleInput,
      guestSessionId: guest,
    });
    const created = await createOrderForGuest({
      guestSessionId: guest,
      productId: MOCK_PRODUCT_IDS.total,
      sourceResultId: free.freeResultId,
      paymentMethod: "TOSS",
    });
    const confirmed = await confirmTossPaymentForOwner({
      guestSessionId: guest,
      orderIdParam: created.order.orderNo,
      paymentKey: `mock_pk_${created.order.orderNo}`,
      callbackAmount: created.order.amount,
    });
    expect(confirmed.alreadyPaid).toBe(false);
    const report = await getReportByOrderId(created.order.id);
    expect(report).toBeTruthy();
    expect(["COMPLETED", "GENERATING", "PAID", "FAILED"]).toContain(
      report!.generation_status
    );
    expect(report!.generation_status).toBe("COMPLETED");
  });
});
