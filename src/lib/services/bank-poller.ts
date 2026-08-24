import "server-only";

import { getBankTransactionProvider } from "@/lib/bank";
import { BankProviderError } from "@/lib/bank/provider";
import { processInboundBankTransaction } from "@/lib/services/bank-match-fulfill";
import { expireStaleBankOrders } from "@/lib/repositories/orders";
import {
  getBankPollerHealth,
  upsertBankPollerHealth,
} from "@/lib/repositories/bank-transactions";

export type BankPollCycleResult = {
  ok: boolean;
  fetched: number;
  matched: number;
  ambiguous: number;
  expired: number;
  errorSafe?: string;
  /** Session still expired — caller should not spam logs */
  quiet?: boolean;
  /** Session recovered after prior SESSION_EXPIRED */
  recovered?: boolean;
};

function resolveFetchWindow(lastSuccessAt: string | null | undefined): {
  from: Date;
  to: Date;
} {
  const to = new Date();
  const oneDayAgo = new Date(to.getTime() - 24 * 60 * 60 * 1000);
  let from = oneDayAgo;

  if (lastSuccessAt) {
    const last = new Date(lastSuccessAt);
    if (!Number.isNaN(last.getTime())) {
      const overlap = new Date(last.getTime() - 5 * 60 * 1000);
      from = new Date(Math.max(from.getTime(), overlap.getTime()));
    }
  }

  return { from, to };
}

function isSessionExpiredHealth(
  health: Awaited<ReturnType<typeof getBankPollerHealth>>
): boolean {
  if (!health) return false;
  if (health.status === "SESSION_EXPIRED") return true;
  return (
    health.last_error_safe === "HANA_SESSION_EXPIRED" ||
    health.last_error_safe === "AUTH_REQUIRED"
  );
}

async function markSessionExpired(lastErrorSafe: string) {
  await upsertBankPollerHealth({
    status: "SESSION_EXPIRED",
    lastErrorSafe,
  });
}

/**
 * One poll cycle — framework-independent (callable from cron / npm script / deposit-ack).
 * Never throws bank credentials; never calls Gemini here (only via fulfill).
 *
 * Session expiry is never reported as ok + fetched=0.
 * While health is SESSION_EXPIRED, repeats stay quiet until re-login succeeds.
 */
export async function runBankPollCycle(): Promise<BankPollCycleResult> {
  const expired = await expireStaleBankOrders();
  const priorHealth = await getBankPollerHealth();
  const wasSessionExpired = isSessionExpiredHealth(priorHealth);
  const { from, to } = resolveFetchWindow(priorHealth?.last_success_at);

  // While waiting for re-login, probe quietly — do not flip to RUNNING (avoids UI flicker)
  if (!wasSessionExpired) {
    await upsertBankPollerHealth({ status: "RUNNING" });
  }

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
      recovered: wasSessionExpired,
    };
  } catch (error) {
    const safe =
      error instanceof BankProviderError ? error.code : "BANK_CHECK_FAILED";

    if (
      safe === "HANA_SESSION_EXPIRED" ||
      safe === "AUTH_REQUIRED" ||
      safe === "CAPTCHA_REQUIRED" ||
      safe === "LOGIN_FAILED" ||
      safe === "LOGIN_REQUIRED" ||
      safe === "AUTO_LOGIN_UNSUPPORTED" ||
      safe === "AUTO_LOGIN_DISABLED_TEMPORARILY"
    ) {
      await markSessionExpired(safe);
      return {
        ok: false,
        fetched: 0,
        matched: 0,
        ambiguous: 0,
        expired,
        errorSafe: safe,
        quiet: wasSessionExpired,
      };
    }

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
