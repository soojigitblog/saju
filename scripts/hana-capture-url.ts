/**
 * Capture tx inquiry URL from open Playwright session (no forced navigation home).
 */
import { chromium, type Page } from "playwright";
import { detectHanaAuthState } from "../src/lib/bank/hana/playwright/auth-detect";
import { HANA_BANKING_ORIGIN, hanaProfileDir } from "../src/lib/bank/hana/playwright/config";
import { writeSavedTxInquiryUrl } from "../src/lib/bank/hana/playwright/session-paths";

async function pageHasTxKeywords(page: Page): Promise<boolean> {
  for (const frame of page.frames()) {
    const text = await frame.locator("body").innerText().catch(() => "");
    if (
      /거래내역|입출금|최근\s*거래|거래\s*일자|거래일시|조회기간|입금|출금/.test(
        text
      )
    ) {
      return true;
    }
  }
  return false;
}

async function isTxPage(page: Page): Promise<boolean> {
  const auth = await detectHanaAuthState(page);
  if (auth === "SESSION_EXPIRED") return false;
  const url = page.url().replace(/\/$/, "");
  const origin = HANA_BANKING_ORIGIN.replace(/\/$/, "");
  if (!url.includes("kebhana.com")) return false;
  if (url !== origin && /거래|inquiry|trns|acct|C0/i.test(url)) return true;
  return pageHasTxKeywords(page);
}

async function findTxPage(context: Awaited<ReturnType<typeof chromium.launchPersistentContext>>): Promise<Page | null> {
  for (const page of context.pages()) {
    if (await isTxPage(page)) return page;
  }
  return null;
}

async function main() {
  console.log("[hana-capture-url] Opening profile — stay on 거래내역 if already there…");

  const context = await chromium.launchPersistentContext(hanaProfileDir(), {
    headless: false,
    locale: "ko-KR",
    viewport: { width: 1280, height: 900 },
  });

  try {
    let page = await findTxPage(context);
    if (!page) {
      page = context.pages()[0] ?? (await context.newPage());
      if (!page.url().includes("kebhana.com")) {
        await page.goto(HANA_BANKING_ORIGIN, {
          waitUntil: "domcontentloaded",
          timeout: 60_000,
        });
      }
    }

    const deadline = Date.now() + 120_000;
    while (Date.now() < deadline) {
      page = (await findTxPage(context)) ?? page;
      if (await isTxPage(page)) {
        const url = page.url();
        const origin = HANA_BANKING_ORIGIN.replace(/\/$/, "");
        if (url.replace(/\/$/, "") === origin && !(await pageHasTxKeywords(page))) {
          await page.waitForTimeout(2000);
          continue;
        }
        writeSavedTxInquiryUrl(url);
        console.log(`[hana-capture-url] Saved (${url.length} chars)`);
        return;
      }
      await page.waitForTimeout(2000);
    }

    console.error("[hana-capture-url] Timeout — 거래내역 화면을 찾지 못했습니다.");
    process.exit(1);
  } finally {
    await context.close();
  }
}

void main().catch((e) => {
  console.error("[hana-capture-url] failed", e instanceof Error ? e.message : e);
  process.exit(1);
});
