import { beforeEach, describe, expect, it, vi } from "vitest";
import { createGuestSessionId } from "@/lib/guest/session";
import { createFreeFortune, resetMockFreeFlowState } from "@/lib/services/create-free-fortune";
import { createOrderForGuest } from "@/lib/services/create-order";
import { confirmTossPaymentForOwner } from "@/lib/services/confirm-payment";
import { startPaidReportJob } from "@/lib/services/paid-report-job";
import { getPaidReportForOwner } from "@/lib/services/get-paid-report";
import { getOrderById } from "@/lib/repositories/orders";
import { getReportByOrderId } from "@/lib/repositories/reports";
import { MOCK_PRODUCT_IDS, mockProducts } from "@/lib/mock-data";
import { isAdultV2ReportData } from "@/lib/adult-v2/report-data";
import { adultV2ReportToPresentation } from "@/lib/adult-v2/presentation";
import * as adultGenerator from "@/lib/adult-v2/generate-report";

const input = {
  nickname: "실제연결검증",
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

describe("Adult V2 paid data connection (mock E2E)", () => {
  beforeEach(() => {
    resetMockFreeFlowState();
    process.env.AI_PROVIDER = "mock";
    process.env.AI_PROVIDER_PAID = "mock";
    process.env.PAYMENT_PROVIDER = "mock";
    process.env.PAID_REPORT_LIVE_ENABLED = "false";
    process.env.ADULT_REPORT_V2 = "true";
    process.env.ALLOW_PAID_QA_CHECKOUT = "1";
    process.env.ALLOW_MOCK_AI = "1";
  });

  async function createPaidV2() {
    const guest = createGuestSessionId();
    const free = await createFreeFortune({ raw: input, guestSessionId: guest });
    const created = await createOrderForGuest({
      guestSessionId: guest,
      productId: MOCK_PRODUCT_IDS.total,
      sourceResultId: free.freeResultId,
      paymentMethod: "TOSS",
      internalQaCheckout: true,
    });
    await confirmTossPaymentForOwner({
      guestSessionId: guest,
      orderIdParam: created.order.orderNo,
      paymentKey: `mock_adult_v2_${created.order.orderNo}`,
      callbackAmount: created.order.amount,
    });
    await startPaidReportJob({
      orderId: created.order.id,
      runGeneration: true,
      forceRetry: true,
      actor: "qa",
      requestedProvider: "mock",
    });
    return { guest, created, report: await getReportByOrderId(created.order.id) };
  }

  it("free → paid mock → persisted Adult V2 → reload uses the same stored report", async () => {
    const { guest, created, report } = await createPaidV2();
    expect(report?.generation_status).toBe("COMPLETED");
    expect(isAdultV2ReportData(report?.result_json)).toBe(true);
    const data = report!.result_json;
    if (!isAdultV2ReportData(data)) throw new Error("expected Adult V2 data");
    expect(data.reportVersion).toBe("adult-v2");
    expect(data.calculation.nextFiveYears).toHaveLength(5);
    expect(data.interpretation.years.map((item) => item.year)).toEqual(
      data.calculation.nextFiveYears.map((item) => item.year)
    );
    expect(JSON.stringify(data)).not.toContain("김결");
    expect(JSON.stringify(data)).not.toContain("THE STAR");
    expect(data.crossReading.status).toBe("unavailable");

    const reloaded = await getPaidReportForOwner({
      reportOrOrderId: report!.id,
      guestSessionId: guest,
    });
    expect(reloaded.report.result_json).toEqual(report!.result_json);
    expect(adultV2ReportToPresentation(data).tarotCardLabel).toBeNull();

    await startPaidReportJob({ orderId: created.order.id, runGeneration: true, actor: "qa", requestedProvider: "mock" });
    expect((await getReportByOrderId(created.order.id))?.id).toBe(report!.id);
  });

  it("denies another guest even when they know the V2 report id", async () => {
    const { report } = await createPaidV2();
    await expect(getPaidReportForOwner({ reportOrOrderId: report!.id, guestSessionId: createGuestSessionId() }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("AI failure keeps payment paid and is retryable", async () => {
    const spy = vi.spyOn(adultGenerator, "generateAdultV2ReportData").mockRejectedValueOnce(new Error("AI_FAIL"));
    const guest = createGuestSessionId();
    const free = await createFreeFortune({ raw: input, guestSessionId: guest });
    const created = await createOrderForGuest({ guestSessionId: guest, productId: MOCK_PRODUCT_IDS.total, sourceResultId: free.freeResultId, paymentMethod: "TOSS", internalQaCheckout: true });
    await confirmTossPaymentForOwner({ guestSessionId: guest, orderIdParam: created.order.orderNo, paymentKey: `mock_adult_fail_${created.order.orderNo}`, callbackAmount: created.order.amount });
    await startPaidReportJob({ orderId: created.order.id, runGeneration: true, forceRetry: true, actor: "qa", requestedProvider: "mock" });
    spy.mockRestore();
    expect((await getOrderById(created.order.id))?.status).toBe("PAID");
    expect((await getReportByOrderId(created.order.id))?.generation_status).toBe("FAILED");
    await startPaidReportJob({ orderId: created.order.id, runGeneration: true, forceRetry: true, actor: "qa", requestedProvider: "mock" });
    expect((await getReportByOrderId(created.order.id))?.generation_status).toBe("COMPLETED");
  });

  it("keeps V1 generation when the V2 rollout flag is off", async () => {
    process.env.ADULT_REPORT_V2 = "false";
    const total = mockProducts.find((product) => product.id === MOCK_PRODUCT_IDS.total)!;
    expect(total.slug).toBe("2026-total");
    const { report } = await createPaidV2();
    expect((report?.result_json as { reportVersion?: string } | null)?.reportVersion).not.toBe("adult-v2");
  });
});
