import "server-only";

import type {
  BankTransaction,
  BankTransactionProvider,
  GetIncomingTransactionsInput,
} from "@/lib/bank/provider";
import { BankProviderError } from "@/lib/bank/provider";
import { mapHanaRowsToTransactions } from "@/lib/bank/hana/mapper";
import { toInboundOnly } from "@/lib/bank/hana/transaction-normalizer";
import type { HanaRawIncomingRow } from "@/lib/bank/hana/types";

/**
 * In-process mock bank for E2E. Production must never select this.
 */
export class MockHanaBankProvider implements BankTransactionProvider {
  readonly id = "HANA" as const;
  private fixtures: HanaRawIncomingRow[] = [];
  private failCode: "HANA_SESSION_EXPIRED" | "AUTH_REQUIRED" | null = null;

  seed(rows: HanaRawIncomingRow[]) {
    this.fixtures = [...rows];
    this.failCode = null;
  }

  clear() {
    this.fixtures = [];
    this.failCode = null;
  }

  /** Test helper — next fetch throws BankProviderError */
  failNextWith(code: "HANA_SESSION_EXPIRED" | "AUTH_REQUIRED") {
    this.failCode = code;
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
    if (this.failCode) {
      const code = this.failCode;
      this.failCode = null;
      throw new BankProviderError(code, code);
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
