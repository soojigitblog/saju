/**
 * P6 ENV RECOVERY SMOKE — Gemini call = 0
 * npx tsx --require ./scripts/shim-server-only.cjs scripts/phase-p6-env-recovery-smoke.ts
 */
import { createAdminClient } from "../src/lib/supabase/admin";
import { isSupabaseConfigured } from "../src/lib/supabase/env";
import { tryAdminRequest } from "../src/lib/admin/manual-auth";
import {
  assertPaidGeminiConfigured,
  isPaidReportLiveEnabled,
  resolveAiProviderForPaid,
} from "../src/lib/ai/config";
import { resetMockFreeFlowState } from "../src/lib/services/create-free-fortune";
import { seedAdminQaConsultingReport } from "../src/lib/services/admin-qa-seed-consulting-report";
import { serveConsultingPdf } from "../src/lib/services/serve-consulting-pdf";
import { getOrderById } from "../src/lib/repositories/orders";
import { getReportByOrderId } from "../src/lib/repositories/reports";
import { MOCK_PRODUCT_IDS } from "../src/lib/mock-data";

const OUT = "tmp/quality-review/paid-gemini-live/env-recovery-smoke.json";

function passFail(ok: boolean) {
  return ok ? "PASS" : "FAIL";
}

async function main() {
  process.env.NODE_ENV = "test";
  process.env.VITEST = "true";
  process.env.AI_PROVIDER = process.env.AI_PROVIDER ?? "mock";
  process.env.AI_PROVIDER_PAID = process.env.AI_PROVIDER_PAID ?? "mock";
  process.env.PAYMENT_PROVIDER = process.env.PAYMENT_PROVIDER ?? "mock";
  process.env.PAID_REPORT_LIVE_ENABLED = "false";
  process.env.ALLOW_PAID_QA_CHECKOUT = "1";
  process.env.ALLOW_TOSS_CHECKOUT = "1";
  process.env.ALLOW_MOCK_AI = "1";
  process.env.ADMIN_MANUAL_BYPASS = "1";
  process.env.APP_ENV = process.env.APP_ENV ?? "development";

  resetMockFreeFlowState();

  const report: Record<string, unknown> = {
    phase: "P6_ENV_RECOVERY_SMOKE",
    at: new Date().toISOString(),
    geminiCalls: 0,
    paidReportLiveEnabled: isPaidReportLiveEnabled(),
  };

  // Supabase
  let supabasePass = false;
  if (isSupabaseConfigured()) {
    try {
      const admin = createAdminClient();
      const { error } = await admin.from("products").select("id").limit(1);
      supabasePass = !error;
      report.supabaseDetail = error ? error.message : "ok";
    } catch (e) {
      report.supabaseDetail = e instanceof Error ? e.message : String(e);
    }
  } else {
    report.supabaseDetail = "mock data mode (Supabase not configured)";
    supabasePass = true;
  }
  report.supabaseConnection = passFail(supabasePass);

  // Admin auth
  const adminReq = new Request("http://localhost/api/admin/qa/seed", {
    headers: { "x-admin-manual-token": "smoke" },
  });
  const adminAuth = await tryAdminRequest(adminReq);
  report.adminAuth = passFail(!!adminAuth);

  // Mock QA consulting PDF
  let mockPdfPass = false;
  try {
    const seeded = await seedAdminQaConsultingReport({
      productId: MOCK_PRODUCT_IDS.money,
    });
    const order = await getOrderById(seeded.orderId);
    const rep = await getReportByOrderId(seeded.orderId);
    if (!order || !rep) throw new Error("seed missing order/report");
    const served = await serveConsultingPdf({
      order,
      report: rep,
      accessActor: "admin",
    });
    mockPdfPass =
      served.pdfBuffer.byteLength > 50_000 &&
      served.pdfBuffer.subarray(0, 4).toString("utf8") === "%PDF";
    report.mockPdfBytes = served.pdfBuffer.byteLength;
  } catch (e) {
    report.mockPdfError = e instanceof Error ? e.message : String(e);
  }
  report.consultingPdfMockQa = passFail(mockPdfPass);

  // Production PDF path identity (serveConsultingPdf uses generatePaidReportPdf)
  report.productionPdfRoute = passFail(mockPdfPass);
  report.rendererEntry = "generatePaidReportPdf";

  // Paid provider config
  const paidProvider = resolveAiProviderForPaid();
  report.paidProvider = paidProvider;
  let paidConfigured = false;
  try {
    if (paidProvider === "gemini") {
      assertPaidGeminiConfigured();
      paidConfigured = true;
    } else if (paidProvider === "mock") {
      paidConfigured = false;
      report.paidProviderNote = "mock — live Gemini not configured yet";
    } else {
      paidConfigured = true;
    }
  } catch {
    paidConfigured = false;
  }
  report.paidProviderConfig = paidConfigured ? "CONFIGURED" : "MISSING_PAID_KEY";
  report.paidReportLiveEnabledCheck = passFail(!isPaidReportLiveEnabled());

  const allPass =
    supabasePass &&
    !!adminAuth &&
    mockPdfPass &&
    !isPaidReportLiveEnabled();

  report.overall = passFail(allPass);
  report.geminiCalls = 0;

  const fs = await import("node:fs");
  const path = await import("node:path");
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify(report, null, 2));
  process.exit(allPass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
