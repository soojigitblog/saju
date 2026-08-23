import fs from "node:fs";
import type { GetIncomingTransactionsInput } from "@/lib/bank/provider";
import { BankProviderError } from "@/lib/bank/provider";
import type { HanaRawIncomingRow } from "@/lib/bank/hana/types";
import {
  configuredTransferAccountNumber,
  HANA_BANKING_ORIGIN,
  hanaProfileDir,
  maskAccountNumber,
} from "@/lib/bank/hana/playwright/config";
import { detectHanaAuthState } from "@/lib/bank/hana/playwright/auth-detect";
import { parseDomTransactionRows } from "@/lib/bank/hana/playwright/parse-dom";
import { parseTransactionsFromNetworkBodies } from "@/lib/bank/hana/playwright/parse-network";
import {
  readSavedTxInquiryUrl,
  sessionProfileExists,
} from "@/lib/bank/hana/playwright/session-paths";

function loadFixtureRows(): HanaRawIncomingRow[] | null {
  const fixturePath = process.env.HANA_BANK_FIXTURE_JSON?.trim();
  if (!fixturePath) return null;
  try {
    const raw = fs.readFileSync(fixturePath, "utf8");
    const parsed = JSON.parse(raw) as HanaRawIncomingRow[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function filterByWindow(
  rows: HanaRawIncomingRow[],
  input: GetIncomingTransactionsInput
): HanaRawIncomingRow[] {
  const fromMs = input.from.getTime();
  const toMs = input.to.getTime();
  return rows.filter((row) => {
    const t = new Date(row.occurredAt).getTime();
    return t >= fromMs && t <= toMs;
  });
}

function throwForAuthState(
  auth: Awaited<ReturnType<typeof detectHanaAuthState>>
): void {
  if (auth === "LOGGED_IN") return;
  if (auth === "AUTH_REQUIRED") {
    throw new BankProviderError(
      "AUTH_REQUIRED",
      "추가 본인인증(OTP/보안매체)이 필요합니다. 자동 우회하지 않습니다."
    );
  }
  // SESSION_EXPIRED or UNKNOWN after navigation — never treat as empty txs
  throw new BankProviderError(
    "HANA_SESSION_EXPIRED",
    "하나은행 인증 세션이 만료되었습니다. npm run bank:hana:login 으로 다시 인증해 주세요."
  );
}

/**
 * Fetch recent IN transactions via authenticated Playwright persistent session.
 * No credential storage — session profile must exist from `npm run bank:hana:login`.
 *
 * Empty array means "logged in, no matching IN rows in window".
 * Session expiry / login redirect always throws HANA_SESSION_EXPIRED (never []).
 */
export async function fetchHanaIncomingRows(
  input: GetIncomingTransactionsInput
): Promise<HanaRawIncomingRow[]> {
  const fixture = loadFixtureRows();
  if (fixture) {
    return filterByWindow(fixture, input);
  }

  if (!sessionProfileExists()) {
    throw new BankProviderError(
      "HANA_SESSION_EXPIRED",
      "하나은행 인증 세션이 없습니다. npm run bank:hana:login 으로 다시 인증해 주세요."
    );
  }

  const txUrl = readSavedTxInquiryUrl();
  if (!txUrl) {
    throw new BankProviderError(
      "BANK_NOT_CONFIGURED",
      "거래내역 조회 URL이 저장되지 않았습니다. bank:hana:login 실행 후 거래내역 화면까지 이동해 주세요."
    );
  }

  const accountNumber = configuredTransferAccountNumber();
  if (!accountNumber) {
    throw new BankProviderError(
      "BANK_NOT_CONFIGURED",
      "BANK_TRANSFER_ACCOUNT_NUMBER가 설정되지 않았습니다."
    );
  }

  let chromium: typeof import("playwright").chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    throw new BankProviderError(
      "BANK_UNSUPPORTED",
      "Playwright가 설치되지 않았습니다. npm install 후 npx playwright install chromium 을 실행해 주세요."
    );
  }

  const networkBodies: unknown[] = [];
  const context = await chromium.launchPersistentContext(hanaProfileDir(), {
    headless: process.env.HANA_BANK_HEADLESS !== "0",
    locale: "ko-KR",
    viewport: { width: 1280, height: 900 },
  });

  try {
    const page = context.pages()[0] ?? (await context.newPage());

    page.on("response", (response) => {
      const ct = response.headers()["content-type"] ?? "";
      if (!ct.includes("json")) return;
      void response
        .json()
        .then((json) => networkBodies.push(json))
        .catch(() => undefined);
    });

    await page.goto(HANA_BANKING_ORIGIN, {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });

    throwForAuthState(await detectHanaAuthState(page));

    await page.goto(txUrl, {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });
    await page.waitForTimeout(1500);

    // Redirect to login after deep-link is the common expiry path
    throwForAuthState(await detectHanaAuthState(page));

    const optionalSearchSelector =
      process.env.HANA_BANK_INQUIRY_SUBMIT_SELECTOR?.trim();
    if (optionalSearchSelector) {
      const btn = page.locator(optionalSearchSelector).first();
      if (await btn.isVisible().catch(() => false)) {
        await btn.click().catch(() => undefined);
        await page.waitForTimeout(2000);
        throwForAuthState(await detectHanaAuthState(page));
      }
    }

    const pageText = await page.locator("body").innerText().catch(() => "");
    const masked = maskAccountNumber(accountNumber);
    if (
      pageText &&
      !pageText.replace(/\D/g, "").includes(accountNumber.replace(/\D/g, ""))
    ) {
      console.warn(
        `[hana] configured account suffix ${masked} not found on inquiry page`
      );
    }

    let rows = parseTransactionsFromNetworkBodies(networkBodies);
    if (rows.length === 0) {
      try {
        rows = await parseDomTransactionRows(page);
      } catch (e) {
        console.warn(
          "[hana] DOM parse failed",
          e instanceof Error ? e.message : e
        );
      }
    }

    // Final gate: never return [] from a login / unknown page
    throwForAuthState(await detectHanaAuthState(page));

    return filterByWindow(rows, input);
  } finally {
    await context.close();
  }
}
