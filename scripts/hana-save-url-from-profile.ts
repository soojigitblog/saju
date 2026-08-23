/**
 * Recover tx inquiry URL from persistent profile (auto-detect 거래내역 page).
 */
import { chromium } from "playwright";
import { HANA_BANKING_ORIGIN, hanaProfileDir } from "../src/lib/bank/hana/playwright/config";
import { detectHanaAuthState } from "../src/lib/bank/hana/playwright/auth-detect";
import { writeSavedTxInquiryUrl } from "../src/lib/bank/hana/playwright/session-paths";

async function main() {
  console.log("[hana-save-url] Opening browser with saved login session…");
  console.log("  If not on 거래내역 yet: 조회 → 계좌조회 → 거래내역조회 로 이동해 주세요.");
  console.log("  거래내역 화면이 감지되면 URL을 자동 저장합니다 (최대 3분).");

  const context = await chromium.launchPersistentContext(hanaProfileDir(), {
    headless: false,
    locale: "ko-KR",
    viewport: { width: 1280, height: 900 },
  });

  try {
    const page = context.pages()[0] ?? (await context.newPage());
    if (!page.url().includes("kebhana.com")) {
      await page.goto(HANA_BANKING_ORIGIN, { waitUntil: "domcontentloaded", timeout: 60000 });
    }

    const deadline = Date.now() + 180_000;
    while (Date.now() < deadline) {
      const auth = await detectHanaAuthState(page);
      const url = page.url();
      const body = await page.locator("body").innerText().catch(() => "");
      const onTxPage =
        auth === "LOGGED_IN" &&
        (/거래내역|입출금/.test(body) || /거래|inquiry|trns|acct/i.test(url));

      if (onTxPage && url.startsWith("http") && url.includes("kebhana.com")) {
        writeSavedTxInquiryUrl(url);
        console.log(`[hana-save-url] Saved (${url.length} chars)`);
        return;
      }

      if (auth === "SESSION_EXPIRED") {
        console.error("[hana-save-url] Session expired — run npm run bank:hana:login again.");
        process.exit(1);
      }

      await page.waitForTimeout(2000);
    }

    console.error("[hana-save-url] Timeout — 거래내역 화면을 찾지 못했습니다.");
    process.exit(1);
  } finally {
    await context.close();
  }
}

void main().catch((e) => {
  console.error("[hana-save-url] failed", e instanceof Error ? e.message : e);
  process.exit(1);
});
