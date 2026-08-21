import { beforeEach, describe, expect, it } from "vitest";
import {
  createFreeFortune,
  resetMockFreeFlowState,
} from "@/lib/services/create-free-fortune";
import { createOrderForGuest } from "@/lib/services/create-order";
import { confirmTossPaymentForOwner } from "@/lib/services/confirm-payment";
import { getPaidReportForOwner } from "@/lib/services/get-paid-report";
import { FreeFlowError } from "@/lib/services/free-flow-errors";
import { createGuestSessionId } from "@/lib/guest/session";
import { mockStore } from "@/lib/mock-store";
import { MOCK_PRODUCT_IDS, mockProducts } from "@/lib/mock-data";
import { getOrderById } from "@/lib/repositories/orders";
import { getPaymentsByOrderId } from "@/lib/repositories/payments";
import { getReportByOrderId } from "@/lib/repositories/reports";

const sampleInput = {
  nickname: "결제테스트",
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

describe("PHASE 6 payment E2E (mock)", () => {
  beforeEach(() => {
    resetMockFreeFlowState();
    process.env.AI_PROVIDER = "mock";
    process.env.PAYMENT_PROVIDER = "mock";
    delete process.env.TOSS_SECRET_KEY;
  });

  async function seedFree(guest: string) {
    return createFreeFortune({ raw: sampleInput, guestSessionId: guest });
  }

  it("happy path: order ??mock pay ??PAID ??report generation", async () => {
    const guest = createGuestSessionId();
    const free = await seedFree(guest);
    const created = await createOrderForGuest({
      guestSessionId: guest,
      productId: MOCK_PRODUCT_IDS.total,
      sourceResultId: free.freeResultId,
      paymentMethod: "TOSS",
    });

    expect(created.order.amount).toBe(12900);
    expect(created.order.status).toBe("PENDING");
    expect(created.checkoutUrl).toBe(`/checkout/${created.order.id}`);

    const confirmed = await confirmTossPaymentForOwner({
      guestSessionId: guest,
      orderIdParam: created.order.orderNo,
      paymentKey: `mock_pk_${created.order.orderNo}`,
      callbackAmount: 12900,
    });

    expect(confirmed.alreadyPaid).toBe(false);
    expect(["PAID", "GENERATING", "COMPLETED", "FAILED"]).toContain(
      confirmed.order.status
    );

    const order = await getOrderById(created.order.id);
    expect(order?.paid_at).toBeTruthy();
    expect(order?.status).not.toBe("PENDING");

    const payments = await getPaymentsByOrderId(created.order.id);
    expect(payments).toHaveLength(1);
    expect(payments[0].payment_key).toBe(`mock_pk_${created.order.orderNo}`);

    const report = await getReportByOrderId(created.order.id);
    expect(report).toBeTruthy();
    expect(report?.generation_key).toBe(`paid:${created.order.id}`);

    // Public DTO / JSON must not leak payment_key
    const serialized = JSON.stringify(confirmed);
    expect(serialized.includes("payment_key")).toBe(false);
    expect(serialized.includes(payments[0].payment_key!)).toBe(false);
  });

  it("reuses PENDING order for same guest+product+result+price", async () => {
    const guest = createGuestSessionId();
    const free = await seedFree(guest);
    const a = await createOrderForGuest({
      guestSessionId: guest,
      productId: MOCK_PRODUCT_IDS.money,
      sourceResultId: free.freeResultId,
      paymentMethod: "TOSS",
    });
    const b = await createOrderForGuest({
      guestSessionId: guest,
      productId: MOCK_PRODUCT_IDS.money,
      sourceResultId: free.freeResultId,
      paymentMethod: "TOSS",
    });
    expect(a.order.id).toBe(b.order.id);
    expect(b.reused).toBe(true);
    expect(mockStore.orders.size).toBe(1);
  });

  it("A: denies callback amount mismatch (client 12900??00)", async () => {
    const guest = createGuestSessionId();
    const free = await seedFree(guest);
    const created = await createOrderForGuest({
      guestSessionId: guest,
      productId: MOCK_PRODUCT_IDS.total,
      sourceResultId: free.freeResultId,
      paymentMethod: "TOSS",
    });

    await expect(
      confirmTossPaymentForOwner({
        guestSessionId: guest,
        orderIdParam: created.order.orderNo,
        paymentKey: `mock_pk_amt_${created.order.orderNo}`,
        callbackAmount: 100,
      })
    ).rejects.toMatchObject({ code: "PAYMENT_AMOUNT_MISMATCH" });

    const order = await getOrderById(created.order.id);
    expect(order?.status).toBe("PENDING");
    expect(await getPaymentsByOrderId(created.order.id)).toHaveLength(0);
  });

  it("B: denies other guest order confirm", async () => {
    const owner = createGuestSessionId();
    const other = createGuestSessionId();
    const free = await seedFree(owner);
    const created = await createOrderForGuest({
      guestSessionId: owner,
      productId: MOCK_PRODUCT_IDS.total,
      sourceResultId: free.freeResultId,
      paymentMethod: "TOSS",
    });

    await expect(
      confirmTossPaymentForOwner({
        guestSessionId: other,
        orderIdParam: created.order.orderNo,
        paymentKey: `mock_pk_other_${created.order.orderNo}`,
        callbackAmount: 12900,
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("C: double confirm / 10x refresh ??1 payment, 1 report", async () => {
    const guest = createGuestSessionId();
    const free = await seedFree(guest);
    const created = await createOrderForGuest({
      guestSessionId: guest,
      productId: MOCK_PRODUCT_IDS.career,
      sourceResultId: free.freeResultId,
      paymentMethod: "TOSS",
    });
    const paymentKey = `mock_pk_idem_${created.order.orderNo}`;

    for (let i = 0; i < 10; i++) {
      const result = await confirmTossPaymentForOwner({
        guestSessionId: guest,
        orderIdParam: created.order.orderNo,
        paymentKey,
        callbackAmount: created.order.amount,
      });
      expect(result.order.id).toBe(created.order.id);
    }

    expect(await getPaymentsByOrderId(created.order.id)).toHaveLength(1);
    const reports = [...mockStore.reports.values()].filter(
      (r) => r.order_id === created.order.id
    );
    expect(reports).toHaveLength(1);
  });

  it("D: INACTIVE product cannot create order", async () => {
    const guest = createGuestSessionId();
    const free = await seedFree(guest);
    const product = mockProducts.find((p) => p.id === MOCK_PRODUCT_IDS.love)!;
    const prev = product.status;
    product.status = "INACTIVE";
    try {
      await expect(
        createOrderForGuest({
          guestSessionId: guest,
          productId: product.id,
          sourceResultId: free.freeResultId,
          paymentMethod: "TOSS",
        })
      ).rejects.toMatchObject({ code: "PRODUCT_NOT_AVAILABLE" });
    } finally {
      product.status = prev;
    }
  });

  it("E/F: fake success / invalid paymentKey does not PAID", async () => {
    const guest = createGuestSessionId();
    const free = await seedFree(guest);
    const created = await createOrderForGuest({
      guestSessionId: guest,
      productId: MOCK_PRODUCT_IDS.total,
      sourceResultId: free.freeResultId,
      paymentMethod: "TOSS",
    });

    await expect(
      confirmTossPaymentForOwner({
        guestSessionId: guest,
        orderIdParam: created.order.orderNo,
        paymentKey: "invalid_fake_key_xxxxx",
        callbackAmount: 12900,
      })
    ).rejects.toBeInstanceOf(FreeFlowError);

    const order = await getOrderById(created.order.id);
    expect(order?.status).toBe("PENDING");
    expect(order?.paid_at).toBeNull();
  });

  it("paid report access: owner ok, other guest denied", async () => {
    const owner = createGuestSessionId();
    const other = createGuestSessionId();
    const free = await seedFree(owner);
    const created = await createOrderForGuest({
      guestSessionId: owner,
      productId: MOCK_PRODUCT_IDS.total,
      sourceResultId: free.freeResultId,
      paymentMethod: "TOSS",
    });
    await confirmTossPaymentForOwner({
      guestSessionId: owner,
      orderIdParam: created.order.orderNo,
      paymentKey: `mock_pk_access_${created.order.orderNo}`,
      callbackAmount: 12900,
    });

    const report = await getReportByOrderId(created.order.id);
    expect(report).toBeTruthy();

    await expect(
      getPaidReportForOwner({
        reportOrOrderId: report!.id,
        guestSessionId: owner,
      })
    ).resolves.toBeTruthy();

    await expect(
      getPaidReportForOwner({
        reportOrOrderId: report!.id,
        guestSessionId: other,
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("ignores client amount on order create (server price wins)", async () => {
    const guest = createGuestSessionId();
    const free = await seedFree(guest);
    const created = await createOrderForGuest({
      guestSessionId: guest,
      productId: MOCK_PRODUCT_IDS.total,
      sourceResultId: free.freeResultId,
      paymentMethod: "TOSS",
    });
    expect(created.order.amount).toBe(12900);
  });
});
