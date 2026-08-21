/**
 * Bank poller — run with: npx tsx scripts/bank-poll.ts
 * Or: npm run bank:poll
 */
import { runBankPollCycle } from "../src/lib/services/bank-poller";

async function main() {
  const interval = Math.max(
    60_000,
    Number(process.env.BANK_POLL_INTERVAL_MS ?? "120000") || 120_000
  );

  console.log(
    `[bank:poll] start interval=${interval}ms provider=${process.env.BANK_PROVIDER ?? "auto"}`
  );

  async function tick() {
    try {
      const result = await runBankPollCycle();
      console.log(
        `[bank:poll] ok=${result.ok} fetched=${result.fetched} matched=${result.matched} ambiguous=${result.ambiguous} expired=${result.expired}${
          result.errorSafe ? ` err=${result.errorSafe}` : ""
        }`
      );
    } catch (e) {
      console.error(
        "[bank:poll] cycle error",
        e instanceof Error ? e.message : "unknown"
      );
    }
  }

  await tick();
  setInterval(() => void tick(), interval);
}

void main();
