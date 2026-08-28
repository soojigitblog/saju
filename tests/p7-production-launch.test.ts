import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  customerReportPhaseLabel,
  resolveCustomerReportPhase,
} from "@/lib/ops/customer-report-phase";
import { isQaDryRunDepositor, QA_DRY_RUN_DEPOSITOR_PREFIX } from "@/lib/ops/qa-dry-run-order";
import {
  getZeroCostLaunchPolicySnapshot,
  isZeroCostProductionPolicy,
} from "@/lib/ops/zero-cost-launch-policy";
import { PAID_REPORT_WAITING_ERROR_CODE } from "@/lib/services/paid-report-waiting";
import { createGuestSessionId } from "@/lib/guest/session";
import { createFreeFortune, resetMockFreeFlowState } from "@/lib/services/create-free-fortune";
import { createOrderForGuest } from "@/lib/services/create-order";
import { MOCK_PRODUCT_IDS } from "@/lib/mock-data";
import { getOrderById, updateOrder } from "@/lib/repositories/orders";
import { getReportByOrderId } from "@/lib/repositories/reports";
import { getAdminTodayStats } from "@/lib/repositories/admin-stats";
import { serveConsultingPdf } from "@/lib/services/serve-consulting-pdf";
import { FreeFlowError } from "@/lib/services/free-flow-errors";
import * as freeInterpreter from "@/lib/ai/interpreters/free-interpreter";

const sampleInput = {
  nickname: "P71테스트",
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

describe("P7 zero-cost production launch policy", () => {
  beforeEach(() => {
    resetMockFreeFlowState();
    process.env.PAID_CHECKOUT_ENABLED = "true";
    process.env.PAID_REPORT_GENERATION_ENABLED = "false";
    process.env.PAID_REPORT_LIVE_ENABLED = "false";
    process.env.ALLOW_TOSS_CHECKOUT = "1";
    process.env.ALLOW_MOCK_AI = "1";
    process.env.BANK_TRANSFER_BANK_NAME = "하나은행";
    process.env.BANK_TRANSFER_ACCOUNT_NUMBER = "000-000000-00000";
    process.env.BANK_TRANSFER_ACCOUNT_HOLDER = "테스트예금주";
    delete process.env.GEMINI_API_KEY_PAID;
  });

  it("zero-cost snapshot requires checkout ON, generation OFF, no paid key", () => {
    const snap = getZeroCostLaunchPolicySnapshot();
    expect(isZeroCostProductionPolicy(snap)).toBe(true);
    expect(snap.paidCheckoutEnabled).toBe(true);
    expect(snap.paidGenerationEnabled).toBe(false);
    expect(snap.paidGeminiKeyConfigured).toBe(false);
  });

  it("customer report phase shows preparing after paid + WAITING_FOR_AI", () => {
    const phase = resolveCustomerReportPhase({
      orderStatus: "PAID",
      paidAt: new Date().toISOString(),
      generationStatus: "PENDING",
      errorCode: PAID_REPORT_WAITING_ERROR_CODE,
    });
    expect(phase).toBe("payment_confirmed_preparing");
    expect(customerReportPhaseLabel(phase)).toBe("결제 확인됨 · 리포트 준비 중");
  });

  it("QA dry-run depositor prefix is detectable", () => {
    expect(isQaDryRunDepositor(`${QA_DRY_RUN_DEPOSITOR_PREFIX}홍길동`)).toBe(true);
    expect(isQaDryRunDepositor("홍길동")).toBe(false);
  });

  it("QA prefix security: QA- depositor has no payment or auth bypass", async () => {
    const guest = createGuestSessionId();
    const free = await createFreeFortune({ raw: sampleInput, guestSessionId: guest });
    const genSpy = vi.spyOn(freeInterpreter, "generatePaidInterpretation");

    const created = await createOrderForGuest({
      guestSessionId: guest,
      productId: MOCK_PRODUCT_IDS.money,
      sourceResultId: free.freeResultId,
      depositorName: "QA-hacker",
      paymentMethod: "BANK_TRANSFER",
    });

    const order = await getOrderById(created.order.id);
    expect(order?.status).toBe("PENDING");
    expect(order?.paid_at).toBeNull();
    expect(genSpy).not.toHaveBeenCalled();

    const rep = await getReportByOrderId(created.order.id);
    if (rep) {
      await expect(
        serveConsultingPdf({
          order: order!,
          report: rep,
          accessActor: "customer",
        })
      ).rejects.toBeInstanceOf(FreeFlowError);
    }
    genSpy.mockRestore();
  });

  it("QA data hygiene: QA dry-run orders are excluded from paid revenue stats", async () => {
    const guestA = createGuestSessionId();
    const guestB = createGuestSessionId();
    const freeA = await createFreeFortune({ raw: sampleInput, guestSessionId: guestA });
    const freeB = await createFreeFortune({ raw: sampleInput, guestSessionId: guestB });

    const qaOrder = await createOrderForGuest({
      guestSessionId: guestA,
      productId: MOCK_PRODUCT_IDS.money,
      sourceResultId: freeA.freeResultId,
      depositorName: "QA-dryrun",
      paymentMethod: "BANK_TRANSFER",
    });

    const realOrder = await createOrderForGuest({
      guestSessionId: guestB,
      productId: MOCK_PRODUCT_IDS.money,
      sourceResultId: freeB.freeResultId,
      depositorName: "김실제",
      paymentMethod: "BANK_TRANSFER",
    });

    const nowIso = new Date().toISOString();
    await updateOrder(qaOrder.order.id, {
      status: "PAID",
      paid_at: nowIso,
    });
    await updateOrder(realOrder.order.id, {
      status: "PAID",
      paid_at: nowIso,
    });

    const stats = await getAdminTodayStats();
    expect(stats.paid).toBe(1);
    expect(stats.revenue).toBe(realOrder.order.amount);
  });
});
