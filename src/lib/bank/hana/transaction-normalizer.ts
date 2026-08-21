import "server-only";

import { createHash } from "node:crypto";
import type { BankTransaction } from "@/lib/bank/provider";

/** Trim + collapse whitespace + NFC. No fuzzy/partial matching. */
export function normalizeDepositorName(name: string): string {
  return name.normalize("NFC").trim().replace(/\s+/g, " ");
}

export function maskDepositorName(name: string | null | undefined): string | null {
  if (!name) return null;
  const n = normalizeDepositorName(name);
  if (n.length <= 1) return "*";
  if (n.length === 2) return `${n[0]}*`;
  return `${n[0]}${"*".repeat(Math.min(n.length - 1, 2))}`;
}

export function buildBankFingerprint(tx: {
  provider: string;
  transactionId?: string;
  occurredAt: Date;
  amount: number;
  depositorName?: string;
  description?: string;
}): string {
  if (tx.transactionId) {
    return createHash("sha256")
      .update(`${tx.provider}|id|${tx.transactionId}`)
      .digest("hex");
  }
  const parts = [
    tx.provider,
    tx.occurredAt.toISOString(),
    String(tx.amount),
    normalizeDepositorName(tx.depositorName ?? ""),
    (tx.description ?? "").normalize("NFC").trim(),
  ].join("|");
  return createHash("sha256").update(parts).digest("hex");
}

export function toInboundOnly(txs: BankTransaction[]): BankTransaction[] {
  return txs.filter((t) => t.direction === "IN" && t.amount > 0);
}
