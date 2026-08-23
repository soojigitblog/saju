import type { Page } from "playwright";

export type HanaAuthState =
  | "LOGGED_IN"
  | "SESSION_EXPIRED"
  | "AUTH_REQUIRED"
  | "UNKNOWN";

const AUTH_CHALLENGE_PATTERNS = [
  /OTP/i,
  /보안카드/i,
  /인증번호/i,
  /추가\s*인증/i,
  /본인\s*인증/i,
  /CAPTCHA/i,
  /보안매체/i,
  /공인인증/i,
];

const LOGIN_URL_HINTS = [
  /\/login/i,
  /Login/i,
  /signin/i,
  /C055/i,
  /common\/login/i,
  /loginOk/i,
];

/**
 * Pure detector — used by Playwright wrapper and unit tests.
 * Never bypass challenges.
 */
export function detectHanaAuthStateFromContent(input: {
  url: string;
  bodyText: string;
  title?: string;
}): HanaAuthState {
  const url = input.url;
  const title = input.title ?? "";
  const bodyText = input.bodyText;
  const combined = `${url}\n${title}\n${bodyText}`.slice(0, 8000);

  const onLoginUrl = LOGIN_URL_HINTS.some((re) => re.test(url));
  const titleSaysLogin = /로그인/.test(title);
  const hasLoginForm =
    (/아이디/.test(combined) && /비밀번호/.test(combined) && /로그인/.test(combined)) ||
    (/하나인증서/.test(combined) && /로그인/.test(combined)) ||
    (/공동\/금융인증서|공동인증서|금융인증/.test(combined) && /로그인/.test(combined));

  if (onLoginUrl || titleSaysLogin || hasLoginForm) {
    return "SESSION_EXPIRED";
  }

  const challengeHits = AUTH_CHALLENGE_PATTERNS.filter((re) =>
    re.test(combined)
  ).length;

  if (
    challengeHits >= 2 ||
    (/인증번호/.test(combined) && /입력/.test(combined)) ||
    /보안카드/.test(combined)
  ) {
    return "AUTH_REQUIRED";
  }

  // Logged-in banking surfaces (not login chrome)
  if (/거래내역|입출금|계좌조회|잔액|조회기간|거래일시/.test(combined)) {
    return "LOGGED_IN";
  }

  // Avoid treating long login/marketing pages as logged-in (body length alone is unsafe)
  return "UNKNOWN";
}

/**
 * Detect auth state from URL + visible text. Never bypass challenges.
 */
export async function detectHanaAuthState(page: Page): Promise<HanaAuthState> {
  const url = page.url();
  const title = await page.title().catch(() => "");
  const bodyText = await page
    .locator("body")
    .innerText()
    .catch(() => "");

  return detectHanaAuthStateFromContent({ url, bodyText, title });
}
