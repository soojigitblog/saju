import "server-only";

import type { BankTransaction } from "@/lib/bank/provider";
import { buildBankFingerprint } from "@/lib/bank/hana/transaction-normalizer";
import type { HanaRawIncomingRow } from "@/lib/bank/hana/types";

export function mapHanaRowsToTransactions(
  rows: HanaRawIncomingRow[]
): BankTransaction[] {
  return rows.map((row) => {
    const occurredAt = new Date(row.occurredAt);
    const depositorName = row.depositorName?.trim() || undefined;
    return {
      provider: "HANA" as const,
      transactionId: row.id,
      occurredAt,
      direction: "IN" as const,
      amount: row.amount,
      depositorName,
      description: row.description,
      rawFingerprint: buildBankFingerprint({
        provider: "HANA",
        transactionId: row.id,
        occurredAt,
        amount: row.amount,
        depositorName,
        description: row.description,
      }),
    };
  });
}
