import "server-only";

/**
 * Hana personal-banking adapter — Playwright persistent session (PHASE 6.4).
 *
 * Does NOT implement CAPTCHA/MFA/security-media bypass.
 * Prefers saved Playwright session; on expiry may attempt ID/password UI login
 * via Windows Credential Manager (`ensureHanaAutoLogin`).
 */

import {
  BankProviderError,
  type BankTransaction,
  type BankTransactionProvider,
  type GetIncomingTransactionsInput,
} from "@/lib/bank/provider";
import { mapHanaRowsToTransactions } from "@/lib/bank/hana/mapper";
import { toInboundOnly } from "@/lib/bank/hana/transaction-normalizer";
import { isHanaAutomationEnabled } from "@/lib/bank/hana/playwright/config";

export class HanaBankProvider implements BankTransactionProvider {
  readonly id = "HANA" as const;

  async getIncomingTransactions(
    input: GetIncomingTransactionsInput
  ): Promise<BankTransaction[]> {
    if (!isHanaAutomationEnabled()) {
      throw new BankProviderError(
        "BANK_NOT_CONFIGURED",
        "하나은행 자동 조회가 활성화되지 않았습니다. HANA_BANK_AUTOMATION_ENABLED=1 및 BANK_PROVIDER=hana 를 설정하세요."
      );
    }

    try {
      const { fetchHanaIncomingRows } = await import(
        "@/lib/bank/hana/playwright/fetch-incoming"
      );
      const rows = await fetchHanaIncomingRows(input);
      return toInboundOnly(mapHanaRowsToTransactions(rows));
    } catch (error) {
      if (error instanceof BankProviderError) throw error;
      throw new BankProviderError(
        "BANK_CHECK_FAILED",
        error instanceof Error ? error.message : "하나은행 조회 실패"
      );
    }
  }
}

/** Test helper — not used in production paths. */
export function parseFixtureRows(
  rows: Parameters<typeof mapHanaRowsToTransactions>[0]
): BankTransaction[] {
  return toInboundOnly(mapHanaRowsToTransactions(rows));
}
