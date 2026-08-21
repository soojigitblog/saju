import "server-only";

/**
 * Public bank account DTO for checkout — loaded from env on the server only.
 * Never hardcode account numbers in Client Components.
 */
export function getBankTransferPublicAccount(): {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
} {
  return {
    bankName: process.env.BANK_TRANSFER_BANK_NAME?.trim() || "하나은행",
    accountNumber:
      process.env.BANK_TRANSFER_ACCOUNT_NUMBER?.trim() || "계좌 미설정",
    accountHolder:
      process.env.BANK_TRANSFER_ACCOUNT_HOLDER?.trim() || "예금주 미설정",
  };
}

export function isBankTransferAccountConfigured(): boolean {
  return Boolean(
    process.env.BANK_TRANSFER_ACCOUNT_NUMBER?.trim() &&
      process.env.BANK_TRANSFER_ACCOUNT_HOLDER?.trim()
  );
}
