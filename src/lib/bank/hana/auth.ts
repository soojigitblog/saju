/**
 * Hana ID/password auto-login via normal browser UI (PHASE 6.4.1).
 *
 * - Fills #userId / #pw and clicks a.id-login (observed on live login.do)
 * - Never bypasses CAPTCHA / OTP / MFA / security media / cert modules
 * - Credentials from Windows Credential Manager only
 */
import type { BrowserContext, Page } from "playwright";
import {
  configuredTransferAccountNumber,
  HANA_BANKING_ORIGIN,
  hanaProfileDir,
  normalizeAccountDigits,
} from "@/lib/bank/hana/playwright/config";
import {
  detectHanaAuthState,
  pageLooksLikeTxInquiry,
} from "@/lib/bank/hana/playwright/auth-detect";
import {
  readSavedTxInquiryUrl,
  writeSavedTxInquiryUrl,
} from "@/lib/bank/hana/playwright/session-paths";
import {
  hasHanaCredentials,
  loadHanaCredentials,
} from "@/lib/bank/hana/credentials-store";
import {
  isAutoLoginTemporarilyDisabled,
  isHanaAutoLoginFeatureEnabled,
  readAutoLoginState,
  recordAutoLoginFailure,
  recordAutoLoginSuccess,
} from "@/lib/bank/hana/auto-login-state";

export type HanaAutoLoginResultCode =
  | "CONNECTED"
  | "LOGIN_FAILED"
  | "AUTH_REQUIRED"
  | "CAPTCHA_REQUIRED"
  | "AUTO_LOGIN_UNSUPPORTED"
  | "LOGIN_REQUIRED"
  | "AUTO_LOGIN_DISABLED_TEMPORARILY"
  | "SKIPPED_ALREADY_LOGGED_IN";

export type HanaAutoLoginResult = {
  code: HanaAutoLoginResultCode;
  message: string;
};

const LOGIN_URL = `${HANA_BANKING_ORIGIN}/common/login.do`;

async function openPersistentContext(headless: boolean): Promise<BrowserContext> {
  const { chromium } = await import("playwright");
  return chromium.launchPersistentContext(hanaProfileDir(), {
    headless,
    locale: "ko-KR",
    viewport: { width: 1280, height: 900 },
  });
}

async function activateIdLoginTab(page: Page): Promise<boolean> {
  const tab = page.locator("a", { hasText: "아이디 로그인" }).first();
  if ((await tab.count()) === 0) return false;
  await tab.click({ timeout: 10_000 }).catch(() => undefined);
  await page.waitForTimeout(800);
  const userId = page.locator("#userId");
  try {
    await userId.waitFor({ state: "visible", timeout: 8_000 });
    return true;
  } catch {
    return false;
  }
}

async function fillIdPasswordAndSubmit(
  page: Page,
  username: string,
  password: string
): Promise<"submitted" | "AUTO_LOGIN_UNSUPPORTED"> {
  const userId = page.locator("#userId");
  const pw = page.locator("#pw");
  const loginBtn = page.locator("a.id-login").first();

  if ((await userId.count()) === 0 || (await pw.count()) === 0) {
    return "AUTO_LOGIN_UNSUPPORTED";
  }

  await userId.fill("");
  await userId.fill(username);
  await pw.fill("");
  await pw.fill(password);

  // TouchEn / E2E: if bank blocked plain fill, password field may refuse — detect empty
  const filled = await pw.inputValue().catch(() => "");
  if (!filled) {
    return "AUTO_LOGIN_UNSUPPORTED";
  }

  if ((await loginBtn.count()) > 0) {
    await loginBtn.click({ timeout: 10_000 });
  } else {
    const fallback = page.locator("a.btn1", { hasText: "로그인" }).first();
    if ((await fallback.count()) === 0) return "AUTO_LOGIN_UNSUPPORTED";
    await fallback.click({ timeout: 10_000 });
  }

  await page.waitForTimeout(2500);
  return "submitted";
}

async function navigateToTxInquiry(page: Page): Promise<boolean> {
  const saved = readSavedTxInquiryUrl();
  if (saved) {
    await page.goto(saved, {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });
    await page.waitForTimeout(1200);
    if (await pageLooksLikeTxInquiry(page)) {
      writeSavedTxInquiryUrl(page.url());
      return true;
    }
  }

  // Best-effort menu navigation (normal UI only)
  const candidates = [
    page.getByText("거래내역조회", { exact: false }).first(),
    page.getByRole("link", { name: /거래내역/ }).first(),
  ];
  for (const loc of candidates) {
    if ((await loc.count()) === 0) continue;
    if (!(await loc.isVisible().catch(() => false))) continue;
    await loc.click({ timeout: 8_000 }).catch(() => undefined);
    await page.waitForTimeout(1500);
    if (await pageLooksLikeTxInquiry(page)) {
      writeSavedTxInquiryUrl(page.url());
      return true;
    }
  }

  return pageLooksLikeTxInquiry(page);
}

function accountVisibleOnPage(pageText: string): boolean {
  const configured = configuredTransferAccountNumber();
  if (!configured) return true; // cannot verify — do not fail solely on this
  const digits = normalizeAccountDigits(configured);
  if (digits.length < 4) return true;
  const pageDigits = pageText.replace(/\D/g, "");
  return pageDigits.includes(digits) || pageDigits.includes(digits.slice(-4));
}

async function evaluatePostLogin(page: Page): Promise<HanaAutoLoginResultCode> {
  const state = await detectHanaAuthState(page);
  if (state === "CAPTCHA_REQUIRED") return "CAPTCHA_REQUIRED";
  if (state === "AUTH_REQUIRED") return "AUTH_REQUIRED";
  if (state === "SESSION_EXPIRED") return "LOGIN_FAILED";

  const reachedTx = await navigateToTxInquiry(page);
  const after = await detectHanaAuthState(page);
  if (after === "CAPTCHA_REQUIRED") return "CAPTCHA_REQUIRED";
  if (after === "AUTH_REQUIRED") return "AUTH_REQUIRED";
  if (after === "SESSION_EXPIRED") return "LOGIN_FAILED";

  const body = await page.locator("body").innerText().catch(() => "");
  if (!reachedTx && after !== "LOGGED_IN") return "LOGIN_FAILED";

  // Minimum success: not login, session usable for inquiry
  if (after === "LOGGED_IN" || reachedTx) {
    if (body && !accountVisibleOnPage(body)) {
      // Logged in but wrong/unexpected account UI — still treat as connected if inquiry page
      if (reachedTx) return "CONNECTED";
    }
    return "CONNECTED";
  }

  return "LOGIN_FAILED";
}

/**
 * Ensure Hana session is usable. Attempts ID/password auto-login when expired.
 * Never logs credentials.
 */
export async function ensureHanaAutoLogin(options?: {
  headless?: boolean;
}): Promise<HanaAutoLoginResult> {
  if (!isHanaAutoLoginFeatureEnabled()) {
    return {
      code: "LOGIN_REQUIRED",
      message: "자동 로그인이 비활성화되어 있습니다.",
    };
  }

  const state = readAutoLoginState();
  if (isAutoLoginTemporarilyDisabled(state)) {
    return {
      code: "AUTO_LOGIN_DISABLED_TEMPORARILY",
      message:
        "하나은행 자동 로그인에 실패했습니다. 계정 보호를 위해 재시도를 중단했습니다.",
    };
  }

  if (!hasHanaCredentials()) {
    return {
      code: "LOGIN_REQUIRED",
      message:
        "저장된 하나은행 Credential이 없습니다. npm run bank:hana:credentials 로 등록하세요.",
    };
  }

  const creds = loadHanaCredentials();
  if (!creds) {
    return {
      code: "LOGIN_REQUIRED",
      message: "Credential을 읽을 수 없습니다.",
    };
  }

  const headless = options?.headless ?? process.env.HANA_BANK_HEADLESS !== "0";
  let context: BrowserContext | null = null;

  try {
    context = await openPersistentContext(headless);
    const page = context.pages()[0] ?? (await context.newPage());

    await page.goto(HANA_BANKING_ORIGIN, {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });
    await page.waitForTimeout(1000);

    let auth = await detectHanaAuthState(page);
    if (auth === "CAPTCHA_REQUIRED") {
      recordAutoLoginFailure("CAPTCHA_REQUIRED");
      return {
        code: "CAPTCHA_REQUIRED",
        message: "CAPTCHA가 표시되었습니다. 자동 해결하지 않습니다.",
      };
    }
    if (auth === "AUTH_REQUIRED") {
      recordAutoLoginFailure("AUTH_REQUIRED");
      return {
        code: "AUTH_REQUIRED",
        message: "추가 본인인증이 필요합니다. 자동 우회하지 않습니다.",
      };
    }

    if (auth === "LOGGED_IN") {
      const ok = await navigateToTxInquiry(page);
      if (ok || (await detectHanaAuthState(page)) === "LOGGED_IN") {
        recordAutoLoginSuccess();
        return {
          code: "SKIPPED_ALREADY_LOGGED_IN",
          message: "기존 세션이 유효합니다.",
        };
      }
    }

    // Need login
    await page.goto(LOGIN_URL, {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });
    await page.waitForTimeout(1000);

    auth = await detectHanaAuthState(page);
    if (auth === "CAPTCHA_REQUIRED") {
      recordAutoLoginFailure("CAPTCHA_REQUIRED");
      return {
        code: "CAPTCHA_REQUIRED",
        message: "로그인 화면에 CAPTCHA가 있습니다.",
      };
    }

    const idTabOk = await activateIdLoginTab(page);
    if (!idTabOk) {
      recordAutoLoginFailure("AUTO_LOGIN_UNSUPPORTED");
      return {
        code: "AUTO_LOGIN_UNSUPPORTED",
        message:
          "아이디 로그인 폼을 사용할 수 없습니다. 인증서 전용 환경이거나 UI가 변경되었습니다.",
      };
    }

    const submit = await fillIdPasswordAndSubmit(
      page,
      creds.username,
      creds.password
    );
    // Drop local refs immediately
    (creds as { password?: string }).password = undefined;

    if (submit === "AUTO_LOGIN_UNSUPPORTED") {
      recordAutoLoginFailure("AUTO_LOGIN_UNSUPPORTED");
      return {
        code: "AUTO_LOGIN_UNSUPPORTED",
        message:
          "보안입력(E2E/TouchEn) 등으로 정상 unattended ID 로그인이 불가능합니다.",
      };
    }

    const code = await evaluatePostLogin(page);
    if (code === "CONNECTED") {
      recordAutoLoginSuccess();
      return { code: "CONNECTED", message: "자동 로그인 성공" };
    }

    recordAutoLoginFailure(code);
    const messages: Record<string, string> = {
      LOGIN_FAILED: "아이디/비밀번호 로그인에 실패했습니다.",
      AUTH_REQUIRED: "추가 본인인증이 필요합니다. 자동 우회하지 않습니다.",
      CAPTCHA_REQUIRED: "CAPTCHA가 필요합니다. 자동 해결하지 않습니다.",
      AUTO_LOGIN_UNSUPPORTED: "자동 로그인을 지원하지 않는 로그인 방식입니다.",
    };
    return {
      code,
      message: messages[code] ?? "자동 로그인 실패",
    };
  } catch (error) {
    recordAutoLoginFailure("LOGIN_FAILED");
    return {
      code: "LOGIN_FAILED",
      message:
        error instanceof Error
          ? "자동 로그인 중 오류가 발생했습니다."
          : "자동 로그인 중 오류가 발생했습니다.",
    };
  } finally {
    if (context) {
      await context.close().catch(() => undefined);
    }
  }
}
