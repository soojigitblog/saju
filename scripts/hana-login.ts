/**
 * Hana bank — one-time interactive login + save transaction inquiry URL.
 *
 * Usage:
 *   npm run bank:hana:login
 *
 * 1. Browser opens https://banking.kebhana.com/
 * 2. You log in normally (OTP/MFA if required — no bypass)
 * 3. Navigate to: 조회 → 계좌조회 → 거래내역조회 (운의결 입금 계좌)
 * 4. 거래내역 화면 감지 시 자동 저장 (Enter 키로 즉시 저장 가능)
 */
import readline from "node:readline";
import { chromium, type Page } from "playwright";
import { detectHanaAuthState } from "../src/lib/bank/hana/playwright/auth-detect";
import {
  HANA_BANKING_ORIGIN,
  hanaProfileDir,
} from "../src/lib/bank/hana/playwright/config";
import {
  writeSavedTxInquiryUrl,
} from "../src/lib/bank/hana/playwright/session-paths";

async function pageHasTxKeywords(page: Page): Promise<boolean> {
  for (const frame of page.frames()) {
    const text = await frame.locator("body").innerText().catch(() => "");
    if (/거래내역|입출금|최근\s*거래|거래\s*일자|거래일시|조회기간/.test(text)) return true;
  }
  return false;
}

async function isOnTxInquiryPage(page: Page): Promise<boolean> {
  const auth = await detectHanaAuthState(page);
  if (auth === "SESSION_EXPIRED") return false;
  const url = page.url().replace(/\/$/, "");
  const origin = HANA_BANKING_ORIGIN.replace(/\/$/, "");
  if (!url.includes("kebhana.com")) return false;
  if (url !== origin && /거래|inquiry|trns|acct|C0/i.test(url)) return true;
  return pageHasTxKeywords(page);
}

function waitForEnterOrAutoSave(page: Page): Promise<"enter" | "auto"> {
  let resolved = false;
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(
      "\nPress Enter after you are on the 거래내역 page (or wait for auto-detect)… ",
      () => {
        if (!resolved) {
          resolved = true;
          clearInterval(timer);
          rl.close();
          resolve("enter");
        }
      }
    );

    const timer = setInterval(async () => {
      if (resolved) return;
      try {
        if (await isOnTxInquiryPage(page)) {
          resolved = true;
          clearInterval(timer);
          rl.close();
          resolve("auto");
        }
      } catch {
        /* page navigating */
      }
    }, 2000);
  });
}

async function main() {
  console.log("[bank:hana:login] Launching persistent browser profile");
  console.log(`  profile: ${hanaProfileDir()}`);
  console.log(`  origin:  ${HANA_BANKING_ORIGIN}`);
  console.log("");
  console.log("1) Log in to Hana personal banking in the browser window");
  console.log("2) Open transaction history for your 운의결 deposit account");
  console.log("3) 거래내역 화면까지 이동 — 자동 저장되거나 Enter 로 저장");

  const context = await chromium.launchPersistentContext(hanaProfileDir(), {
    headless: false,
    locale: "ko-KR",
    viewport: { width: 1280, height: 900 },
  });

  const page = context.pages()[0] ?? (await context.newPage());
  if (!page.url().includes("kebhana.com")) {
    await page.goto(HANA_BANKING_ORIGIN, { waitUntil: "domcontentloaded" });
  }

  const mode = await waitForEnterOrAutoSave(page);

  const url = page.url();
  writeSavedTxInquiryUrl(url);
  console.log(
    `[bank:hana:login] Saved tx inquiry URL (${url.length} chars, ${mode})`
  );
  console.log("[bank:hana:login] Session stored. You can close the browser.");

  await context.close();
}

void main().catch((e) => {
  console.error("[bank:hana:login] failed", e instanceof Error ? e.message : e);
  process.exit(1);
});
