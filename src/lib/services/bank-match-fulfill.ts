import "server-only";

import type { BankTransaction } from "@/lib/bank/provider";
import {
  insertBankTransactionIfAbsent,
  updateBankTransaction,
} from "@/lib/repositories/bank-transactions";
import {
  getOrderById,
  listPendingBankTransferOrders,
  markOrderPaidIfPending,
} from "@/lib/repositories/orders";
import { createPaymentIdempotent } from "@/lib/repositories/payments";
import { createOrderAccessToken } from "@/lib/orders/access-token";
import { startPaidReportJob } from "@/lib/services/paid-report-job";
import { findBankMatchCandidates } from "@/lib/bank/match-orders";
import { maskDepositorName } from "@/lib/bank/hana/transaction-normalizer";
import { trackEvent } from "@/lib/repositories/analytics";
import type { Json } from "@/types/database.types";
import { FreeFlowError } from "@/lib/services/free-flow-errors";

export type ProcessBankTxResult = {
  fingerprint: string;
  matchStatus: "UNMATCHED" | "MATCHED" | "AMBIGUOUS" | "IGNORED" | "ALREADY";
  orderId?: string;
};

/**
 * Ingest one inbound bank tx → match → optional PAID + report.
 * Idempotent on fingerprint.
 */
export async function processInboundBankTransaction(
  tx: BankTransaction
): Promise<ProcessBankTxResult> {
  if (tx.direction !== "IN") {
    return { fingerprint: tx.rawFingerprint, matchStatus: "IGNORED" };
  }

  const { row, created } = await insertBankTransactionIfAbsent({
    provider: "HANA",
    external_transaction_id: tx.transactionId ?? null,
    fingerprint: tx.rawFingerprint,
    occurred_at: tx.occurredAt.toISOString(),
    amount: tx.amount,
    depositor_name_masked: maskDepositorName(tx.depositorName),
    match_status: "UNMATCHED",
  });

  if (!created && row.match_status === "MATCHED") {
    return {
      fingerprint: tx.rawFingerprint,
      matchStatus: "ALREADY",
      orderId: row.matched_order_id ?? undefined,
    };
  }
  if (!created && row.match_status === "AMBIGUOUS") {
    return { fingerprint: tx.rawFingerprint, matchStatus: "AMBIGUOUS" };
  }
  if (!created && row.match_status !== "UNMATCHED") {
    return { fingerprint: tx.rawFingerprint, matchStatus: row.match_status };
  }

  const pending = await listPendingBankTransferOrders();
  const candidates = findBankMatchCandidates(tx, pending);

  if (candidates.length === 0) {
    return { fingerprint: tx.rawFingerprint, matchStatus: "UNMATCHED" };
  }

  if (candidates.length > 1) {
    await updateBankTransaction(row.id, { match_status: "AMBIGUOUS" });
    return { fingerprint: tx.rawFingerprint, matchStatus: "AMBIGUOUS" };
  }

  const order = candidates[0]!;
  return fulfillBankMatch({
    bankTxId: row.id,
    fingerprint: tx.rawFingerprint,
    orderId: order.id,
    amount: tx.amount,
  });
}

export async function fulfillBankMatch(input: {
  bankTxId: string;
  fingerprint: string;
  orderId: string;
  amount: number;
  manual?: { by: string; reason: string };
}): Promise<ProcessBankTxResult> {
  const order = await getOrderById(input.orderId);
  if (!order || order.status !== "PENDING") {
    await updateBankTransaction(input.bankTxId, {
      match_status: "IGNORED",
    });
    return { fingerprint: input.fingerprint, matchStatus: "IGNORED" };
  }
  if (order.amount !== input.amount) {
    throw new FreeFlowError(
      "PAYMENT_AMOUNT_MISMATCH",
      "입금액이 주문 금액과 다릅니다.",
      400
    );
  }

  const paidAt = new Date().toISOString();
  const { rawToken: _token, tokenHash } = createOrderAccessToken();
  void _token;

  const { payment, created } = await createPaymentIdempotent({
    order_id: order.id,
    provider: "BANK_TRANSFER",
    payment_key: `bank:${input.fingerprint}`,
    payment_method: "BANK_TRANSFER_HANA",
    provider_status: "DONE",
    amount: input.amount,
    requested_amount: order.amount,
    approved_amount: input.amount,
    provider_order_id: order.order_no,
    approved_at: paidAt,
    raw_response: {
      bankProvider: "HANA",
      fingerprint: input.fingerprint.slice(0, 16) + "…",
      appEnv: process.env.APP_ENV ?? process.env.NODE_ENV,
      manual: input.manual ?? null,
    } as Json,
  });

  if (!created && payment.order_id !== order.id) {
    throw new FreeFlowError(
      "PAYMENT_CONFLICT",
      "이미 다른 주문에 연결된 입금입니다.",
      409
    );
  }

  const paid = await markOrderPaidIfPending({
    orderId: order.id,
    paidAt,
    accessTokenHash: tokenHash,
  });

  if (!paid) {
    // Race — already paid
    await updateBankTransaction(input.bankTxId, {
      match_status: "MATCHED",
      matched_order_id: order.id,
    });
    return {
      fingerprint: input.fingerprint,
      matchStatus: "ALREADY",
      orderId: order.id,
    };
  }

  await updateBankTransaction(input.bankTxId, {
    match_status: "MATCHED",
    matched_order_id: order.id,
    manual_approved_by: input.manual?.by ?? null,
    manual_approved_at: input.manual ? paidAt : null,
    manual_reason: input.manual?.reason ?? null,
  });

  try {
    await trackEvent({
      sessionId: order.guest_session_id ?? order.id,
      eventName: "payment_success",
      productId: order.product_id,
      metadata: {
        orderId: order.id,
        amount: order.amount,
        paymentMethod: "BANK_TRANSFER",
      },
    });
  } catch {
    /* best-effort */
  }

  await startPaidReportJob({
    orderId: paid.id,
    runGeneration: true,
  });

  return {
    fingerprint: input.fingerprint,
    matchStatus: "MATCHED",
    orderId: paid.id,
  };
}
