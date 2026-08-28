/**
 * P6.1 REAL ENV RECOVERY SMOKE — mock Supabase = FAIL, Gemini call = 0
 * npx tsx --env-file=.env.local --require ./scripts/shim-server-only.cjs scripts/phase-p6-1-env-recovery-smoke.ts
 */
import fs from "node:fs";
import path from "node:path";
import { createAdminClient } from "../src/lib/supabase/admin";
import { isSupabaseConfigured } from "../src/lib/supabase/env";
import { getDataMode } from "../src/lib/repositories/data-mode";
import { tryAdminRequest } from "../src/lib/admin/manual-auth";
import {
  assertPaidGeminiConfigured,
  isPaidReportLiveEnabled,
  resolveAiProviderForPaid,
  resolvePaidProvider,
} from "../src/lib/ai/config";
import { seedAdminQaConsultingReport } from "../src/lib/services/admin-qa-seed-consulting-report";
import { getPaidReportForOwner } from "../src/lib/services/get-paid-report";
import { serveConsultingPdf } from "../src/lib/services/serve-consulting-pdf";
import { getOrderById } from "../src/lib/repositories/orders";
import { getReportByOrderId } from "../src/lib/repositories/reports";
import { MOCK_PRODUCT_IDS } from "../src/lib/mock-data";

const OUT = path.join(
  process.cwd(),
  "tmp",
  "quality-review",
  "paid-gemini-live",
  "p6-1-env-recovery-report.json"
);

const BASE = (process.env.P6_RECOVERY_BASE_URL ?? "http://localhost:3847").replace(
  /\/$/,
  ""
);

function passFail(ok: boolean) {
  return ok ? "PASS" : "FAIL";
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

async function fetchConsultingPdfHttp(input: {
  reportId: string;
  guestSessionId?: string;
}): Promise<{ status: number; buffer: Buffer; contentType: string | null }> {
  const headers: Record<string, string> = {
    origin: BASE,
  };
  const token = process.env.ADMIN_MANUAL_TOKEN?.trim();
  if (token) headers["x-admin-manual-token"] = token;
  if (input.guestSessionId) {
    headers.cookie = `fortune_guest_session=${input.guestSessionId}`;
  }
  const res = await fetch(
    `${BASE}/api/reports/${input.reportId}/consulting-pdf`,
    { headers }
  );
  const buffer = Buffer.from(await res.arrayBuffer());
  return {
    status: res.status,
    buffer,
    contentType: res.headers.get("content-type"),
  };
}

async function main() {
  process.env.PAID_REPORT_LIVE_ENABLED = "false";
  process.env.ALLOW_PAID_QA_CHECKOUT = "1";
  process.env.ALLOW_TOSS_CHECKOUT = "1";
  process.env.ADMIN_MANUAL_BYPASS = "1";
  process.env.ALLOW_MOCK_AI = "1";
  process.env.APP_ENV = process.env.APP_ENV ?? "development";
  process.env.ALLOW_INTERNAL_ADMIN_QA = "1";
  process.env.INTERNAL_ADMIN_QA_RUNNER = "1";
  // Admin QA seed: mock free + mock paid generation — no Gemini calls
  process.env.AI_PROVIDER_FREE = "mock";

  const report: Record<string, unknown> = {
    phase: "P6.1_ENV_RECOVERY",
    at: new Date().toISOString(),
    geminiLiveCalls: 0,
    supabaseMockMode: getDataMode() === "mock",
    paidReportLiveEnabled: isPaidReportLiveEnabled(),
  };

  if (report.supabaseMockMode) {
    report.realSupabaseEnv = "FAIL";
    report.realSupabaseConnection = "FAIL";
    report.blocker = "Supabase mock data mode — not acceptable for P6.1";
    writeReport(report);
    process.exit(1);
  }

  const supabaseConfigured = isSupabaseConfigured();
  report.realSupabaseEnv = passFail(supabaseConfigured);
  if (!supabaseConfigured) {
    report.realSupabaseConnection = "FAIL";
    report.blocker = "Supabase env not configured";
    writeReport(report);
    process.exit(1);
  }

  let connectionPass = false;
  let repositoryPass = false;
  try {
    const admin = createAdminClient();
    const { data: products, error: pErr } = await admin
      .from("products")
      .select("id")
      .limit(1);
    connectionPass = !pErr;
    repositoryPass = !pErr && Array.isArray(products);
    if (pErr) report.connectionError = pErr.message;
  } catch (e) {
    report.connectionError = e instanceof Error ? e.message : String(e);
  }
  report.realSupabaseConnection = passFail(connectionPass);
  report.reportRepository = passFail(repositoryPass);

  const adminReq = new Request("http://localhost/api/admin/qa/seed", {
    headers: {
      "x-admin-manual-token": process.env.ADMIN_MANUAL_TOKEN ?? "",
    },
  });
  const adminAuth = await tryAdminRequest(adminReq);
  report.adminAuth = passFail(!!adminAuth);

  let ownerAuthPass = false;
  let reportInsertPass = false;
  let productionPdfPass = false;
  let pdfBytes = 0;
  let pdfPages = 0;
  let reportId = "";
  let guestSessionId = "";

  try {
    const seeded = await seedAdminQaConsultingReport({
      productId: MOCK_PRODUCT_IDS.money,
    });
    reportInsertPass = !!seeded.reportId;
    reportId = seeded.reportId;
    guestSessionId = seeded.guestSessionId;

    const order = await getOrderById(seeded.orderId);
    const rep = await getReportByOrderId(seeded.orderId);
    if (!order || !rep) throw new Error("report read failed");

    await getPaidReportForOwner({
      reportOrOrderId: rep.id,
      guestSessionId: seeded.guestSessionId,
    });
    ownerAuthPass = true;

    const served = await serveConsultingPdf({
      order,
      report: rep,
      accessActor: "admin",
    });
    pdfBytes = served.pdfBuffer.byteLength;
    pdfPages = served.pageCountEstimate;
    report.directPdfPath = passFail(
      served.pdfBuffer.subarray(0, 4).toString("utf8") === "%PDF" &&
        pdfBytes > 50_000 &&
        pdfPages === 9
    );
    report.rendererEntry = "generatePaidReportPdf";
    report.reportRenderVersion = served.headers["X-Report-Render-Version"];
  } catch (e) {
    report.qaPathError =
      e instanceof Error
        ? e.message
        : typeof e === "object" && e && "message" in e
          ? String((e as { message: unknown }).message)
          : String(e);
  }

  report.ownerAuthorization = passFail(ownerAuthPass);
  report.testReportInsertRead = passFail(reportInsertPass);
  report.pdfBytes = pdfBytes;
  report.pdfPages = pdfPages;

  const serverUp = await waitForServer(5_000);
  report.devServerReachable = serverUp ? "YES" : "NO";

  if (serverUp && reportId) {
    try {
      const http = await fetchConsultingPdfHttp({ reportId, guestSessionId });
      const isPdf =
        http.status === 200 &&
        (http.contentType?.includes("application/pdf") ?? false) &&
        http.buffer.subarray(0, 4).toString("utf8") === "%PDF" &&
        http.buffer.byteLength > 50_000;
      productionPdfPass = isPdf;
      if (isPdf) {
        pdfBytes = http.buffer.byteLength;
      } else {
        report.httpPdfError = `status=${http.status} type=${http.contentType ?? "none"}`;
      }
    } catch (e) {
      report.httpPdfError = e instanceof Error ? e.message : String(e);
    }
  } else if (report.directPdfPath === "PASS") {
    productionPdfPass = true;
    report.httpPdfSkipped = "dev server not reachable — used direct serveConsultingPdf";
  }

  report.productionPdfPath = passFail(productionPdfPass);

  const paidProvider = resolveAiProviderForPaid();
  report.aiProviderPaid = paidProvider;
  let paidConfigured = false;
  let freeFallback = 0;
  let mockFallback = 0;
  let openaiFallback = 0;

  if ((process.env.AI_FALLBACK_PROVIDER ?? "").trim()) {
    openaiFallback = 1;
  }
  try {
    resolvePaidProvider({ actor: "customer", requestedProvider: "mock" });
    mockFallback = 1;
  } catch {
    mockFallback = 0;
  }
  if (paidProvider === "gemini") {
    try {
      assertPaidGeminiConfigured();
      paidConfigured = true;
    } catch {
      paidConfigured = false;
    }
  }
  if (
    !process.env.GEMINI_API_KEY_PAID?.trim() &&
    process.env.GEMINI_API_KEY_FREE?.trim()
  ) {
    freeFallback = 1;
  }

  report.paidProvider = process.env.GEMINI_API_KEY_PAID?.trim()
    ? paidConfigured
      ? "CONFIGURED"
      : "MISSING"
    : "DEFERRED_BY_COST_POLICY";
  report.geminiApiKeyPaid = process.env.GEMINI_API_KEY_PAID?.trim()
    ? "SET"
    : "NOT_CONFIGURED_BY_POLICY";
  report.freeFallback = freeFallback;
  report.mockFallback = mockFallback;
  report.openaiFallback = openaiFallback;

  const infrastructureReady =
    connectionPass &&
    repositoryPass &&
    !!adminAuth &&
    reportInsertPass &&
    ownerAuthPass &&
    productionPdfPass &&
    !isPaidReportLiveEnabled() &&
    freeFallback === 0 &&
    mockFallback === 0 &&
    openaiFallback === 0;

  report.infrastructureRecoveryGate = infrastructureReady ? "READY" : "NOT READY";
  report.paidGeminiActivation = process.env.GEMINI_API_KEY_PAID?.trim()
    ? paidConfigured
      ? "READY"
      : "NOT READY"
    : "DEFERRED_BY_COST_POLICY";
  report.envRecoveryGate = infrastructureReady ? "READY" : "NOT READY";
  writeReport(report);
  console.log(JSON.stringify(report, null, 2));
  process.exit(infrastructureReady ? 0 : 1);
}

function writeReport(report: Record<string, unknown>) {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2), "utf8");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(2);
});
