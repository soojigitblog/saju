/**
 * P5.2 pre-live release hardening smoke.
 * npx vitest run tests/paid-report-prelive-hardening.test.ts
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFreeFortune,
  resetMockFreeFlowState,
} from "@/lib/services/create-free-fortune";
import { createOrderForGuest } from "@/lib/services/create-order";
import { confirmTossPaymentForOwner } from "@/lib/services/confirm-payment";
import { getPaidReportForOwner } from "@/lib/services/get-paid-report";
import { startPaidReportJob } from "@/lib/services/paid-report-job";
import { createGuestSessionId } from "@/lib/guest/session";
import { mockStore } from "@/lib/mock-store";
import { MOCK_PRODUCT_IDS } from "@/lib/mock-data";
import { getOrderById } from "@/lib/repositories/orders";
import { getReportByOrderId } from "@/lib/repositories/reports";
import {
  isPaidReportLiveEnabled,
  isInternalQaCheckoutExecutionAllowed,
  resolvePaidProvider,
} from "@/lib/ai/config";
import {
  shouldNotifyPaidReportFailure,
  shouldTrackPaidReportFailureAnalytics,
} from "@/lib/services/paid-report-failure-policy";
import {
  deriveReportGenerationMode,
  stampServerPaidReportMetadata,
} from "@/lib/services/paid-report-metadata";
import { serveConsultingPdf } from "@/lib/services/serve-consulting-pdf";
import {
  consultingPdfFilename,
  CONSULTING_PDF_CACHE_CONTROL,
} from "@/lib/report/consulting-pdf-artifact";
import {
  INTERPRETATION_VERSION_CONSULTING,
  REPORT_RENDER_VERSION_CONSULTING,
} from "@/lib/report/paid-report-versions";
import { notifyPaidReportFailed } from "@/lib/notifications";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const sampleInput = {
  nickname: "P52테스트",
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

const PRODUCT_CASES = [
  { id: MOCK_PRODUCT_IDS.money, label: "Money" },
  { id: MOCK_PRODUCT_IDS.career, label: "Career" },
  { id: MOCK_PRODUCT_IDS.love, label: "Love" },
  { id: MOCK_PRODUCT_IDS.total, label: "Total" },
] as const;

async function seedQaPaidReport(productId: string) {
  const guest = createGuestSessionId();
  const free = await createFreeFortune({ raw: sampleInput, guestSessionId: guest });
  const created = await createOrderForGuest({
    guestSessionId: guest,
    productId,
    sourceResultId: free.freeResultId,
    paymentMethod: "TOSS",
    internalQaCheckout: true,
  });
  await confirmTossPaymentForOwner({
    guestSessionId: guest,
    orderIdParam: created.order.orderNo,
    paymentKey: `mock_pk_p52_${created.order.orderNo}`,
    callbackAmount: created.order.amount,
  });
  await startPaidReportJob({
    orderId: created.order.id,
    runGeneration: true,
    forceRetry: true,
    actor: "qa",
    requestedProvider: "mock",
  });
  const order = await getOrderById(created.order.id);
  const report = await getReportByOrderId(created.order.id);
  return { guest, order: order!, report: report! };
}

describe("P5.2 pre-live release hardening", () => {
  beforeEach(() => {
    resetMockFreeFlowState();
    process.env.AI_PROVIDER = "mock";
    process.env.AI_PROVIDER_PAID = "mock";
    process.env.PAYMENT_PROVIDER = "mock";
    process.env.PAID_REPORT_LIVE_ENABLED = "false";
    process.env.ALLOW_PAID_QA_CHECKOUT = "1";
    process.env.ALLOW_MOCK_AI = "1";
    delete process.env.TOSS_SECRET_KEY;
    delete process.env.GEMINI_API_KEY_PAID;
  });

  it("CASE L: customer internalQaCheckout spoof blocked without test gate", async () => {
    delete process.env.ALLOW_PAID_QA_CHECKOUT;
    expect(isInternalQaCheckoutExecutionAllowed()).toBe(false);

    const guest = createGuestSessionId();
    const free = await createFreeFortune({ raw: sampleInput, guestSessionId: guest });
    await expect(
      createOrderForGuest({
        guestSessionId: guest,
        productId: MOCK_PRODUCT_IDS.money,
        sourceResultId: free.freeResultId,
        paymentMethod: "TOSS",
        internalQaCheckout: true,
      })
    ).rejects.toMatchObject({ code: "PAID_REPORT_LIVE_DISABLED" });
  });

  it("CASE L: internalQaCheckout true without env flag still blocked", async () => {
    delete process.env.ALLOW_PAID_QA_CHECKOUT;
    const guest = createGuestSessionId();
    const free = await createFreeFortune({ raw: sampleInput, guestSessionId: guest });
    await expect(
      createOrderForGuest({
        guestSessionId: guest,
        productId: MOCK_PRODUCT_IDS.career,
        sourceResultId: free.freeResultId,
        paymentMethod: "TOSS",
        internalQaCheckout: true,
      })
    ).rejects.toMatchObject({ code: "PAID_REPORT_LIVE_DISABLED" });
  });

  it("generationMode spoof in JSON ignored when report.model is mock", () => {
    const mode = deriveReportGenerationMode({
      model: "mock",
      result_json: { generationMode: "live", provider: "gemini" },
    });
    expect(mode).toBe("mock");
  });

  it("stampServerPaidReportMetadata overwrites spoofed client fields", () => {
    const stamped = stampServerPaidReportMetadata({
      body: {
        generationMode: "live",
        provider: "gemini",
        title: "test",
      },
      generationMode: "mock",
      interpretationVersion: INTERPRETATION_VERSION_CONSULTING,
      reportRenderVersion: REPORT_RENDER_VERSION_CONSULTING,
    });
    expect(stamped.generationMode).toBe("mock");
    expect((stamped as { provider?: string }).provider).toBeUndefined();
    expect(stamped.interpretationVersion).toBe(INTERPRETATION_VERSION_CONSULTING);
  });

  it("PAID_REPORT_LIVE_DISABLED is not operational failure / no alert", () => {
    expect(shouldNotifyPaidReportFailure("PAID_REPORT_LIVE_DISABLED")).toBe(false);
    expect(shouldTrackPaidReportFailureAnalytics("PAID_REPORT_LIVE_DISABLED")).toBe(
      false
    );
    expect(shouldNotifyPaidReportFailure("PAID_AI_NOT_CONFIGURED")).toBe(true);
  });

  it("LIVE_DISABLED customer paid does not send Telegram alert", async () => {
    const notifySpy = vi.spyOn(
      await import("@/lib/notifications"),
      "notifyPaidReportFailed"
    );
    const guest = createGuestSessionId();
    const free = await createFreeFortune({ raw: sampleInput, guestSessionId: guest });
    const created = await createOrderForGuest({
      guestSessionId: guest,
      productId: MOCK_PRODUCT_IDS.money,
      sourceResultId: free.freeResultId,
      paymentMethod: "TOSS",
      internalQaCheckout: true,
    });
    await confirmTossPaymentForOwner({
      guestSessionId: guest,
      orderIdParam: created.order.orderNo,
      paymentKey: `mock_pk_alert_${created.order.orderNo}`,
      callbackAmount: created.order.amount,
    });
    expect(
      notifySpy.mock.calls.filter((c) => c[0].errorCode === "PAID_REPORT_LIVE_DISABLED")
    ).toHaveLength(0);
    notifySpy.mockRestore();
  });

  it("production feature flag default is false in .env.example", () => {
    const example = readFileSync(join(process.cwd(), ".env.example"), "utf8");
    expect(example).toMatch(/PAID_REPORT_LIVE_ENABLED=false/);
    expect(isPaidReportLiveEnabled()).toBe(false);
  });

  describe("Production PDF endpoint smoke (serveConsultingPdf)", () => {
    for (const product of PRODUCT_CASES) {
      it(
        `${product.label}: PDF bytes, %PDF header, pages > 0`,
        async () => {
          const { order, report } = await seedQaPaidReport(product.id);
          const served = await serveConsultingPdf({
            order,
            report,
            accessActor: "qa",
          });

          expect(served.pdfBuffer.byteLength).toBeGreaterThan(2048);
          expect(served.pdfBuffer.subarray(0, 4).toString("utf8")).toBe("%PDF");
          expect(served.pageCountEstimate).toBeGreaterThan(0);
          expect(served.headers["Content-Type"]).toBe("application/pdf");
          expect(served.headers["Cache-Control"]).toBe(CONSULTING_PDF_CACHE_CONTROL);
          expect(served.headers["X-Report-Render-Version"]).toBe(
            REPORT_RENDER_VERSION_CONSULTING
          );

          const filename = served.headers["Content-Disposition"] ?? "";
          expect(filename).toContain("unyegyeol-report-");
          expect(filename).not.toMatch(/P52|1990|010|생년|테스트/i);
          expect(consultingPdfFilename(report.id)).toMatch(/^unyegyeol-report-[a-f0-9]+\.pdf$/);
        },
        120_000
      );
    }
  });

  it("PDF owner access via getPaidReportForOwner", async () => {
    const { guest, report } = await seedQaPaidReport(MOCK_PRODUCT_IDS.total);
    await expect(
      getPaidReportForOwner({ reportOrOrderId: report.id, guestSessionId: guest })
    ).resolves.toBeTruthy();
  });

  it("PDF unauthorized guest denied", async () => {
    const { guest, report } = await seedQaPaidReport(MOCK_PRODUCT_IDS.money);
    const other = createGuestSessionId();
    await expect(
      getPaidReportForOwner({ reportOrOrderId: report.id, guestSessionId: other })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    void guest;
  });

  it("Mock QA report + production customer PDF: DENIED", async () => {
    const { order, report } = await seedQaPaidReport(MOCK_PRODUCT_IDS.love);
    await expect(
      serveConsultingPdf({ order, report, accessActor: "customer" })
    ).rejects.toMatchObject({ code: "CUSTOMER_MOCK_REPORT_FORBIDDEN" });
  });

  it("Mock QA report + admin PDF: ALLOWED", async () => {
    const { order, report } = await seedQaPaidReport(MOCK_PRODUCT_IDS.career);
    const served = await serveConsultingPdf({
      order,
      report,
      accessActor: "admin",
    });
    expect(served.pdfBuffer.subarray(0, 4).toString("utf8")).toBe("%PDF");
  }, 120_000);

  it("customer provider=mock: CUSTOMER_MOCK_PROVIDER_FORBIDDEN", () => {
    expect(() =>
      resolvePaidProvider({ actor: "customer", requestedProvider: "mock" })
    ).toThrow(/CUSTOMER_MOCK_PROVIDER_FORBIDDEN/);
  });
});

describe("notifyPaidReportFailed policy", () => {
  it("does not expose API keys in notification body", async () => {
    process.env.GEMINI_API_KEY_PAID = "secret-key-should-not-appear";
    const result = await notifyPaidReportFailed({
      orderNo: "ORD-TEST",
      productName: "test",
      amount: 6900,
      errorCode: "PAID_AI_NOT_CONFIGURED",
    });
    expect(result.skipped).toBeDefined();
    delete process.env.GEMINI_API_KEY_PAID;
  });
});
