import "server-only";

/**
 * Hana personal-banking adapter.
 *
 * Does NOT implement CAPTCHA/MFA/security-media bypass.
 * When credentials are absent or automated access is blocked,
 * throws BankProviderError → poller keeps orders PENDING + admin fallback.
 */

import {
  BankProviderError,
  type BankTransaction,
  type BankTransactionProvider,
  type GetIncomingTransactionsInput,
} from "@/lib/bank/provider";
import { mapHanaRowsToTransactions } from "@/lib/bank/hana/mapper";
import { toInboundOnly } from "@/lib/bank/hana/transaction-normalizer";

export class HanaBankProvider implements BankTransactionProvider {
  readonly id = "HANA" as const;

  async getIncomingTransactions(
    input: GetIncomingTransactionsInput
  ): Promise<BankTransaction[]> {
    const configured =
      process.env.HANA_BANK_AUTOMATION_ENABLED === "1" &&
      Boolean(process.env.HANA_BANK_CREDENTIAL_REF?.trim());

    if (!configured) {
      throw new BankProviderError(
        "BANK_NOT_CONFIGURED",
        "하나은행 자동 조회가 설정되지 않았습니다. 관리자 수동 확인을 사용하세요."
      );
    }

    // Intentional: no scraper that circumvents bank access controls.
    // Wire a compliant automation backend later via HANA_BANK_CREDENTIAL_REF.
    void input;
    throw new BankProviderError(
      "BANK_UNSUPPORTED",
      "하나은행 자동 조회는 현재 환경에서 사용할 수 없습니다. 수동 확인으로 처리하세요."
    );
  }
}

/** Test helper — not used in production paths. */
export function parseFixtureRows(
  rows: Parameters<typeof mapHanaRowsToTransactions>[0]
): BankTransaction[] {
  return toInboundOnly(mapHanaRowsToTransactions(rows));
}
