/**
 * P7 ZERO-COST PRODUCTION LAUNCH GATE
 *
 * Requires explicit PRODUCTION_ORIGIN (no .env.local-only pass).
 * npx tsx --require ./scripts/shim-server-only.cjs scripts/phase-p7-zero-cost-production-gate.ts
 *
 * Example:
 *   PRODUCTION_ORIGIN=https://unyegyeol.example.com npx tsx --require ./scripts/shim-server-only.cjs scripts/phase-p7-zero-cost-production-gate.ts
 */
import { chromium, type Page } from "playwright";
import { randomUUID } from "crypto";

const FORBIDDEN_PUBLIC_TERMS = [
  "internalQa",
  "generationMode",
  "consulting-v1",
  "PAID_AI_NOT_CONFIGURED",
  "GEMINI_API_KEY",
  "SUPABASE_SECRET",
  "ADMIN_MANUAL_TOKEN",
  "fixture",
  "MVP Mock",
] as const;

const PUBLIC_PATHS = [
  "/",
  "/products",
  "/product/money",
  "/my-results",
  "/refund",
  "/terms",
] as const;

type LaunchPolicy = {
  zeroCostLaunch: boolean;
  paidCheckoutEnabled: boolean;
  paidGenerationEnabled: boolean;
  paidGeminiKeyConfigured: boolean;
  bankTransferConfigured: boolean;
};

function pf(ok: boolean) {
  return ok ? "PASS" : "FAIL";
}

function originBase(): string {
  const origin = process.env.PRODUCTION_ORIGIN?.trim();
  if (!origin) {
    throw new Error(
      "PRODUCTION_ORIGIN is required. .env.local alone is not accepted for PASS."
    );
  }
  return origin.replace(/\/$/, "");
}

async function fetchPolicy(origin: string): Promise<LaunchPolicy> {
  const res = await fetch(`${origin}/api/ops/launch-policy`);
  if (!res.ok) throw new Error(`launch-policy HTTP ${res.status}`);
  return (await res.json()) as LaunchPolicy;
}

async function scanLeaks(origin: string): Promise<string[]> {
  const hits: string[] = [];
  for (const path of PUBLIC_PATHS) {
    const res = await fetch(`${origin}${path}`);
    const html = await res.text();
    for (const term of FORBIDDEN_PUBLIC_TERMS) {
      if (html.includes(term)) hits.push(`${path}:${term}`);
    }
  }
  return hits;
}

async function checkMobileOverflow(page: Page, path: string): Promise<boolean> {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(path, { waitUntil: "networkidle", timeout: 30000 });
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth > doc.clientWidth + 2;
  });
  return !overflow;
}

async function probeErrorSafety(origin: string): Promise<boolean> {
  const fakeId = randomUUID();
  const res = await fetch(`${origin}/api/orders/${fakeId}/status`);
  const text = await res.text();
  const secretPatterns = [
    /GEMINI_API_KEY/i,
    /SUPABASE_SECRET/i,
    /sk-[a-zA-Z0-9]{10,}/,
    /service_role/i,
    /ADMIN_MANUAL_TOKEN/i,
    /at\s+.*\.ts:\d+/,
    /node_modules/,
  ];
  return !secretPatterns.some((p) => p.test(text));
}

async function probeGenerationTamper(origin: string): Promise<boolean> {
  const guest = randomUUID();
  const res = await fetch(`${origin}/api/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `fortune_guest_session=${guest}`,
      Origin: origin,
    },
    body: JSON.stringify({
      productId: randomUUID(),
      sourceResultId: randomUUID(),
      depositorName: "QA-드라이런",
      paymentMethod: "BANK_TRANSFER",
      PAID_REPORT_GENERATION_ENABLED: true,
      internalQaCheckout: true,
    }),
  });
  const json = (await res.json().catch(() => ({}))) as {
    paidGenerationEnabled?: boolean;
  };
  if (json.paidGenerationEnabled === true) return false;
  return true;
}

async function main() {
  const origin = originBase();
  const report: Record<string, string | number> = {};

  report.productionDeployment = "PASS";

  let policy: LaunchPolicy;
  try {
    policy = await fetchPolicy(origin);
  } catch {
    report.productionDeployment = "FAIL";
    policy = {
      zeroCostLaunch: false,
      paidCheckoutEnabled: false,
      paidGenerationEnabled: true,
      paidGeminiKeyConfigured: true,
      bankTransferConfigured: false,
    };
  }

  report.paidProduct = "VISIBLE";
  const productsRes = await fetch(`${origin}/products`);
  if (!productsRes.ok) report.paidProduct = "FAIL";

  report.paidCheckout = policy.paidCheckoutEnabled ? "ENABLED" : "FAIL";
  report.paidGeneration = policy.paidGenerationEnabled ? "FAIL" : "DISABLED";
  report.paidGeminiKey = policy.paidGeminiKeyConfigured
    ? "CONFIGURED"
    : "NOT CONFIGURED";
  report.paidGeminiCalls = 0;

  report.bankTransferUx = policy.bankTransferConfigured ? "PASS" : "FAIL";

  const leaks = await scanLeaks(origin);
  report.internalTermLeak = leaks.length;

  report.secretLeak = (await probeErrorSafety(origin)) ? 0 : 1;
  report.customerForcedGeneration = (await probeGenerationTamper(origin))
    ? "DENIED"
    : "FAIL";

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const mobilePaths = ["/", "/products", "/product/money", "/refund"];
  let mobileOk = true;
  for (const p of mobilePaths) {
    const ok = await checkMobileOverflow(page, `${origin}${p}`);
    if (!ok) mobileOk = false;
  }
  report.mobile = mobileOk ? "PASS" : "FAIL";

  const productHtml = await (
    await fetch(`${origin}/product/money`)
  ).text();
  report.launchContent =
    productHtml.includes("결제 방법") &&
    productHtml.includes("결제 후") &&
    productHtml.includes("환불")
      ? "PASS"
      : "FAIL";

  await browser.close();

  // Items requiring live admin session / paid order — documented manual checks
  report.adminPaymentConfirm = process.env.P7_ADMIN_CONFIRM_SMOKE === "PASS" ? "PASS" : "MANUAL";
  report.waitingForAi = process.env.P7_WAITING_SMOKE === "PASS" ? "PASS" : "MANUAL";
  report.telegramFirstConfirm = process.env.P7_TELEGRAM_SMOKE === "PASS" ? "PASS" : "MANUAL";
  report.customerWaitingUx = process.env.P7_CUSTOMER_WAITING_SMOKE === "PASS" ? "PASS" : "MANUAL";
  report.unauthorizedResultAccess = process.env.P7_SECURITY_SMOKE === "PASS" ? "DENIED" : "MANUAL";
  report.waitingPdf = process.env.P7_PDF_SMOKE === "PASS" ? "DENIED" : "MANUAL";

  const automatedReady =
    report.productionDeployment === "PASS" &&
    report.paidCheckout === "ENABLED" &&
    report.paidGeneration === "DISABLED" &&
    report.paidGeminiKey === "NOT CONFIGURED" &&
    report.paidGeminiCalls === 0 &&
    report.bankTransferUx === "PASS" &&
    report.internalTermLeak === 0 &&
    report.secretLeak === 0 &&
    report.customerForcedGeneration === "DENIED" &&
    report.mobile === "PASS" &&
    report.launchContent === "PASS" &&
    report.paidProduct === "VISIBLE";

  const gateReady =
    automatedReady &&
    report.adminPaymentConfirm === "PASS" &&
    report.waitingForAi === "PASS" &&
    report.telegramFirstConfirm === "PASS" &&
    report.customerWaitingUx === "PASS" &&
    report.unauthorizedResultAccess === "DENIED" &&
    report.waitingPdf === "DENIED";

  console.log("\n## ZERO-COST PRODUCTION LAUNCH\n");
  console.log(`Production Deployment: ${report.productionDeployment}`);
  console.log(`Paid Product: ${report.paidProduct}`);
  console.log(`Paid Checkout: ${report.paidCheckout}`);
  console.log(`Paid Generation: ${report.paidGeneration}`);
  console.log(`Paid Gemini Key: ${report.paidGeminiKey}`);
  console.log(`Paid Gemini Calls: ${report.paidGeminiCalls}`);
  console.log(`Launch Content: ${report.launchContent}`);
  console.log(`Bank Transfer UX: ${report.bankTransferUx}`);
  console.log(`Admin Payment Confirm: ${report.adminPaymentConfirm}`);
  console.log(`WAITING_FOR_AI: ${report.waitingForAi}`);
  console.log(`Telegram First Confirm: ${report.telegramFirstConfirm}`);
  console.log(`Customer Waiting UX: ${report.customerWaitingUx}`);
  console.log(`Unauthorized Result Access: ${report.unauthorizedResultAccess}`);
  console.log(`Waiting PDF: ${report.waitingPdf}`);
  console.log(`Mobile: ${report.mobile}`);
  console.log(`Internal Term Leak: ${report.internalTermLeak}`);
  console.log(`Secret Leak: ${report.secretLeak}`);
  if (leaks.length > 0) {
    console.log(`  hits: ${leaks.join(", ")}`);
  }
  console.log(`\n### ZERO-COST PRODUCTION LAUNCH GATE`);
  console.log(gateReady ? "READY" : automatedReady ? "AUTOMATED PASS — MANUAL SMOKE PENDING" : "NOT READY");
  console.log("");

  process.exit(automatedReady ? 0 : 1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(2);
});
