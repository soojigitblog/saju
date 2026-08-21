import "server-only";

export type BankProviderId = "HANA";

export type BankTransactionDirection = "IN" | "OUT";

export type BankTransaction = {
  provider: BankProviderId;
  /** Bank-side id when available. */
  transactionId?: string;
  occurredAt: Date;
  direction: BankTransactionDirection;
  amount: number;
  depositorName?: string;
  description?: string;
  balanceAfter?: number;
  /** Stable hash for idempotent ingest — never log secrets. */
  rawFingerprint: string;
};

export type GetIncomingTransactionsInput = {
  from: Date;
  to: Date;
};

export interface BankTransactionProvider {
  readonly id: BankProviderId;
  getIncomingTransactions(
    input: GetIncomingTransactionsInput
  ): Promise<BankTransaction[]>;
}

export class BankProviderError extends Error {
  readonly code: "BANK_CHECK_FAILED" | "BANK_NOT_CONFIGURED" | "BANK_UNSUPPORTED";
  constructor(
    code: BankProviderError["code"],
    message: string
  ) {
    super(message);
    this.name = "BankProviderError";
    this.code = code;
  }
}
