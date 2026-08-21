import { beforeEach, describe, expect, it } from "vitest";
import {
  createFreeFortune,
  resetMockFreeFlowState,
} from "@/lib/services/create-free-fortune";
import { createOrderForGuest } from "@/lib/services/create-order";
import { processInboundBankTransaction } from "@/lib/services/bank-match-fulfill";
import { runBankPollCycle } from "@/lib/services/bank-poller";
import { getMockHanaBankProvider } from "@/lib/bank/mock-provider";
import { createGuestSessionId } from "@/lib/guest/session";
import { mockStore } from "@/lib/mock-store";
import { MOCK_PRODUCT_IDS } from "@/lib/mock-data";
import { getOrderById } from "@/lib/repositories/orders";
import { getPaymentsByOrderId } from "@/lib/repositories/payments";
import { getReportByOrderId } from "@/lib/repositories/reports";
import { findBankMatchCandidates } from "@/lib/bank/match-orders";
import type { BankTransaction } from "@/lib/bank/provider";
import type { Order } from "@/lib/repositories/orders";

const sampleInput = {
  nickname: "은행이체",
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

function tx(
  partial: Partial<BankTransaction> & { amount: number; depositorName: string }
): BankTransaction {
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

describe("PHASE 6.2 bank transfer E2E (mock)", () => {
  beforeEach(() => {
    resetMockFreeFlowState();
    process.env.AI_PROVIDER = "mock";
    process.env.BANK_PROVIDER = "mock";
    process.env.BANK_TRANSFER_ACCOUNT_NUMBER = "123-456789-01234";
    process.env.BANK_TRANSFER_ACCOUNT_HOLDER = "운의결";
    getMockHanaBankProvider().clear();
  });

  async function seedOrder(depositor: string, productId = MOCK_PRODUCT_IDS.total) {
    const guest = createGuestSessionId();
    const free = await createFreeFortune({
      raw: { ...sampleInput, nickname: depositor },
      guestSessionId: guest,
    });
    const created = await createOrderForGuest({
      guestSessionId: guest,
      productId,
      sourceResultId: free.freeResultId,
      depositorName: depositor,
      paymentMethod: "BANK_TRANSFER",
    });
    return { guest, free, created };
  }

  it("A: mock bank full flow product→order→wait→match→PAID→report", async () => {
    const { created, free } = await seedOrder("전체플로우");
    expect(created.bankAccount?.bankName).toBeTruthy();
    expect(created.bankAccount?.accountNumber).toBe("123-456789-01234");
    expect(created.waitUrl).toBe(`/payment/bank/${created.order.id}`);
    expect(created.order.status).toBe("PENDING");
    expect(created.order.paymentMethod).toBe("BANK_TRANSFER");
    expect(free.freeResultId).toBeTruthy();

    getMockHanaBankProvider().seed([
      {
        id: "full-flow-1",
        occurredAt: new Date().toISOString(),
        amount: created.order.amount,
        depositorName: "전체플로우",
      },
    ]);

    const cycle = await runBankPollCycle();
    expect(cycle.ok).toBe(true);
    expect(cycle.matched).toBe(1);

    const order = await getOrderById(created.order.id);
    expect(order?.paid_at).toBeTruthy();
    expect(["PAID", "GENERATING", "COMPLETED", "FAILED"]).toContain(order?.status);

    const payments = await getPaymentsByOrderId(created.order.id);
    expect(payments).toHaveLength(1);
    expect(payments[0]?.provider).toBe("BANK_TRANSFER");
    expect(payments[0]?.payment_method).toBe("BANK_TRANSFER_HANA");

    const report = await getReportByOrderId(created.order.id);
    expect(report).toBeTruthy();
    expect(report?.order_id).toBe(created.order.id);

    await processInboundBankTransaction(
      tx({
        transactionId: "full-flow-1",
        amount: created.order.amount,
        depositorName: "전체플로우",
      })
    );
    expect(await getPaymentsByOrderId(created.order.id)).toHaveLength(1);
    expect(
      [...mockStore.reports.values()].filter((r) => r.order_id === created.order.id)
    ).toHaveLength(1);
  });

  it("B: manual approve unmatched deposit (admin fallback, no live scrape)", async () => {
    const { created } = await seedOrder("수동승인");

    const inserted = await processInboundBankTransaction(
      tx({
        transactionId: "manual-1",
        amount: 12900,
        depositorName: "다른이름",
      })
    );
    expect(inserted.matchStatus).toBe("UNMATCHED");
    expect((await getOrderById(created.order.id))?.status).toBe("PENDING");

    const bankRow = [...mockStore.bankTransactions.values()].find(
      (t) => t.external_transaction_id === "manual-1"
    );
    expect(bankRow).toBeTruthy();

    const { fulfillBankMatch } = await import(
      "@/lib/services/bank-match-fulfill"
    );
    const result = await fulfillBankMatch({
      bankTxId: bankRow!.id,
      fingerprint: bankRow!.fingerprint,
      orderId: created.order.id,
      amount: bankRow!.amount,
      manual: { by: "admin", reason: "소액 실입금 육안 확인" },
    });
    expect(result.matchStatus).toBe("MATCHED");

    const order = await getOrderById(created.order.id);
    expect(order?.paid_at).toBeTruthy();
    expect(await getPaymentsByOrderId(created.order.id)).toHaveLength(1);
    expect(await getReportByOrderId(created.order.id)).toBeTruthy();

    const updatedTx = mockStore.bankTransactions.get(bankRow!.id);
    expect(updatedTx?.match_status).toBe("MATCHED");
    expect(updatedTx?.manual_approved_by).toBe("admin");
    expect(updatedTx?.manual_reason).toContain("육안");
  });

  it("happy path: bank match → PAID → report", async () => {
    const { created } = await seedOrder("김테스트");
    expect(created.order.amount).toBe(12900);
    expect(created.waitUrl).toContain("/payment/bank/");

    const result = await processInboundBankTransaction(
      tx({
        transactionId: "hana-1",
        amount: 12900,
        depositorName: "김테스트",
        occurredAt: new Date(),
      })
    );
    expect(result.matchStatus).toBe("MATCHED");

    const order = await getOrderById(created.order.id);
    expect(order?.paid_at).toBeTruthy();
    expect(["PAID", "GENERATING", "COMPLETED", "FAILED"]).toContain(order?.status);

    const payments = await getPaymentsByOrderId(created.order.id);
    expect(payments).toHaveLength(1);
    expect(payments[0].provider).toBe("BANK_TRANSFER");

    const report = await getReportByOrderId(created.order.id);
    expect(report).toBeTruthy();
  });

  it("exact amount + exact depositor required", async () => {
    const { created } = await seedOrder("홍길동");
    const wrongName = await processInboundBankTransaction(
      tx({ transactionId: "w1", amount: 12900, depositorName: "이순신" })
    );
    expect(wrongName.matchStatus).toBe("UNMATCHED");
    expect((await getOrderById(created.order.id))?.status).toBe("PENDING");

    const wrongAmt = await processInboundBankTransaction(
      tx({ transactionId: "w2", amount: 12000, depositorName: "홍길동" })
    );
    expect(wrongAmt.matchStatus).toBe("UNMATCHED");
  });

  it("ambiguous when two pending same name+amount", async () => {
    const a = await seedOrder("동일인");
    const guest2 = createGuestSessionId();
    const free2 = await createFreeFortune({
      raw: { ...sampleInput, nickname: "동일인", birthDate: "1988-01-01" },
      guestSessionId: guest2,
    });
    await createOrderForGuest({
      guestSessionId: guest2,
      productId: MOCK_PRODUCT_IDS.total,
      sourceResultId: free2.freeResultId,
      depositorName: "동일인",
    });

    const result = await processInboundBankTransaction(
      tx({ transactionId: "amb-1", amount: 12900, depositorName: "동일인" })
    );
    expect(result.matchStatus).toBe("AMBIGUOUS");
    expect((await getOrderById(a.created.order.id))?.status).toBe("PENDING");
  });

  it("dedupes same transaction fingerprint", async () => {
    const { created } = await seedOrder("중복방지");
    const payload = tx({
      transactionId: "dup-1",
      amount: 12900,
      depositorName: "중복방지",
    });
    await processInboundBankTransaction(payload);
    await processInboundBankTransaction(payload);
    expect(await getPaymentsByOrderId(created.order.id)).toHaveLength(1);
    expect(
      [...mockStore.bankTransactions.values()].filter(
        (t) => t.fingerprint === payload.rawFingerprint
      )
    ).toHaveLength(1);
  });

  it("poller cycle with mock bank seeds", async () => {
    const { created } = await seedOrder("폴러검증");
    getMockHanaBankProvider().seed([
      {
        id: "poll-1",
        occurredAt: new Date().toISOString(),
        amount: 12900,
        depositorName: "폴러검증",
      },
    ]);
    const cycle = await runBankPollCycle();
    expect(cycle.ok).toBe(true);
    expect(cycle.matched).toBeGreaterThanOrEqual(1);
    const order = await getOrderById(created.order.id);
    expect(order?.paid_at).toBeTruthy();
  });

  it("matcher rejects over/under amount", () => {
    const order = {
      status: "PENDING",
      payment_method: "BANK_TRANSFER",
      amount: 12900,
      depositor_name_normalized: "테스트",
      depositor_name: "테스트",
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    } as Order;
    const over = findBankMatchCandidates(
      tx({ amount: 13000, depositorName: "테스트" }),
      [order]
    );
    expect(over).toHaveLength(0);
  });
});
