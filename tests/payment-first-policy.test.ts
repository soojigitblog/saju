/**
 * P6.2 payment-first policy — checkout separated from AI generation.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFreeFortune,
  resetMockFreeFlowState,
} from "@/lib/services/create-free-fortune";
import { createOrderForGuest } from "@/lib/services/create-order";
import { confirmTossPaymentForOwner } from "@/lib/services/confirm-payment";
import { startPaidReportJob } from "@/lib/services/paid-report-job";
import { createGuestSessionId } from "@/lib/guest/session";
import { MOCK_PRODUCT_IDS } from "@/lib/mock-data";
import { getOrderById } from "@/lib/repositories/orders";
import { getReportByOrderId } from "@/lib/repositories/reports";
import {
  isPaidCheckoutEnabled,
  isPaidReportGenerationEnabled,
  resolveEffectivePaidProviderForCustomer,
  resolvePaidProvider,
} from "@/lib/ai/config";
import { PAID_REPORT_WAITING_ERROR_CODE } from "@/lib/services/paid-report-waiting";
import * as freeInterpreter from "@/lib/ai/interpreters/free-interpreter";

const sampleInput = {
  nickname: "P62",
  gender: "female" as const,
  calendarType: "solar" as const,
  birthDate: "1990-05-15",
  birthTime: "10:30",
  birthTimeUnknown: false,
  lunarLeapMonth: false,
  birthPlace: "서울",
  maritalStatus: "unmarried" as const,
  hasChildren: null,
  timezone: "Asia/Seoul" as const,
};

describe("P6.2 payment-first policy", () => {
  beforeEach(() => {
    resetMockFreeFlowState();
    process.env.AI_PROVIDER = "mock";
    process.env.AI_PROVIDER_PAID = "gemini";
    process.env.ALLOW_TOSS_CHECKOUT = "1";
    process.env.ALLOW_MOCK_AI = "1";
    process.env.PAID_CHECKOUT_ENABLED = "true";
    process.env.PAID_REPORT_GENERATION_ENABLED = "false";
    process.env.PAID_REPORT_LIVE_ENABLED = "false";
    delete process.env.GEMINI_API_KEY_PAID;
  });

  it("CASE 1: checkout ON + generation OFF → PAID + WAITING_FOR_AI, no Gemini", async () => {
    const guest = createGuestSessionId();
    const free = await createFreeFortune({ raw: sampleInput, guestSessionId: guest });
    const created = await createOrderForGuest({
      guestSessionId: guest,
      productId: MOCK_PRODUCT_IDS.money,
      sourceResultId: free.freeResultId,
      paymentMethod: "TOSS",
    });

    const genSpy = vi.spyOn(freeInterpreter, "generatePaidInterpretation");

    await confirmTossPaymentForOwner({
      guestSessionId: guest,
      orderIdParam: created.order.orderNo,
      paymentKey: `mock_pk_1_${created.order.orderNo}`,
      callbackAmount: created.order.amount,
    });

    expect(genSpy).not.toHaveBeenCalled();
    genSpy.mockRestore();

    const order = await getOrderById(created.order.id);
    const report = await getReportByOrderId(created.order.id);
    expect(order?.status).toBe("PAID");
    expect(order?.paid_at).toBeTruthy();
    expect(report?.generation_status).toBe("PENDING");
    expect(report?.error_code).toBe(PAID_REPORT_WAITING_ERROR_CODE);
  });

  it("CASE 2: customer forced generation API → blocked", async () => {
    expect(() => resolveEffectivePaidProviderForCustomer()).toThrow(
      /PAID_GENERATION_DISABLED/
    );
    expect(() =>
      resolvePaidProvider({ actor: "customer", requestedProvider: "mock" })
    ).toThrow(/CUSTOMER_MOCK_PROVIDER_FORBIDDEN/);
  });

  it("checkout disabled when PAID_CHECKOUT_ENABLED=false", async () => {
    process.env.PAID_CHECKOUT_ENABLED = "false";
    expect(isPaidCheckoutEnabled()).toBe(false);
    expect(isPaidReportGenerationEnabled()).toBe(false);

    const guest = createGuestSessionId();
    const free = await createFreeFortune({ raw: sampleInput, guestSessionId: guest });
    await expect(
      createOrderForGuest({
        guestSessionId: guest,
        productId: MOCK_PRODUCT_IDS.money,
        sourceResultId: free.freeResultId,
        paymentMethod: "TOSS",
      })
    ).rejects.toMatchObject({ code: "PAID_CHECKOUT_DISABLED" });
  });

  it("CASE 4: paid key missing preserves PAID order as WAITING_FOR_AI", async () => {
    const guest = createGuestSessionId();
    const free = await createFreeFortune({ raw: sampleInput, guestSessionId: guest });
    const created = await createOrderForGuest({
      guestSessionId: guest,
      productId: MOCK_PRODUCT_IDS.career,
      sourceResultId: free.freeResultId,
      paymentMethod: "TOSS",
    });
    await confirmTossPaymentForOwner({
      guestSessionId: guest,
      orderIdParam: created.order.orderNo,
      paymentKey: `mock_pk_4_${created.order.orderNo}`,
      callbackAmount: created.order.amount,
    });
    const result = await startPaidReportJob({
      orderId: created.order.id,
      runGeneration: true,
      actor: "customer",
      forceRetry: true,
    });
    expect(result.status).toBe("PENDING");
    const order = await getOrderById(created.order.id);
    expect(order?.status).toBe("PAID");
  });
});
