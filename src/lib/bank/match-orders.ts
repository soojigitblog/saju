import "server-only";

import type { BankTransaction } from "@/lib/bank/provider";
import type { Order } from "@/lib/repositories/orders";
import { normalizeDepositorName } from "@/lib/bank/hana/transaction-normalizer";

/**
 * Matching strategy (MVP): depositor_name + exact amount + time window.
 * Unique-cent pricing was rejected to avoid UX confusion vs listed price.
 *
 * Never auto-approve when more than one PENDING candidate matches.
 */
export function findBankMatchCandidates(
  tx: BankTransaction,
  pendingOrders: Order[],
  now = new Date()
): Order[] {
  if (tx.direction !== "IN") return [];
  const depositor = normalizeDepositorName(tx.depositorName ?? "");
  if (!depositor) return [];

  return pendingOrders.filter((order) => {
    if (order.status !== "PENDING") return false;
    if ((order.payment_method ?? "BANK_TRANSFER") !== "BANK_TRANSFER") {
      return false;
    }
    if (order.amount !== tx.amount) return false;

    const orderDepositor = order.depositor_name_normalized
      ? normalizeDepositorName(order.depositor_name_normalized)
      : normalizeDepositorName(order.depositor_name ?? "");
    if (!orderDepositor || orderDepositor !== depositor) return false;

    if (order.expires_at && new Date(order.expires_at) < now) return false;

    const created = new Date(order.created_at);
    // Small tolerance before create (clock skew) — 2 minutes
    const earliest = new Date(created.getTime() - 2 * 60 * 1000);
    if (tx.occurredAt < earliest) return false;
    if (order.expires_at && tx.occurredAt > new Date(order.expires_at)) {
      return false;
    }
    return true;
  });
}
