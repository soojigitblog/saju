import "server-only";

import { getBankTransactionProvider } from "@/lib/bank";
import { BankProviderError } from "@/lib/bank/provider";
import { processInboundBankTransaction } from "@/lib/services/bank-match-fulfill";
import {
  expireStaleBankOrders,
} from "@/lib/repositories/orders";
import { upsertBankPollerHealth } from "@/lib/repositories/bank-transactions";

export type BankPollCycleResult = {
  ok: boolean;
  fetched: number;
  matched: number;
  ambiguous: number;
  expired: number;
  errorSafe?: string;
};

/**
 * One poll cycle — framework-independent (callable from cron / npm script).
 * Never throws bank credentials; never calls Gemini here (only via fulfill).
 */
export async function runBankPollCycle(): Promise<BankPollCycleResult> {
  await upsertBankPollerHealth({ status: "RUNNING" });
  const expired = await expireStaleBankOrders();

  const to = new Date();
  const from = new Date(to.getTime() - 48 * 60 * 60 * 1000);

  try {
    const provider = getBankTransactionProvider();
    const txs = await provider.getIncomingTransactions({ from, to });

    let matched = 0;
    let ambiguous = 0;
    for (const tx of txs) {
      const result = await processInboundBankTransaction(tx);
      if (result.matchStatus === "MATCHED") matched += 1;
      if (result.matchStatus === "AMBIGUOUS") ambiguous += 1;
    }

    await upsertBankPollerHealth({
      status: "IDLE",
      lastSuccessAt: new Date().toISOString(),
      lastErrorSafe: null,
      lastFetchedCount: txs.length,
      lastMatchedCount: matched,
      lastAmbiguousCount: ambiguous,
    });

    return {
      ok: true,
      fetched: txs.length,
      matched,
      ambiguous,
      expired,
    };
  } catch (error) {
    const safe =
      error instanceof BankProviderError
        ? error.code
        : "BANK_CHECK_FAILED";
    await upsertBankPollerHealth({
      status: "ERROR",
      lastErrorSafe: safe,
    });
    return {
      ok: false,
      fetched: 0,
      matched: 0,
      ambiguous: 0,
      expired,
      errorSafe: safe,
    };
  }
}
