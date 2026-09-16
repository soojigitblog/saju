import { beforeEach, describe, expect, it } from "vitest";
import {
  createFreeFortune,
  resetMockFreeFlowState,
} from "@/lib/services/create-free-fortune";
import { createOrderForGuest } from "@/lib/services/create-order";
import { processInboundBankTransaction } from "@/lib/services/bank-match-fulfill";
import { restoreOrderByAccessToken } from "@/lib/services/restore-order-access";
import { getPaidReportForOwner } from "@/lib/services/get-paid-report";
import { createGuestSessionId } from "@/lib/guest/session";
import { MOCK_PRODUCT_IDS } from "@/lib/mock-data";
import { getOrderById } from "@/lib/repositories/orders";
import { getReportByOrderId } from "@/lib/repositories/reports";
import { hashOrderAccessToken } from "@/lib/orders/access-token";
import { getMockHanaBankProvider } from "@/lib/bank/mock-provider";
import type { BankTransaction } from "@/lib/bank/provider";

const sampleInput = {
  nickname: "복원토큰",
  gender: "female" as const,
  calendarType: "solar" as const,
  birthDate: "1987-04-12",
  birthTime: "09:15",
  birthTimeUnknown: false,
  lunarLeapMonth: false,
  birthPlace: "대구",
  maritalStatus: "unmarried" as const,
  hasChildren: null,
  timezone: "Asia/Seoul" as const,
};

function tx(partial: Partial<BankTransaction> & { amount: number; depositorName: string }): BankTransaction {
  const occurredAt = partial.occurredAt ?? new Date();
  return {
    provider: "HANA",
    transactionId: partial.transactionId,
    occurredAt,
    direction: "IN",
    amount: partial.amount,
    depositorName: partial.depositorName,
    description: partial.description,
    rawFingerprint:
      partial.rawFingerprint ??
      `fp-${partial.transactionId ?? `${partial.amount}-${partial.depositorName}-${occurredAt.toISOString()}`}`,
  };
}

describe("bank transfer access token restore", () => {
  beforeEach(() => {
    resetMockFreeFlowState();
    process.env.AI_PROVIDER = "mock";
    process.env.BANK_PROVIDER = "mock";
    process.env.ALLOW_PAID_QA_CHECKOUT = "1";
    process.env.BANK_TRANSFER_ACCOUNT_NUMBER = "123-456789-01234";
    process.env.BANK_TRANSFER_ACCOUNT_HOLDER = "운의결";
    getMockHanaBankProvider().clear();
  });

  async function seedOrder(depositor: string) {
    const guest = createGuestSessionId();
    const free = await createFreeFortune({
      raw: { ...sampleInput, nickname: depositor },
      guestSessionId: guest,
    });
    const created = await createOrderForGuest({
      guestSessionId: guest,
      productId: MOCK_PRODUCT_IDS.total,
      sourceResultId: free.freeResultId,
      depositorName: depositor,
      paymentMethod: "BANK_TRANSFER",
      internalQaCheckout: true,
    });
    return { guest, created, sourceResultId: free.freeResultId };
  }

  it("issues a restore token at order create and keeps the same hash after bank match", async () => {
    const { created } = await seedOrder("토큰유지");
    expect(created.accessToken).toBeTruthy();
    expect(created.accessToken!.length).toBeGreaterThan(16);

    const pending = await getOrderById(created.order.id);
    expect(pending?.access_token_hash).toBe(
      hashOrderAccessToken(created.accessToken!)
    );

    const matched = await processInboundBankTransaction(
      tx({
        transactionId: "token-keep-1",
        amount: created.order.amount,
        depositorName: "토큰유지",
      })
    );
    expect(matched.matchStatus).toBe("MATCHED");

    const paid = await getOrderById(created.order.id);
    expect(paid?.access_token_hash).toBe(pending?.access_token_hash);
    expect(paid?.paid_at).toBeTruthy();

    const restored = await restoreOrderByAccessToken(created.accessToken!);
    expect(restored.orderId).toBe(created.order.id);
    expect(restored.paid).toBe(true);

    const report = await getReportByOrderId(created.order.id);
    expect(report).toBeTruthy();

    const accessed = await getPaidReportForOwner({
      reportOrOrderId: report!.id,
      guestSessionId: null,
      accessToken: created.accessToken,
    });
    expect(accessed.order.id).toBe(created.order.id);
  });

  it("does not rotate the token when the pending order is reused", async () => {
    const { guest, created, sourceResultId } = await seedOrder("재사용토큰");
    const firstHash = (await getOrderById(created.order.id))?.access_token_hash;
    expect(firstHash).toBeTruthy();

    const reused = await createOrderForGuest({
      guestSessionId: guest,
      productId: MOCK_PRODUCT_IDS.total,
      sourceResultId,
      depositorName: "재사용토큰",
      paymentMethod: "BANK_TRANSFER",
      internalQaCheckout: true,
    });

    expect(reused.reused).toBe(true);
    expect(reused.accessToken).toBeNull();
    expect(reused.order.id).toBe(created.order.id);
    expect((await getOrderById(created.order.id))?.access_token_hash).toBe(firstHash);
  });

  it("rejects an unknown restore token", async () => {
    await expect(
      restoreOrderByAccessToken("this-token-does-not-exist-at-all")
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
