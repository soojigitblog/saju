/**
 * Single Hana bank poll cycle (no loop).
 */
import { runBankPollCycle } from "../src/lib/services/bank-poller";

async function main() {
  const result = await runBankPollCycle();
  if (result.recovered) {
    console.log(
      `[bank:hana:poll] session recovered — CONNECTED fetched=${result.fetched} matched=${result.matched}`
    );
  } else if (
    result.errorSafe === "HANA_SESSION_EXPIRED" ||
    result.errorSafe === "AUTH_REQUIRED"
  ) {
    console.log(
      `[bank:hana:poll] SESSION_EXPIRED — npm run bank:hana:login 후 재시도 (orders stay PENDING)`
    );
  } else {
    console.log(
      `[bank:hana:poll] ok=${result.ok} fetched=${result.fetched} matched=${result.matched} ambiguous=${result.ambiguous} expired=${result.expired}${
        result.errorSafe ? ` err=${result.errorSafe}` : ""
      }`
    );
  }
  process.exit(result.ok ? 0 : 1);
}

void main().catch((e) => {
  console.error("[bank:hana:poll] failed", e instanceof Error ? e.message : e);
  process.exit(1);
});
