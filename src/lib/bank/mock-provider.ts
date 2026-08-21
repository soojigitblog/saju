import "server-only";

import type {
  BankTransaction,
  BankTransactionProvider,
  GetIncomingTransactionsInput,
} from "@/lib/bank/provider";
import { mapHanaRowsToTransactions } from "@/lib/bank/hana/mapper";
import { toInboundOnly } from "@/lib/bank/hana/transaction-normalizer";
import type { HanaRawIncomingRow } from "@/lib/bank/hana/types";

/**
 * In-process mock bank for E2E. Production must never select this.
 */
export class MockHanaBankProvider implements BankTransactionProvider {
  readonly id = "HANA" as const;
  private fixtures: HanaRawIncomingRow[] = [];

  seed(rows: HanaRawIncomingRow[]) {
    this.fixtures = [...rows];
  }

  clear() {
    this.fixtures = [];
  }

  async getIncomingTransactions(
    input: GetIncomingTransactionsInput
  ): Promise<BankTransaction[]> {
    if (
      process.env.NODE_ENV === "production" &&
      process.env.ALLOW_MOCK_BANK !== "1"
    ) {
      throw new Error("Mock bank forbidden in production");
    }
    const mapped = toInboundOnly(mapHanaRowsToTransactions(this.fixtures));
    return mapped.filter(
      (t) => t.occurredAt >= input.from && t.occurredAt <= input.to
    );
  }
}

/** Shared singleton for tests / local poller when BANK_PROVIDER=mock */
const g = globalThis as unknown as {
  __mockHanaBank?: MockHanaBankProvider;
};

export function getMockHanaBankProvider(): MockHanaBankProvider {
  if (!g.__mockHanaBank) g.__mockHanaBank = new MockHanaBankProvider();
  return g.__mockHanaBank;
}
