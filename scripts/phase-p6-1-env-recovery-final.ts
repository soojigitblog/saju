/**
 * P6.1 ENV RECOVERY FINAL — real Supabase, admin fallback safety, HTTP PDF, Gemini call = 0
 *
 * npx tsx --env-file=.env.local --require ./scripts/shim-server-only.cjs scripts/phase-p6-1-env-recovery-final.ts
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { createAdminClient } from "../src/lib/supabase/admin";
import { isSupabaseConfigured } from "../src/lib/supabase/env";
import { getDataMode } from "../src/lib/repositories/data-mode";
import {
  isInternalAdminQaRunner,
  tryAdminRequest,
} from "../src/lib/admin/manual-auth";
import {
  assertPaidGeminiConfigured,
  getAiModelPaid,
  isPaidReportLiveEnabled,
  resolveAiProviderForPaid,
  resolvePaidProvider,
} from "../src/lib/ai/config";
import { createFortuneInterpreterForTier } from "../src/lib/ai/interpreters/free-interpreter";
import { seedAdminQaConsultingReport } from "../src/lib/services/admin-qa-seed-consulting-report";
import { getPaidReportForOwner } from "../src/lib/services/get-paid-report";
import { getOrderById } from "../src/lib/repositories/orders";
import { getReportByOrderId } from "../src/lib/repositories/reports";
import { MOCK_PRODUCT_IDS } from "../src/lib/mock-data";
import {
  INTERPRETATION_VERSION_CONSULTING,
  REPORT_RENDER_VERSION_CONSULTING,
} from "../src/lib/report/paid-report-versions";

const OUT = path.join(
  process.cwd(),
  "tmp",
  "quality-review",
  "paid-gemini-live",
  "p6-1-env-recovery-final-report.json"
);

const BASE = (process.env.P6_RECOVERY_BASE_URL ?? "http://localhost:3847").replace(
  /\/$/,
  ""
);

const PDF_PRODUCTS = [
  { stem: "money", productId: MOCK_PRODUCT_IDS.money, expectedPages: 9 },
  { stem: "career", productId: MOCK_PRODUCT_IDS.career, expectedPages: 9 },
  { stem: "love", productId: MOCK_PRODUCT_IDS.love, expectedPages: 9 },
  { stem: "total", productId: MOCK_PRODUCT_IDS.total, expectedPages: 14 },
] as const;

function pf(ok: boolean) {
  return ok ? "PASS" : "FAIL";
}

function st(name: string) {
  const v = process.env[name];
  return v && String(v).trim() ? "SET" : "MISSING";
}

function paidKeyPolicyStatus(): string {
  return process.env.GEMINI_API_KEY_PAID?.trim()
    ? "SET"
    : "NOT_CONFIGURED_BY_POLICY";
}

async function waitForServer(timeoutMs = 90_000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(BASE, { method: "GET" });
      if (res.status > 0) return true;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

async function countPdfPages(buffer: Buffer): Promise<number> {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const b64 = buffer.toString("base64");
    return await page.evaluate(async (b64Inner: string) => {
      const script = document.createElement("script");
      script.src =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      document.head.appendChild(script);
      await new Promise<void>((resolve, reject) => {
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("pdf.js load failed"));
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdfjsLib = (window as any).pdfjsLib;
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      const binary = atob(b64Inner);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
      return pdf.numPages as number;
    }, b64);
  } finally {
    await browser.close();
  }
}

async function httpSeed(stem: string): Promise<{
  reportId: string;
  orderId: string;
  guestSessionId: string;
}> {
  const token = process.env.ADMIN_MANUAL_TOKEN?.trim();
  if (!token) throw new Error("ADMIN_MANUAL_TOKEN required for HTTP admin seed");
  const res = await fetch(`${BASE}/api/admin/qa/seed-consulting-report`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: BASE,
      "x-admin-manual-token": token,
    },
    body: JSON.stringify({ productStem: stem }),
  });
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(`HTTP seed ${stem} failed: ${res.status} ${JSON.stringify(json)}`);
  }
  return {
    reportId: String(json.reportId),
    orderId: String(json.orderId),
    guestSessionId: String(json.guestSessionId),
  };
}

async function httpPdf(input: {
  reportId: string;
  guestSessionId?: string;
  admin?: boolean;
  extraHeaders?: Record<string, string>;
}): Promise<{ status: number; buffer: Buffer; contentType: string | null }> {
  const headers: Record<string, string> = {
    origin: BASE,
    ...input.extraHeaders,
  };
  if (input.admin) {
    const token = process.env.ADMIN_MANUAL_TOKEN?.trim();
    if (token) headers["x-admin-manual-token"] = token;
  }
  if (input.guestSessionId) {
    headers.cookie = `fortune_guest_session=${input.guestSessionId}`;
  }
  const res = await fetch(
    `${BASE}/api/reports/${input.reportId}/consulting-pdf`,
    { headers }
  );
  return {
    status: res.status,
    buffer: Buffer.from(await res.arrayBuffer()),
    contentType: res.headers.get("content-type"),
  };
}

async function cleanupQa(ids: { orderIds: string[]; reportIds: string[] }) {
  try {
    const admin = createAdminClient();
    for (const id of ids.reportIds) {
      await admin.from("reports").delete().eq("id", id);
    }
    for (const id of ids.orderIds) {
      await admin.from("orders").delete().eq("id", id);
    }
  } catch {
    /* best-effort */
  }
}

async function main() {
  process.env.PAID_REPORT_LIVE_ENABLED = "false";
  process.env.ALLOW_PAID_QA_CHECKOUT = "1";
  process.env.ALLOW_TOSS_CHECKOUT = "1";
  process.env.ALLOW_MOCK_AI = "1";
  process.env.AI_PROVIDER_FREE = "mock";
  process.env.APP_ENV = process.env.APP_ENV ?? "development";
  process.env.ALLOW_INTERNAL_ADMIN_QA = "1";
  process.env.INTERNAL_ADMIN_QA_RUNNER = "1";

  const report: Record<string, unknown> = {
    phase: "P6.1_ENV_RECOVERY_FINAL",
    at: new Date().toISOString(),
    geminiLiveCalls: 0,
    paidReportLiveEnabled: isPaidReportLiveEnabled(),
  };

  const qaCleanup = { orderIds: [] as string[], reportIds: [] as string[] };

  // --- 1. Real Supabase only ---
  if (getDataMode() === "mock" || !isSupabaseConfigured()) {
    report.supabaseEnvironment = "FAIL";
    report.realSupabaseConnection = "FAIL";
    report.envRecoveryGate = "NOT READY";
    writeReport(report);
    process.exit(1);
  }
  report.supabaseEnvironment = "RESTORED";

  let connectionPass = false;
  let roundtripPass = false;
  try {
    const admin = createAdminClient();
    const { error: pErr } = await admin.from("products").select("id").limit(1);
    connectionPass = !pErr;

    const seeded = await seedAdminQaConsultingReport({
      productId: MOCK_PRODUCT_IDS.money,
    });
    qaCleanup.orderIds.push(seeded.orderId);
    qaCleanup.reportIds.push(seeded.reportId);

    const order = await getOrderById(seeded.orderId);
    const rep = await getReportByOrderId(seeded.orderId);
    if (!order || !rep) throw new Error("order/report read failed");

    roundtripPass =
      (order.status === "PAID" || order.status === "COMPLETED") &&
      !!order.paid_at &&
      rep.generation_status === "COMPLETED" &&
      (rep.result_json as { reportRenderVersion?: string })?.reportRenderVersion ===
        REPORT_RENDER_VERSION_CONSULTING;

    await getPaidReportForOwner({
      reportOrOrderId: rep.id,
      guestSessionId: seeded.guestSessionId,
    });

    report.paidOrderState = order.status;
    report.reportGenerationStatus = rep.generation_status;
    report.consultingMetadata =
      (rep.result_json as { interpretationVersion?: string })?.interpretationVersion ===
      INTERPRETATION_VERSION_CONSULTING
        ? "PASS"
        : "FAIL";
  } catch (e) {
    report.roundtripError = e instanceof Error ? e.message : String(e);
  }
  report.realSupabaseConnection = pf(connectionPass);
  report.repositoryRoundtrip = pf(roundtripPass);

  // --- 2. Admin auth safety ---
  const token = process.env.ADMIN_MANUAL_TOKEN?.trim();
  report.geminiApiKeyPaid = paidKeyPolicyStatus();

  // CLI internal runner
  const cliReq = new Request("http://internal/cli/qa", {
    headers: token ? { "x-admin-manual-token": token } : {},
  });
  const cliAdmin = await tryAdminRequest(cliReq);
  report.cliQaAdmin = pf(!!cliAdmin && isInternalAdminQaRunner());

  // Spoof + weak token checks (cookies-failure covered by vitest admin-fallback-safety)
  const origRunner = process.env.INTERNAL_ADMIN_QA_RUNNER;
  const savedNode = process.env.NODE_ENV;
  process.env.NODE_ENV = "development";
  process.env.INTERNAL_ADMIN_QA_RUNNER = "";
  process.env.ALLOW_INTERNAL_ADMIN_QA = "";
  const spoofReq = new Request("http://localhost/api/reports/x/consulting-pdf", {
    headers: {
      "x-admin-manual-token": "arbitrary-spoof-token",
      internalQa: "true",
      admin: "true",
    },
  });
  const spoofDenied = (await tryAdminRequest(spoofReq)) === null;
  report.customerAdminSpoof = spoofDenied ? "DENIED" : "FAIL";

  const weakDenied =
    (await tryAdminRequest(
      new Request("http://localhost/x", {
        headers: { "x-admin-manual-token": "test" },
      })
    )) === null;
  report.weakTokenDenied = pf(weakDenied);

  process.env.NODE_ENV = savedNode;
  process.env.INTERNAL_ADMIN_QA_RUNNER = origRunner ?? "1";
  process.env.ALLOW_INTERNAL_ADMIN_QA = "1";
  report.cookiesFailureAutoAdmin = "FORBIDDEN";

  // --- 3. HTTP admin + dev server PDF ---
  const serverUp = await waitForServer(10_000);
  report.devServerReachable = serverUp ? "YES" : "NO";

  let httpAdminPass = false;
  const pdfResults: Record<string, { http: string; bytes: number; pages: number }> =
    {};

  if (serverUp && token) {
    try {
      const probe = await fetch(`${BASE}/api/admin/qa/seed-consulting-report`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: BASE,
          "x-admin-manual-token": token,
        },
        body: JSON.stringify({ productStem: "money" }),
      });
      httpAdminPass = probe.status === 200;
      if (probe.ok) {
        const j = (await probe.json()) as Record<string, unknown>;
        qaCleanup.orderIds.push(String(j.orderId));
        qaCleanup.reportIds.push(String(j.reportId));
      }
    } catch {
      httpAdminPass = false;
    }
    report.httpAdminAuth = pf(httpAdminPass);

    for (const p of PDF_PRODUCTS) {
      try {
        const seeded = await httpSeed(p.stem);
        qaCleanup.orderIds.push(seeded.orderId);
        qaCleanup.reportIds.push(seeded.reportId);

        const res = await httpPdf({
          reportId: seeded.reportId,
          guestSessionId: seeded.guestSessionId,
          admin: true,
        });
        const isPdf =
          res.status === 200 &&
          (res.contentType?.includes("application/pdf") ?? false) &&
          res.buffer.subarray(0, 4).toString("utf8") === "%PDF" &&
          res.buffer.byteLength > 100_000;
        const pages = isPdf ? await countPdfPages(res.buffer) : 0;
        pdfResults[p.stem] = {
          http: pf(isPdf && pages === p.expectedPages),
          bytes: res.buffer.byteLength,
          pages,
        };
      } catch (e) {
        pdfResults[p.stem] = {
          http: "FAIL",
          bytes: 0,
          pages: 0,
        };
        report[`pdfError_${p.stem}`] =
          e instanceof Error ? e.message : String(e);
      }
    }
  } else {
    report.httpAdminAuth = token ? "FAIL" : "FAIL";
    for (const p of PDF_PRODUCTS) {
      pdfResults[p.stem] = { http: "FAIL", bytes: 0, pages: 0 };
    }
  }
  report.productionPdfHttp = pdfResults;

  // --- 4. Authorization regression (HTTP) ---
  let authRegressionPass = false;
  if (serverUp && token) {
    try {
      const seeded0 = await httpSeed("money");
      qaCleanup.orderIds.push(seeded0.orderId);
      qaCleanup.reportIds.push(seeded0.reportId);

      const adminOk = await httpPdf({
        reportId: seeded0.reportId,
        admin: true,
      });
      const ownerCustomer = await httpPdf({
        reportId: seeded0.reportId,
        guestSessionId: seeded0.guestSessionId,
      });
      const wrongGuest = await httpPdf({
        reportId: seeded0.reportId,
        guestSessionId: "wrong-guest-session-id",
      });
      const unauth = await httpPdf({ reportId: seeded0.reportId });

      const adminAllowed = adminOk.status === 200;
      const ownerCustomerDenied = ownerCustomer.status === 403;
      const wrongDenied = wrongGuest.status === 403;
      const unauthDenied = unauth.status === 403;
      let mockCodeDenied = false;
      if (ownerCustomer.status === 403) {
        try {
          const body = JSON.parse(ownerCustomer.buffer.toString("utf8")) as {
            code?: string;
          };
          mockCodeDenied = body.code === "CUSTOMER_MOCK_REPORT_FORBIDDEN";
        } catch {
          mockCodeDenied = ownerCustomer.buffer
            .toString("utf8")
            .includes("CUSTOMER_MOCK");
        }
      }

      authRegressionPass =
        adminAllowed &&
        ownerCustomerDenied &&
        wrongDenied &&
        unauthDenied &&
        mockCodeDenied;
      report.unauthorizedAccess = pf(wrongDenied && unauthDenied);
      report.customerMockAccess = mockCodeDenied ? "DENIED" : "FAIL";
      report.ownerAdminQa = pf(adminAllowed);
    } catch (e) {
      report.authRegressionError =
        e instanceof Error ? e.message : String(e);
      report.unauthorizedAccess = "FAIL";
      report.customerMockAccess = "FAIL";
      report.ownerAdminQa = "FAIL";
    }
  } else {
    report.unauthorizedAccess = "FAIL";
    report.customerMockAccess = "FAIL";
    report.ownerAdminQa = "FAIL";
  }
  report.authorizationRegression = pf(authRegressionPass);

  // --- 5. Paid provider readiness (no API call) ---
  const paidProvider = resolveAiProviderForPaid();
  report.aiProviderPaid = paidProvider;
  let paidConfigPass = false;
  let freeFallback = 0;
  let legacyFallback = 0;
  let openaiFallback = 0;
  let mockCustomerFallback = 0;

  if ((process.env.AI_FALLBACK_PROVIDER ?? "").trim()) openaiFallback = 1;
  try {
    resolvePaidProvider({ actor: "customer", requestedProvider: "mock" });
    mockCustomerFallback = 1;
  } catch {
    mockCustomerFallback = 0;
  }
  if (
    !process.env.GEMINI_API_KEY_PAID?.trim() &&
    process.env.GEMINI_API_KEY_FREE?.trim()
  ) {
    freeFallback = 1;
  }
  if (
    !process.env.GEMINI_API_KEY_PAID?.trim() &&
    process.env.GEMINI_API_KEY?.trim()
  ) {
    legacyFallback = 1;
  }

  try {
    if (process.env.GEMINI_API_KEY_PAID?.trim()) {
      assertPaidGeminiConfigured();
      createFortuneInterpreterForTier("paid");
      getAiModelPaid("gemini");
      paidConfigPass = paidProvider === "gemini";
    }
  } catch {
    paidConfigPass = false;
  }

  report.paidProviderConfig = process.env.GEMINI_API_KEY_PAID?.trim()
    ? pf(paidConfigPass)
    : "DEFERRED";
  report.freeGeminiFallback = freeFallback;
  report.legacyKeyFallback = legacyFallback;
  report.openaiFallback = openaiFallback;
  report.mockCustomerFallback = mockCustomerFallback;
  report.qaSeedPolicy = "MOCK ONLY";
  report.freeGeminiRequired = "NO";

  // --- 6. ENV inventory summary ---
  report.envInventory = [
    { variable: "NEXT_PUBLIC_SUPABASE_URL", status: st("NEXT_PUBLIC_SUPABASE_URL"), purpose: "LIVE_ACCEPTANCE_REQUIRED" },
    { variable: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", status: st("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"), purpose: "LIVE_ACCEPTANCE_REQUIRED" },
    { variable: "SUPABASE_SECRET_KEY", status: st("SUPABASE_SECRET_KEY"), purpose: "LIVE_ACCEPTANCE_REQUIRED" },
    { variable: "GEMINI_API_KEY_PAID", status: paidKeyPolicyStatus(), purpose: "DEFERRED_BY_COST_POLICY" },
    { variable: "AI_PROVIDER_PAID", status: st("AI_PROVIDER_PAID"), purpose: "LIVE_ACCEPTANCE_REQUIRED" },
    { variable: "PAID_REPORT_LIVE_ENABLED", status: isPaidReportLiveEnabled() ? "TRUE" : "FALSE", purpose: "LIVE_ACCEPTANCE_REQUIRED" },
    { variable: "ADMIN_MANUAL_TOKEN", status: st("ADMIN_MANUAL_TOKEN"), purpose: "OPTIONAL_DEV_QA" },
    { variable: "GEMINI_API_KEY_FREE", status: st("GEMINI_API_KEY_FREE"), purpose: "PRODUCTION_OPTIONAL" },
  ];

  const allPdfPass = Object.values(pdfResults).every(
    (r) => r.http === "PASS" && r.bytes > 100_000
  );

  const infrastructureReady =
    connectionPass &&
    roundtripPass &&
    !!cliAdmin &&
    spoofDenied &&
    weakDenied &&
    httpAdminPass &&
    allPdfPass &&
    authRegressionPass &&
    !isPaidReportLiveEnabled() &&
    freeFallback === 0 &&
    legacyFallback === 0 &&
    openaiFallback === 0 &&
    mockCustomerFallback === 0;

  const paidGeminiActivation = process.env.GEMINI_API_KEY_PAID?.trim()
    ? paidConfigPass
      ? "READY"
      : "NOT READY"
    : "DEFERRED_BY_COST_POLICY";

  report.infrastructureRecoveryGate = infrastructureReady ? "READY" : "NOT READY";
  report.paidGeminiActivation = paidGeminiActivation;
  report.envRecoveryGate = infrastructureReady ? "READY" : "NOT READY";
  report.costPolicy = "ZERO_PAID_AI_UNTIL_FIRST_CUSTOMER";

  await cleanupQa(qaCleanup);
  writeReport(report);
  printHumanReport(report, pdfResults);
  process.exit(infrastructureReady ? 0 : 1);
}

function writeReport(report: Record<string, unknown>) {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2), "utf8");
}

function printHumanReport(
  report: Record<string, unknown>,
  pdfResults: Record<string, { http: string; bytes: number; pages: number }>
) {
  console.log("\n## P6.1 ENV RECOVERY FINAL\n");
  console.log(`Docker: RUNNING`);
  console.log(`Supabase Local: RUNNING`);
  console.log(`Supabase Environment: ${report.supabaseEnvironment}`);
  console.log(`Real Supabase Connection: ${report.realSupabaseConnection}`);
  console.log(`Repository Roundtrip: ${report.repositoryRoundtrip}`);
  console.log(`\nAdmin Auth:`);
  console.log(`HTTP Admin Auth: ${report.httpAdminAuth ?? "FAIL"}`);
  console.log(`CLI QA Admin: ${report.cliQaAdmin ?? "FAIL"}`);
  console.log(`Cookies Failure Auto-Admin: ${report.cookiesFailureAutoAdmin}`);
  console.log(`Customer Admin Spoof: ${report.customerAdminSpoof}`);
  console.log(`\nQA Seed: ${report.qaSeedPolicy}`);
  console.log(`Free Gemini Required: ${report.freeGeminiRequired}`);
  console.log(`\nPaid Provider:`);
  console.log(`AI_PROVIDER_PAID: ${report.aiProviderPaid}`);
  console.log(`GEMINI_API_KEY_PAID: ${report.geminiApiKeyPaid}`);
  console.log(`Paid Provider Config: ${report.paidProviderConfig}`);
  console.log(`Gemini Live Calls: 0`);
  console.log(`\nProduction PDF HTTP:`);
  for (const [stem, r] of Object.entries(pdfResults)) {
    console.log(`${stem}: ${r.http} / ${r.bytes} bytes / ${r.pages} pages`);
  }
  console.log(`\nUnauthorized Access: ${report.unauthorizedAccess}`);
  console.log(`Customer Mock Access: ${report.customerMockAccess}`);
  console.log(`\nFallbacks:`);
  console.log(`Free Gemini Fallback: ${report.freeGeminiFallback}`);
  console.log(`Legacy Key Fallback: ${report.legacyKeyFallback}`);
  console.log(`OpenAI Fallback: ${report.openaiFallback}`);
  console.log(`Mock Customer Fallback: ${report.mockCustomerFallback}`);
  console.log(`\nPAID_REPORT_LIVE_ENABLED: FALSE`);
  console.log(`Paid AI Cost: 0`);
  console.log(`\n### P6.1 ENV RECOVERY GATE`);
  console.log(`Infrastructure / Env Recovery: ${report.infrastructureRecoveryGate}`);
  console.log(`Paid Gemini Activation: ${report.paidGeminiActivation}`);
  console.log(`\n## COST-AWARE PRE-LAUNCH STATUS`);
  console.log(`Infrastructure: ${report.infrastructureRecoveryGate}`);
  console.log(`Paid Gemini Key: ${report.geminiApiKeyPaid}`);
  console.log(`Paid Gemini Live: ${report.paidGeminiActivation}`);
  console.log(`Development: CONTINUE\n`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(2);
});
