/**
 * Unified Hana worker: credential check → auto-login if needed → poll loop.
 * Usage: npm run bank:hana:start
 *
 * Never prints credentials / cookies / tokens.
 */
import { hanaCredentialStoreStatus } from "../src/lib/bank/hana/credentials-store";
import { ensureHanaAutoLogin } from "../src/lib/bank/hana/auth";
import {
  autoLoginEnabledLabel,
  isHanaAutoLoginFeatureEnabled,
} from "../src/lib/bank/hana/auto-login-state";
import { isHanaAutomationEnabled } from "../src/lib/bank/hana/playwright/config";
import { hanaPollIntervalMs } from "../src/lib/bank/hana/playwright/config";
import { runBankPollCycle } from "../src/lib/services/bank-poller";

async function main() {
  console.log("[bank:hana:start] boot");
  console.log(
    `[bank:hana:start] automation=${isHanaAutomationEnabled() ? "on" : "off"} autoLogin=${isHanaAutoLoginFeatureEnabled() ? "on" : "off"} creds=${hanaCredentialStoreStatus()} autoLoginState=${autoLoginEnabledLabel()}`
  );

  if (!isHanaAutomationEnabled()) {
    console.error(
      "[bank:hana:start] Set BANK_PROVIDER=hana and HANA_BANK_AUTOMATION_ENABLED=1"
    );
    process.exit(1);
  }

  if (hanaCredentialStoreStatus() === "ABSENT") {
    console.error(
      "[bank:hana:start] No credentials. Run: npm run bank:hana:credentials"
    );
    process.exit(1);
  }

  const login = await ensureHanaAutoLogin({
    headless: process.env.HANA_BANK_HEADLESS !== "0",
  });
  console.log(`[bank:hana:start] login=${login.code}`);

  if (
    login.code !== "CONNECTED" &&
    login.code !== "SKIPPED_ALREADY_LOGGED_IN"
  ) {
    console.error(`[bank:hana:start] ${login.message}`);
    // Still start poll loop — AUTH_REQUIRED etc. stay PENDING; admin can act
  }

  const interval = hanaPollIntervalMs();
  console.log(`[bank:hana:start] poll interval=${interval}ms`);

  let quiet = false;

  async function tick() {
    try {
      const result = await runBankPollCycle();
      if (result.quiet) {
        quiet = true;
        return;
      }
      if (result.recovered) {
        quiet = false;
        console.log(
          `[bank:hana:start] recovered fetched=${result.fetched} matched=${result.matched}`
        );
        return;
      }
      if (!result.ok && result.errorSafe) {
        if (!quiet) {
          console.log(`[bank:hana:start] poll err=${result.errorSafe}`);
          quiet = true;
        }
        return;
      }
      quiet = false;
      console.log(
        `[bank:hana:start] ok fetched=${result.fetched} matched=${result.matched} ambiguous=${result.ambiguous}`
      );
    } catch (e) {
      console.error(
        "[bank:hana:start] cycle error",
        e instanceof Error ? e.message : "unknown"
      );
    }
  }

  await tick();
  setInterval(() => void tick(), interval);
}

void main().catch((e) => {
  console.error(
    "[bank:hana:start] failed",
    e instanceof Error ? e.message : "error"
  );
  process.exit(1);
});
