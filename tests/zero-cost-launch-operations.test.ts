/**
 * P6.3 zero-cost launch operations — no Paid Gemini calls.
 */
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
import {
  getReportByOrderId,
  listWaitingForAiReports,
} from "@/lib/repositories/reports";
import {
  isPaidCheckoutEnabled,
  isPaidReportGenerationEnabled,
  resolvePaidProvider,
} from "@/lib/ai/config";
import { PAID_REPORT_WAITING_ERROR_CODE } from "@/lib/services/paid-report-waiting";
import {
  isPaidReportOperationalFailure,
  shouldNotifyPaidReportFailure,
} from "@/lib/services/paid-report-failure-policy";
import { canAdminTriggerPaidGeneration } from "@/lib/services/paid-report-generation-readiness";
import { serveConsultingPdf } from "@/lib/services/serve-consulting-pdf";
import { FreeFlowError } from "@/lib/services/free-flow-errors";
import * as freeInterpreter from "@/lib/ai/interpreters/free-interpreter";
import * as notifications from "@/lib/notifications";

const sampleInput = {
  nickname: "P63",
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

function applyZeroCostEnv() {
  process.env.AI_PROVIDER = "mock";
  process.env.AI_PROVIDER_PAID = "gemini";
  process.env.ALLOW_TOSS_CHECKOUT = "1";
  process.env.ALLOW_MOCK_AI = "1";
  process.env.PAID_CHECKOUT_ENABLED = "true";
  process.env.PAID_REPORT_GENERATION_ENABLED = "false";
  process.env.PAID_REPORT_LIVE_ENABLED = "false";
  delete process.env.GEMINI_API_KEY_PAID;
}

describe("P6.3 zero-cost launch operations", () => {
  beforeEach(() => {
    resetMockFreeFlowState();
    applyZeroCostEnv();
  });

  it("legacy flag precedence: explicit checkout/generation wins over legacy live=false", () => {
    expect(isPaidCheckoutEnabled()).toBe(true);
    expect(isPaidReportGenerationEnabled()).toBe(false);
  });

  it("WAITING_FOR_AI excluded from failure metrics and alerts", () => {
    expect(
      isPaidReportOperationalFailure(PAID_REPORT_WAITING_ERROR_CODE, "PENDING")
    ).toBe(false);
    expect(
      shouldNotifyPaidReportFailure(PAID_REPORT_WAITING_ERROR_CODE, "PENDING")
    ).toBe(false);
    expect(isPaidReportOperationalFailure("PAID_AI_NOT_CONFIGURED")).toBe(
      false
    );
  });

  it("CASE A: purchase → confirm → PAID + WAITING_FOR_AI, Gemini calls 0", async () => {
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

    const genSpy = vi.spyOn(freeInterpreter, "generatePaidInterpretation");
    const notifySpy = vi
      .spyOn(notifications, "notifyPaidOrderConfirmed")
      .mockResolvedValue({ sent: 1, skipped: false });

    await confirmTossPaymentForOwner({
      guestSessionId: guest,
      orderIdParam: created.order.orderNo,
      paymentKey: `mock_pk_a_${created.order.orderNo}`,
      callbackAmount: created.order.amount,
    });

    expect(genSpy).not.toHaveBeenCalled();
    genSpy.mockRestore();

    const order = await getOrderById(created.order.id);
    const report = await getReportByOrderId(created.order.id);
    expect(order?.status).toBe("PAID");
    expect(report?.generation_status).toBe("PENDING");
    expect(report?.error_code).toBe(PAID_REPORT_WAITING_ERROR_CODE);

    const waiting = await listWaitingForAiReports();
    expect(waiting.some((w) => w.order_id === created.order.id)).toBe(true);
    expect(notifySpy).toHaveBeenCalledTimes(1);
    notifySpy.mockRestore();
  });

  it("CASE B: admin generation without paid key → PAID_AI_NOT_CONFIGURED, no mock", async () => {
    const guest = createGuestSessionId();
    const free = await createFreeFortune({
      raw: sampleInput,
      guestSessionId: guest,
    });
    const created = await createOrderForGuest({
      guestSessionId: guest,
      productId: MOCK_PRODUCT_IDS.career,
      sourceResultId: free.freeResultId,
      paymentMethod: "TOSS",
    });
    await confirmTossPaymentForOwner({
      guestSessionId: guest,
      orderIdParam: created.order.orderNo,
      paymentKey: `mock_pk_b_${created.order.orderNo}`,
      callbackAmount: created.order.amount,
    });

    expect(canAdminTriggerPaidGeneration()).toBe(false);

    await expect(
      adminRetryPaidReportGeneration({ orderId: created.order.id })
    ).rejects.toMatchObject({ code: "PAID_AI_NOT_CONFIGURED" });

    const order = await getOrderById(created.order.id);
    const report = await getReportByOrderId(created.order.id);
    expect(order?.status).toBe("PAID");
    expect(report?.error_code).toBe(PAID_REPORT_WAITING_ERROR_CODE);
  });

  it("CASE C: customer forced generation → DENIED", async () => {
    expect(() =>
      resolvePaidProvider({ actor: "customer", requestedProvider: "mock" })
    ).toThrow(/CUSTOMER_MOCK_PROVIDER_FORBIDDEN/);

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
      paymentKey: `mock_pk_c_${created.order.orderNo}`,
      callbackAmount: created.order.amount,
    });

    const { retryPaidReportGeneration } = await import(
      "@/lib/services/paid-report-job"
    );
    await expect(
      retryPaidReportGeneration({
        orderId: created.order.id,
        guestSessionId: guest,
      })
    ).rejects.toMatchObject({ code: "PAID_GENERATION_DISABLED" });
  });

  it("CASE D: customer WAITING report PDF → DENIED", async () => {
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
      paymentKey: `mock_pk_d_${created.order.orderNo}`,
      callbackAmount: created.order.amount,
    });

    const order = await getOrderById(created.order.id);
    const report = await getReportByOrderId(created.order.id);
    expect(order).toBeTruthy();
    expect(report).toBeTruthy();

    await expect(
      serveConsultingPdf({
        order: order!,
        report: report!,
        accessActor: "customer",
      })
    ).rejects.toBeInstanceOf(FreeFlowError);
  });

  it("CASE E: duplicate payment confirm → no duplicate report or telegram", async () => {
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
    const paymentKey = `mock_pk_e_${created.order.orderNo}`;
    const notifySpy = vi
      .spyOn(notifications, "notifyPaidOrderConfirmed")
      .mockResolvedValue({ sent: 1, skipped: false });

    await confirmTossPaymentForOwner({
      guestSessionId: guest,
      orderIdParam: created.order.orderNo,
      paymentKey,
      callbackAmount: created.order.amount,
    });
    await confirmTossPaymentForOwner({
      guestSessionId: guest,
      orderIdParam: created.order.orderNo,
      paymentKey,
      callbackAmount: created.order.amount,
    });

    const reports = [...(await import("@/lib/mock-store")).mockStore.reports.values()].filter(
      (r) => r.order_id === created.order.id
    );
    expect(reports).toHaveLength(1);
    expect(notifySpy).toHaveBeenCalledTimes(1);
    notifySpy.mockRestore();
  });
});
