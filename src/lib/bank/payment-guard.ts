import "server-only";

import { FreeFlowError } from "@/lib/services/free-flow-errors";

/** True when BANK_PROVIDER=mock is explicitly set. */
export function isExplicitMockBankProvider(): boolean {
  return (process.env.BANK_PROVIDER ?? "").toLowerCase() === "mock";
}

/**
 * Block PAID fulfillment when mock bank is active in non-test runtime.
 * Vitest (NODE_ENV=test) and ADMIN_MANUAL_BYPASS (local E2E) remain allowed.
 */
export function assertBankPaidAllowed(): void {
  if (process.env.NODE_ENV === "test") return;
  if (process.env.ADMIN_MANUAL_BYPASS === "1") return;

  if (isExplicitMockBankProvider()) {
    throw new FreeFlowError(
      "BANK_MOCK_DISABLED",
      "Mock bank provider cannot approve real payments. Set BANK_PROVIDER=hana for production.",
      403
    );
  }
}
