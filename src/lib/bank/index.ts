import "server-only";

import type { BankTransactionProvider } from "@/lib/bank/provider";
import { HanaBankProvider } from "@/lib/bank/hana/client";
import { getMockHanaBankProvider } from "@/lib/bank/mock-provider";

/**
 * Resolve bank transaction provider.
 * - BANK_PROVIDER=mock → MockHana (E2E / local without bank login)
 * - otherwise Hana adapter (fails closed → manual review if not configured)
 */
export function getBankTransactionProvider(): BankTransactionProvider {
  const explicit = (process.env.BANK_PROVIDER ?? "").toLowerCase();
  if (explicit === "mock") {
    return getMockHanaBankProvider();
  }
  if (process.env.NODE_ENV !== "production" && !process.env.HANA_BANK_AUTOMATION_ENABLED) {
    // Dev default without automation flag: mock so poller can be exercised
    if (explicit !== "hana") {
      return getMockHanaBankProvider();
    }
  }
  return new HanaBankProvider();
}
