import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import {
  createFreeFortune,
  resetMockFreeFlowState,
} from "@/lib/services/create-free-fortune";
import { createOrderForGuest } from "@/lib/services/create-order";
import {
  confirmBankTransferOrder,
  fulfillBankMatch,
} from "@/lib/services/bank-match-fulfill";
import { assertBankPaidAllowed } from "@/lib/bank/payment-guard";
import { createGuestSessionId } from "@/lib/guest/session";
import { MOCK_PRODUCT_IDS } from "@/lib/mock-data";
import { getOrderById } from "@/lib/repositories/orders";
import { getPaymentsByOrderId } from "@/lib/repositories/payments";
import { getReportByOrderId } from "@/lib/repositories/reports";
import { listOrdersForGuestSession } from "@/lib/repositories/orders";
import { mockStore } from "@/lib/mock-store";
import { FreeFlowError } from "@/lib/services/free-flow-errors";
import { POST as confirmOrderPost } from "@/app/api/admin/bank/confirm-order/route";

const sampleInput = {
  nickname: "실결제",
  gender: "female" as const,
  calendarType: "solar" as const,
  birthDate: "1990-06-15",
  birthTime: "14:30",
  birthTimeUnknown: false,
  lunarLeapMonth: false,
  birthPlace: "서울",
  maritalStatus: "unmarried" as const,
  hasChildren: null,
  timezone: "Asia/Seoul" as const,
};

describe("PHASE 6.3 real bank transfer activation", () => {
  beforeEach(() => {
    resetMockFreeFlowState();
    process.env.AI_PROVIDER = "mock";
    process.env.BANK_PROVIDER = "mock";
    process.env.ADMIN_MANUAL_BYPASS = "1";
    process.env.BANK_TRANSFER_ACCOUNT_NUMBER = "123-456789-01234";
    process.env.BANK_TRANSFER_ACCOUNT_HOLDER = "운의결";
    process.env.ADMIN_MANUAL_TOKEN = "test-admin-token";
    process.env.NODE_ENV = "test";
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    process.env.NODE_ENV = "test";
    process.env.ADMIN_MANUAL_BYPASS = "1";
    process.env.BANK_PROVIDER = "mock";
  });

  async function seedOrder(depositor: string) {
    const guest = createGuestSessionId();
    const free = await createFreeFortune({
      raw: { ...sampleInput, nickname: depositor },
      guestSessionId: guest,
    });
    const created = await createOrderForGuest({
      guestSessionId: guest,
      productId: MOCK_PRODUCT_IDS.love,
      sourceResultId: free.freeResultId,
      depositorName: depositor,
      paymentMethod: "BANK_TRANSFER",
      internalQaCheckout: true,
    });
    return { guest, created };
  }

  it("admin confirm-order without scraped bank tx → PAID → report", async () => {
    const { created } = await seedOrder("관리자확인");
    const result = await confirmBankTransferOrder({
      orderId: created.order.id,
      manual: { by: "admin", reason: "실입금 확인" },
    });
    expect(result.matchStatus).toBe("MATCHED");

    const order = await getOrderById(created.order.id);
    expect(order?.paid_at).toBeTruthy();
    expect(await getPaymentsByOrderId(created.order.id)).toHaveLength(1);
    expect(await getReportByOrderId(created.order.id)).toBeTruthy();
  });

  it("confirm-order is idempotent (duplicate admin clicks)", async () => {
    const { created } = await seedOrder("중복확인");
    await confirmBankTransferOrder({
      orderId: created.order.id,
      manual: { by: "admin", reason: "1차" },
    });
    const second = await confirmBankTransferOrder({
      orderId: created.order.id,
      manual: { by: "admin", reason: "2차" },
    });
    expect(second.matchStatus).toBe("ALREADY");
    expect(await getPaymentsByOrderId(created.order.id)).toHaveLength(1);
    expect(
      [...mockStore.reports.values()].filter((r) => r.order_id === created.order.id)
    ).toHaveLength(1);
  });

  it("blocks PAID when BANK_PROVIDER=mock in production runtime", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("BANK_PROVIDER", "mock");
    vi.stubEnv("ADMIN_MANUAL_BYPASS", "");

    try {
      expect(() => assertBankPaidAllowed()).toThrow(FreeFlowError);
    } finally {
      vi.unstubAllEnvs();
      process.env.NODE_ENV = "test";
      process.env.ADMIN_MANUAL_BYPASS = "1";
      process.env.BANK_PROVIDER = "mock";
    }
  });

  it("confirm-order API rejects non-admin", async () => {
    process.env.ADMIN_MANUAL_BYPASS = "";
    const { created } = await seedOrder("비관리자");
    const res = await confirmOrderPost(
      new Request("http://localhost/api/admin/bank/confirm-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: created.order.id }),
      })
    );
    expect(res.status).toBe(403);
    expect((await getOrderById(created.order.id))?.status).toBe("PENDING");
  });

  it("listOrdersForGuestSession isolates guest orders", async () => {
    const a = await seedOrder("게스트A");
    const guestB = createGuestSessionId();
    const freeB = await createFreeFortune({
      raw: { ...sampleInput, nickname: "B", birthDate: "1991-01-01" },
      guestSessionId: guestB,
    });
    await createOrderForGuest({
      guestSessionId: guestB,
      productId: MOCK_PRODUCT_IDS.love,
      sourceResultId: freeB.freeResultId,
      depositorName: "게스트B",
      internalQaCheckout: true,
    });

    const listA = await listOrdersForGuestSession(a.guest);
    expect(listA).toHaveLength(1);
    expect(listA[0]?.id).toBe(a.created.order.id);

    const listB = await listOrdersForGuestSession(guestB);
    expect(listB).toHaveLength(1);
    expect(listB[0]?.guest_session_id).toBe(guestB);
    expect(listB[0]?.id).not.toBe(a.created.order.id);
  });

  it("fulfillBankMatch blocked when mock provider in production", async () => {
    const { created } = await seedOrder("가드테스트");
    const { insertBankTransactionIfAbsent } = await import(
      "@/lib/repositories/bank-transactions"
    );
    const { row } = await insertBankTransactionIfAbsent({
      provider: "HANA",
      external_transaction_id: "guard-1",
      fingerprint: `fp-guard-${created.order.id}`,
      occurred_at: new Date().toISOString(),
      amount: created.order.amount,
      depositor_name_masked: "가**",
      match_status: "UNMATCHED",
    });

    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("BANK_PROVIDER", "mock");
    vi.stubEnv("ADMIN_MANUAL_BYPASS", "");

    try {
      await expect(
        fulfillBankMatch({
          bankTxId: row.id,
          fingerprint: row.fingerprint,
          orderId: created.order.id,
          amount: created.order.amount,
        })
      ).rejects.toMatchObject({ code: "BANK_MOCK_DISABLED" });
    } finally {
      vi.unstubAllEnvs();
      process.env.NODE_ENV = "test";
      process.env.ADMIN_MANUAL_BYPASS = "1";
      process.env.BANK_PROVIDER = "mock";
    }
  });

  it("create order fails when bank account not configured", async () => {
    delete process.env.BANK_TRANSFER_ACCOUNT_NUMBER;
    const guest = createGuestSessionId();
    const free = await createFreeFortune({
      raw: sampleInput,
      guestSessionId: guest,
    });
    await expect(
      createOrderForGuest({
        guestSessionId: guest,
        productId: MOCK_PRODUCT_IDS.love,
        sourceResultId: free.freeResultId,
        depositorName: "미설정",
      internalQaCheckout: true,
      })
    ).rejects.toMatchObject({ code: "BANK_ACCOUNT_NOT_CONFIGURED" });
    process.env.BANK_TRANSFER_ACCOUNT_NUMBER = "123-456789-01234";
  });
});
