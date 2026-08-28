import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFreeFortune,
  resetMockFreeFlowState,
} from "@/lib/services/create-free-fortune";
import { createOrderForGuest } from "@/lib/services/create-order";
import { confirmTossPaymentForOwner } from "@/lib/services/confirm-payment";
import { getPaidReportForOwner } from "@/lib/services/get-paid-report";
import {
  adminRetryPaidReportGeneration,
  retryPaidReportGeneration,
  startPaidReportJob,
} from "@/lib/services/paid-report-job";
import { createGuestSessionId } from "@/lib/guest/session";
import { mockStore } from "@/lib/mock-store";
import { MOCK_PRODUCT_IDS } from "@/lib/mock-data";
import { getOrderById } from "@/lib/repositories/orders";
import { getReportByOrderId } from "@/lib/repositories/reports";
import { generatePaidReportPdf } from "@/lib/report/generate-paid-report-pdf";
import { loadConsultingReportRenderContext } from "@/lib/services/load-consulting-report-render";
import {
  REPORT_RENDER_VERSION_CONSULTING,
  INTERPRETATION_VERSION_CONSULTING,
} from "@/lib/report/paid-report-versions";
import {
  findConsultingGarbledText,
  findConsultingFrameworkLabels,
} from "@/lib/report/paid-report-pdf-consulting";
import * as freeInterpreter from "@/lib/ai/interpreters/free-interpreter";
import { resolvePaidReportKindFromProductSlug } from "@/lib/report/paid-report-kind";
import { FreeFlowError } from "@/lib/services/free-flow-errors";
import {
  resolveEffectivePaidProviderForCustomer,
  resolvePaidProvider,
} from "@/lib/ai/config";

const sampleInput = {
  nickname: "P5테스트",
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
  { id: MOCK_PRODUCT_IDS.money, slug: "2026-money", label: "Money" },
  { id: MOCK_PRODUCT_IDS.career, slug: "2026-career", label: "Career" },
  { id: MOCK_PRODUCT_IDS.love, slug: "2026-love", label: "Love" },
  { id: MOCK_PRODUCT_IDS.total, slug: "2026-total", label: "Total" },
] as const;

const MOCK_LEAK_TERMS = [
  "QA-MOCK",
  "mock-paid",
  "deep mock",
  "fixture",
  "sample user",
  "sample order",
];

describe("P5 consulting production integration (mock E2E)", () => {
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

  /** QA path: order → pay → mock consulting report (never customer mock). */
  async function payAndGenerateQa(productId: string) {
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
      paymentKey: `mock_pk_p5_${created.order.orderNo}`,
      callbackAmount: created.order.amount,
    });
    // Customer confirm leaves LIVE_DISABLED — QA regenerates with mock
    await startPaidReportJob({
      orderId: created.order.id,
      runGeneration: true,
      forceRetry: true,
      actor: "qa",
      requestedProvider: "mock",
    });
    const order = await getOrderById(created.order.id);
    const report = await getReportByOrderId(created.order.id);
    return { guest, order, report, created };
  }

  for (const product of PRODUCT_CASES) {
    it(`CASE ${product.label}: QA order → report → consulting PDF path`, async () => {
      const { guest, order, report } = await payAndGenerateQa(product.id);
      expect(order?.paid_at).toBeTruthy();
      expect(order?.status).toBe("COMPLETED");
      expect(report?.generation_status).toBe("COMPLETED");
      expect(report?.result_json).toBeTruthy();

      const raw = report!.result_json as {
        reportRenderVersion?: string;
        interpretationVersion?: string;
        generationMode?: string;
      };
      expect(raw.reportRenderVersion).toBe(REPORT_RENDER_VERSION_CONSULTING);
      expect(raw.interpretationVersion).toBe(INTERPRETATION_VERSION_CONSULTING);
      expect(raw.generationMode).toBe("mock");
      expect(report!.html_url).toBe(`/api/reports/${report!.id}/consulting-html`);
      expect(report!.pdf_url).toBe(`/api/reports/${report!.id}/consulting-pdf`);

      expect(resolvePaidReportKindFromProductSlug(product.slug)).toBe(
        product.slug.replace("2026-", "")
      );

      // Customer cannot access mock PDF
      await expect(
        loadConsultingReportRenderContext({
          order: order!,
          report: report!,
          accessActor: "customer",
        })
      ).rejects.toMatchObject({ code: "CUSTOMER_MOCK_REPORT_FORBIDDEN" });

      // QA can
      const renderCtx = await loadConsultingReportRenderContext({
        order: order!,
        report: report!,
        accessActor: "qa",
      });
      const { html, reportRenderVersion } = generatePaidReportPdf({
        nickname: renderCtx.nickname,
        productName: renderCtx.productName,
        productSlug: renderCtx.productSlug,
        report: renderCtx.report,
        chart: renderCtx.chart,
        live: false,
      });

      expect(reportRenderVersion).toBe(REPORT_RENDER_VERSION_CONSULTING);
      expect(findConsultingGarbledText(html)).toEqual([]);
      expect(findConsultingFrameworkLabels(html)).toEqual([]);
      for (const term of MOCK_LEAK_TERMS) {
        expect(html.toLowerCase()).not.toContain(term.toLowerCase());
      }

      await expect(
        getPaidReportForOwner({
          reportOrOrderId: report!.id,
          guestSessionId: guest,
        })
      ).resolves.toBeTruthy();
    });
  }

  it("CASE E: AI failure preserves PAID order and allows QA retry", async () => {
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
      paymentKey: `mock_pk_fail_${created.order.orderNo}`,
      callbackAmount: created.order.amount,
    });

    const genSpy = vi
      .spyOn(freeInterpreter, "generatePaidInterpretation")
      .mockRejectedValueOnce(new Error("MOCK_AI_FAIL"));

    await startPaidReportJob({
      orderId: created.order.id,
      runGeneration: true,
      forceRetry: true,
      actor: "qa",
      requestedProvider: "mock",
    });

    genSpy.mockRestore();

    const failedOrder = await getOrderById(created.order.id);
    const failedReport = await getReportByOrderId(created.order.id);
    expect(failedOrder?.paid_at).toBeTruthy();
    expect(failedOrder?.status).toBe("PAID");
    expect(failedReport?.generation_status).toBe("FAILED");

    const retried = await startPaidReportJob({
      orderId: created.order.id,
      runGeneration: true,
      forceRetry: true,
      actor: "qa",
      requestedProvider: "mock",
    });
    expect(retried.status).toBe("COMPLETED");
    const after = await getReportByOrderId(created.order.id);
    expect(after?.generation_status).toBe("COMPLETED");
  });

  it("CASE F: unauthorized report access denied", async () => {
    const other = createGuestSessionId();
    const { guest, report } = await payAndGenerateQa(MOCK_PRODUCT_IDS.total);
    await expect(
      getPaidReportForOwner({
        reportOrOrderId: report!.id,
        guestSessionId: other,
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      getPaidReportForOwner({
        reportOrOrderId: report!.id,
        guestSessionId: guest,
      })
    ).resolves.toBeTruthy();
  });

  it("CASE G: duplicate generation does not create extra report rows", async () => {
    const { created } = await payAndGenerateQa(MOCK_PRODUCT_IDS.love);
    for (let i = 0; i < 5; i++) {
      await startPaidReportJob({
        orderId: created.order.id,
        runGeneration: true,
        actor: "qa",
        requestedProvider: "mock",
      });
    }
    const reports = [...mockStore.reports.values()].filter(
      (r) => r.order_id === created.order.id
    );
    expect(reports).toHaveLength(1);
    expect(reports[0]?.generation_status).toBe("COMPLETED");
  });

  it("unknown product slug HARD FAIL", () => {
    expect(() => resolvePaidReportKindFromProductSlug("unknown-product")).toThrow(
      FreeFlowError
    );
  });

  it("historical legacy report without render version stays legacy", async () => {
    const { order, report } = await payAndGenerateQa(MOCK_PRODUCT_IDS.money);
    const legacyJson = { ...(report!.result_json as Record<string, unknown>) };
    delete legacyJson.reportRenderVersion;
    delete legacyJson.interpretationVersion;
    const legacyReport = {
      ...report!,
      result_json: legacyJson,
      html_url: null,
      pdf_url: null,
    };
    mockStore.reports.set(report!.id, legacyReport);

    await expect(
      loadConsultingReportRenderContext({
        order: order!,
        report: legacyReport,
        accessActor: "qa",
      })
    ).rejects.toMatchObject({ code: "LEGACY_REPORT" });
  });
});

describe("P5.1 pre-live customer safety", () => {
  beforeEach(() => {
    resetMockFreeFlowState();
    process.env.AI_PROVIDER = "mock";
    process.env.AI_PROVIDER_PAID = "mock";
    process.env.PAYMENT_PROVIDER = "mock";
    process.env.PAID_REPORT_LIVE_ENABLED = "false";
    process.env.ALLOW_MOCK_AI = "1";
    delete process.env.ALLOW_PAID_QA_CHECKOUT;
    delete process.env.TOSS_SECRET_KEY;
    delete process.env.GEMINI_API_KEY_PAID;
  });

  it("CASE H: live=false customer paid request → LIVE_DISABLED, no mock complete", async () => {
    process.env.ALLOW_PAID_QA_CHECKOUT = "1";
    const guest = createGuestSessionId();
    const free = await createFreeFortune({ raw: sampleInput, guestSessionId: guest });
    const created = await createOrderForGuest({
      guestSessionId: guest,
      productId: MOCK_PRODUCT_IDS.money,
      sourceResultId: free.freeResultId,
      paymentMethod: "TOSS",
      internalQaCheckout: true,
    });

    const genSpy = vi.spyOn(freeInterpreter, "generatePaidInterpretation");

    await confirmTossPaymentForOwner({
      guestSessionId: guest,
      orderIdParam: created.order.orderNo,
      paymentKey: `mock_pk_h_${created.order.orderNo}`,
      callbackAmount: created.order.amount,
    });

    expect(genSpy).not.toHaveBeenCalled();
    genSpy.mockRestore();

    const order = await getOrderById(created.order.id);
    const report = await getReportByOrderId(created.order.id);
    expect(order?.paid_at).toBeTruthy();
    expect(order?.status).toBe("PAID");
    expect(report?.generation_status).toBe("PENDING");
    expect(report?.error_code).toBe("WAITING_FOR_AI");
    expect(
      (report?.result_json as { generationMode?: string } | null)?.generationMode
    ).not.toBe("mock");

    // Customer checkout without QA allow is blocked
    delete process.env.ALLOW_PAID_QA_CHECKOUT;
    const guest2 = createGuestSessionId();
    const free2 = await createFreeFortune({
      raw: { ...sampleInput, nickname: "차단테스트" },
      guestSessionId: guest2,
    });
    await expect(
      createOrderForGuest({
        guestSessionId: guest2,
        productId: MOCK_PRODUCT_IDS.career,
        sourceResultId: free2.freeResultId,
        paymentMethod: "TOSS",
      })
    ).rejects.toMatchObject({ code: "PAID_CHECKOUT_DISABLED" });
  });

  it("CASE I: production customer + provider=mock → CUSTOMER_MOCK_PROVIDER_FORBIDDEN", () => {
    expect(() =>
      resolvePaidProvider({ actor: "customer", requestedProvider: "mock" })
    ).toThrow(/CUSTOMER_MOCK_PROVIDER_FORBIDDEN/);
    expect(() => resolveEffectivePaidProviderForCustomer()).toThrow(
      /PAID_GENERATION_DISABLED/
    );
  });

  it("CASE J: admin QA + mock → PASS", async () => {
    process.env.ALLOW_PAID_QA_CHECKOUT = "1";
    const guest = createGuestSessionId();
    const free = await createFreeFortune({ raw: sampleInput, guestSessionId: guest });
    const created = await createOrderForGuest({
      guestSessionId: guest,
      productId: MOCK_PRODUCT_IDS.love,
      sourceResultId: free.freeResultId,
      paymentMethod: "TOSS",
      internalQaCheckout: true,
    });
    await confirmTossPaymentForOwner({
      guestSessionId: guest,
      orderIdParam: created.order.orderNo,
      paymentKey: `mock_pk_j_${created.order.orderNo}`,
      callbackAmount: created.order.amount,
    });

    const result = await startPaidReportJob({
      orderId: created.order.id,
      runGeneration: true,
      forceRetry: true,
      actor: "admin",
      requestedProvider: "mock",
    });
    expect(result.status).toBe("COMPLETED");
    const report = await getReportByOrderId(created.order.id);
    expect(
      (report?.result_json as { generationMode?: string })?.generationMode
    ).toBe("mock");

    const adminRetry = await adminRetryPaidReportGeneration({
      orderId: created.order.id,
    });
    expect(adminRetry.status).toBe("COMPLETED");
  });

  it("CASE K: live=true + paid key missing → WAITING_FOR_AI, no mock", async () => {
    process.env.PAID_REPORT_LIVE_ENABLED = "true";
    process.env.PAID_REPORT_GENERATION_ENABLED = "true";
    process.env.AI_PROVIDER_PAID = "gemini";
    process.env.ALLOW_PAID_QA_CHECKOUT = "1";
    delete process.env.GEMINI_API_KEY_PAID;

    expect(() => resolveEffectivePaidProviderForCustomer()).not.toThrow();
    expect(resolveEffectivePaidProviderForCustomer()).toBe("gemini");

    const guest = createGuestSessionId();
    const free = await createFreeFortune({ raw: sampleInput, guestSessionId: guest });
    const created = await createOrderForGuest({
      guestSessionId: guest,
      productId: MOCK_PRODUCT_IDS.total,
      sourceResultId: free.freeResultId,
      paymentMethod: "TOSS",
      internalQaCheckout: true,
    });

    const genSpy = vi.spyOn(freeInterpreter, "generatePaidInterpretation");

    await confirmTossPaymentForOwner({
      guestSessionId: guest,
      orderIdParam: created.order.orderNo,
      paymentKey: `mock_pk_k_${created.order.orderNo}`,
      callbackAmount: created.order.amount,
    });

    expect(genSpy).not.toHaveBeenCalled();
    genSpy.mockRestore();

    const order = await getOrderById(created.order.id);
    const report = await getReportByOrderId(created.order.id);
    expect(order?.paid_at).toBeTruthy();
    expect(order?.status).toBe("PAID");
    expect(report?.generation_status).toBe("PENDING");
    expect(report?.error_code).toBe("WAITING_FOR_AI");

    const retried = await retryPaidReportGeneration({
      orderId: created.order.id,
      guestSessionId: guest,
    });
    expect(retried.status).toBe("PENDING");
    const after = await getReportByOrderId(created.order.id);
    expect(after?.error_code).toBe("WAITING_FOR_AI");
  });
});

describe("P5 production renderer === consulting entry point", () => {
  it("generatePaidReportPdf uses same module as consulting builder", async () => {
    resetMockFreeFlowState();
    process.env.AI_PROVIDER = "mock";
    process.env.AI_PROVIDER_PAID = "mock";
    process.env.PAYMENT_PROVIDER = "mock";
    process.env.PAID_REPORT_LIVE_ENABLED = "false";
    process.env.ALLOW_PAID_QA_CHECKOUT = "1";
    process.env.ALLOW_MOCK_AI = "1";

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
      paymentKey: `mock_pk_src_${created.order.orderNo}`,
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

    const renderCtx = await loadConsultingReportRenderContext({
      order: order!,
      report: report!,
      accessActor: "qa",
    });
    const prod = generatePaidReportPdf({
      nickname: renderCtx.nickname,
      productName: renderCtx.productName,
      productSlug: renderCtx.productSlug,
      report: renderCtx.report,
      chart: renderCtx.chart,
      live: false,
    });

    expect(prod.reportRenderVersion).toBe("consulting-pdf-v1");
    expect(prod.html).toContain("運의結");
  });
});
