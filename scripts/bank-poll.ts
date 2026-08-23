/**
 * Bank poller — run with: npx tsx scripts/bank-poll.ts
 * Or: npm run bank:poll
 */
import { runBankPollCycle } from "../src/lib/services/bank-poller";
import { hanaPollIntervalMs } from "../src/lib/bank/hana/playwright/config";

async function main() {
  const interval = hanaPollIntervalMs();

  console.log(
    `[bank:poll] start interval=${interval}ms provider=${process.env.BANK_PROVIDER ?? "auto"}`
  );

  let quietSessionExpired = false;

  async function tick() {
    try {
      const result = await runBankPollCycle();

      if (result.quiet) {
        // Already in SESSION_EXPIRED — keep state, skip spam logs
        quietSessionExpired = true;
        return;
      }

      if (result.recovered) {
        quietSessionExpired = false;
        console.log(
          `[bank:poll] session recovered — CONNECTED fetched=${result.fetched} matched=${result.matched}`
        );
        return;
      }

      if (
        !result.ok &&
        (result.errorSafe === "HANA_SESSION_EXPIRED" ||
          result.errorSafe === "AUTH_REQUIRED")
      ) {
        if (!quietSessionExpired) {
          console.log(
            `[bank:poll] SESSION_EXPIRED — re-login required (npm run bank:hana:login). Further cycles stay quiet until recovered.`
          );
          quietSessionExpired = true;
        }
        return;
      }

      quietSessionExpired = false;
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
