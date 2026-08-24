import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFreeFortune,
  resetMockFreeFlowState,
} from "@/lib/services/create-free-fortune";
import { createOrderForGuest } from "@/lib/services/create-order";
import { confirmTossPaymentForOwner } from "@/lib/services/confirm-payment";
import {
  adminRetryPaidReportGeneration,
  startPaidReportJob,
} from "@/lib/services/paid-report-job";
import { createGuestSessionId } from "@/lib/guest/session";
import { MOCK_PRODUCT_IDS } from "@/lib/mock-data";
import { getOrderById } from "@/lib/repositories/orders";
import { getReportByOrderId } from "@/lib/repositories/reports";
import { mockStore } from "@/lib/mock-store";
import * as freeInterpreter from "@/lib/ai/interpreters/free-interpreter";

const sampleInput = {
  nickname: "유료테스트",
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

describe("PHASE 6.5 paid report blocker fix (mock)", () => {
  beforeEach(() => {
    resetMockFreeFlowState();
    process.env.AI_PROVIDER = "mock";
    process.env.PAYMENT_PROVIDER = "mock";
    vi.restoreAllMocks();
  });

  async function seedPaidOrder() {
    const guest = createGuestSessionId();
    const free = await createFreeFortune({
      raw: sampleInput,
      guestSessionId: guest,
    });
    const created = await createOrderForGuest({
      guestSessionId: guest,
      productId: MOCK_PRODUCT_IDS.money,
      sourceResultId: free.freeResultId,
      paymentMethod: "TOSS",
    });
    await confirmTossPaymentForOwner({
      guestSessionId: guest,
      orderIdParam: created.order.orderNo,
      paymentKey: `mock_pk_${created.order.orderNo}`,
      callbackAmount: created.order.amount,
    });
    return { guest, orderId: created.order.id };
  }

  it("keeps order PAID when AI generation fails", async () => {
    vi.spyOn(freeInterpreter, "generatePaidInterpretation").mockRejectedValue(
      new Error("GEMINI_INVALID_ARGUMENT")
    );

    const { orderId } = await seedPaidOrder();
    await startPaidReportJob({ orderId, runGeneration: true, forceRetry: true });

    const order = await getOrderById(orderId);
    const report = await getReportByOrderId(orderId);
    expect(order?.paid_at).toBeTruthy();
    expect(order?.status).toBe("PAID");
    expect(report?.generation_status).toBe("FAILED");

    const gens = [...mockStore.aiGenerations.values()].filter(
      (g) => g.order_id === orderId && g.result_type === "paid"
    );
    expect(gens.length).toBeGreaterThanOrEqual(1);
    expect(gens.some((g) => g.status === "FAILED")).toBe(true);
  });

  it("recovers legacy FAILED order with paid_at via admin retry", async () => {
    const { orderId } = await seedPaidOrder();
    const order = await getOrderById(orderId);
    if (order) {
      mockStore.orders.set(orderId, { ...order, status: "FAILED" });
    }
    const report = await getReportByOrderId(orderId);
    if (report) {
      mockStore.reports.set(report.id, {
        ...report,
        generation_status: "FAILED",
        attempt_count: 1,
      });
    }

    const result = await adminRetryPaidReportGeneration({ orderId });
    expect(result.status).toBe("COMPLETED");

    const recovered = await getOrderById(orderId);
    expect(recovered?.status).toBe("COMPLETED");
    expect(recovered?.paid_at).toBeTruthy();
  });

  it("dedupes completed paid generation on retry", async () => {
    const { orderId } = await seedPaidOrder();
    const first = await startPaidReportJob({
      orderId,
      runGeneration: true,
      forceRetry: true,
    });
    expect(first.status).toBe("COMPLETED");

    const spy = vi.spyOn(freeInterpreter, "generatePaidInterpretation");
    const second = await startPaidReportJob({
      orderId,
      runGeneration: true,
    });
    expect(second.status).toBe("COMPLETED");
    expect(spy).not.toHaveBeenCalled();
  });
});
