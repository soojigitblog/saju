import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  estimateAiCostUsd,
  getGeminiApiKeyForTier,
  getPaidReportMaxOutputTokens,
  resolveAiProviderForFree,
  resolveAiProviderForPaid,
} from "@/lib/ai/config";
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
import { notifyPaidReportFailed } from "@/lib/notifications";

const sampleInput = {
  nickname: "유료66",
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

describe("PHASE 6.6 AI policy / cost guard", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    delete process.env.AI_PROVIDER_FREE;
    delete process.env.AI_PROVIDER_PAID;
    delete process.env.GEMINI_API_KEY_FREE;
    delete process.env.GEMINI_API_KEY_PAID;
    delete process.env.GEMINI_API_KEY;
    process.env.AI_PROVIDER = "mock";
  });

  it("resolves separate free/paid providers from env", () => {
    process.env.AI_PROVIDER_FREE = "mock";
    process.env.AI_PROVIDER_PAID = "mock";
    expect(resolveAiProviderForFree()).toBe("mock");
    expect(resolveAiProviderForPaid()).toBe("mock");
  });

  it("does not fall back paid key to GEMINI_API_KEY", () => {
    process.env.GEMINI_API_KEY = "shared-key";
    expect(getGeminiApiKeyForTier("free")).toBe("shared-key");
    expect(getGeminiApiKeyForTier("paid")).toBeUndefined();
    process.env.GEMINI_API_KEY_PAID = "paid-only";
    expect(getGeminiApiKeyForTier("paid")).toBe("paid-only");
    process.env.GEMINI_API_KEY_FREE = "free-only";
    expect(getGeminiApiKeyForTier("free")).toBe("free-only");
  });

  it("estimates gemini cost from tokens", () => {
    const cost = estimateAiCostUsd({
      provider: "gemini",
      inputTokens: 1_000_000,
      outputTokens: 500_000,
    });
    expect(cost).not.toBeNull();
    expect(cost!).toBeGreaterThan(0);
  });

  it("caps paid output tokens from env", () => {
    process.env.PAID_REPORT_MAX_OUTPUT_TOKENS = "4096";
    expect(getPaidReportMaxOutputTokens()).toBe(4096);
  });
});

describe("PHASE 6.6 paid report guard (mock)", () => {
  beforeEach(() => {
    resetMockFreeFlowState();
    process.env.AI_PROVIDER = "mock";
    process.env.AI_PROVIDER_FREE = "mock";
    process.env.AI_PROVIDER_PAID = "mock";
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
      internalQaCheckout: true,
    });
    await confirmTossPaymentForOwner({
      guestSessionId: guest,
      orderIdParam: created.order.orderNo,
      paymentKey: `mock_pk_${created.order.orderNo}`,
      callbackAmount: created.order.amount,
    });
    return { guest, orderId: created.order.id };
  }

  it("fails with PAID_AI_NOT_CONFIGURED when paid gemini key missing", async () => {
    const { orderId } = await seedPaidOrder();
    const existing = await getReportByOrderId(orderId);
    if (existing) {
      mockStore.reports.set(existing.id, {
        ...existing,
        generation_status: "FAILED",
        error_code: "OPENAI_RATE_LIMIT",
        result_json: null,
      });
    }
    // Clear completed ledger so forceRetry can run generation path
    for (const [k, g] of mockStore.aiGenerations.entries()) {
      if (g.order_id === orderId && g.result_type === "paid") {
        mockStore.aiGenerations.set(k, { ...g, status: "FAILED" });
      }
    }

    process.env.AI_PROVIDER_PAID = "gemini";
    delete process.env.GEMINI_API_KEY_PAID;
    delete process.env.GEMINI_API_KEY;

    const result = await startPaidReportJob({
      orderId,
      runGeneration: true,
      forceRetry: true,
    });
    expect(result.status).toBe("FAILED");
    const report = await getReportByOrderId(orderId);
    expect(report?.error_code).toBe("PAID_AI_NOT_CONFIGURED");
    const order = await getOrderById(orderId);
    expect(order?.status).toBe("PAID");
  });

  it("skips paid report when order is not paid", async () => {
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
      internalQaCheckout: true,
    });

    const result = await startPaidReportJob({
      orderId: created.order.id,
      runGeneration: true,
    });
    expect(result.status).toBe("SKIPPED");
  });

  it("records AI cost on successful paid report", async () => {
    const { orderId } = await seedPaidOrder();
    await startPaidReportJob({ orderId, runGeneration: true, forceRetry: true });

    const report = await getReportByOrderId(orderId);
    expect(report?.generation_status).toBe("COMPLETED");
    expect(report?.input_tokens).not.toBeNull();
    expect(report?.estimated_ai_cost_usd).toBe(0);

    const gens = [...mockStore.aiGenerations.values()].filter(
      (g) => g.order_id === orderId && g.result_type === "paid"
    );
    expect(gens.some((g) => g.status === "COMPLETED")).toBe(true);
    expect(gens.some((g) => g.estimated_ai_cost_usd === 0)).toBe(true);
  });

  it("sends admin alert on paid report failure", async () => {
    vi.spyOn(freeInterpreter, "generatePaidInterpretation").mockRejectedValue(
      new Error("OPENAI_RATE_LIMIT")
    );
    const notifySpy = vi
      .spyOn(await import("@/lib/notifications"), "notifyPaidReportFailed")
      .mockResolvedValue({ sent: 0, skipped: true });

    const { orderId } = await seedPaidOrder();
    await startPaidReportJob({ orderId, runGeneration: true, forceRetry: true });

    expect(notifySpy).toHaveBeenCalled();
    const order = await getOrderById(orderId);
    expect(order?.status).toBe("PAID");
  });

  it("admin retry keeps order PAID on failure", async () => {
    vi.spyOn(freeInterpreter, "generatePaidInterpretation").mockRejectedValue(
      new Error("429 quota")
    );

    const { orderId } = await seedPaidOrder();
    const result = await adminRetryPaidReportGeneration({ orderId });
    expect(result.status).toBe("FAILED");

    const order = await getOrderById(orderId);
    expect(order?.paid_at).toBeTruthy();
    expect(order?.status).toBe("PAID");
  });
});

describe("notifyPaidReportFailed message", () => {
  it("builds minimal alert payload", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "test";
    process.env.TELEGRAM_ADMIN_CHAT_ID = "1";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }))
    );

    const result = await notifyPaidReportFailed({
      orderNo: "ORD-TEST",
      productName: "재물운",
      amount: 9900,
      errorCode: "OPENAI_RATE_LIMIT",
    });
    expect(result.sent).toBe(1);
  });
});
