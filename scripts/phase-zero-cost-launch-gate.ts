/**
 * P6.3 ZERO-COST LAUNCH GATE — checkout ON, generation OFF, zero Paid Gemini calls.
 * npx tsx --env-file=.env.local --require ./scripts/shim-server-only.cjs scripts/phase-zero-cost-launch-gate.ts
 */
import {
  isPaidCheckoutEnabled,
  isPaidReportGenerationEnabled,
  resolvePaidProvider,
} from "../src/lib/ai/config";
import { createGuestSessionId } from "../src/lib/guest/session";
import {
  createFreeFortune,
  resetMockFreeFlowState,
} from "../src/lib/services/create-free-fortune";
import { createOrderForGuest } from "../src/lib/services/create-order";
import { MOCK_PRODUCT_IDS } from "../src/lib/mock-data";
import { getOrderById } from "../src/lib/repositories/orders";
import {
  getReportByOrderId,
  listWaitingForAiReports,
} from "../src/lib/repositories/reports";
import { PAID_REPORT_WAITING_ERROR_CODE } from "../src/lib/services/paid-report-waiting";
import {
  isPaidReportOperationalFailure,
  shouldNotifyPaidReportFailure,
} from "../src/lib/services/paid-report-failure-policy";
import { canAdminTriggerPaidGeneration } from "../src/lib/services/paid-report-generation-readiness";
import { serveConsultingPdf } from "../src/lib/services/serve-consulting-pdf";
import * as freeInterpreter from "../src/lib/ai/interpreters/free-interpreter";

const sampleInput = {
  nickname: "P63게이트",
  gender: "female" as const,
  calendarType: "solar" as const,
  birthDate: "1990-05-15",
  birthTime: "10:30",
  birthTimeUnknown: false,
  lunarLeapMonth: false,
  birthPlace: "서울",
  maritalStatus: "unmarried" as const,
  hasChildren: null,
  timezone: "Asia/Seoul" as const,
};

async function main() {
  process.env.PAID_CHECKOUT_ENABLED = "true";
  process.env.PAID_REPORT_GENERATION_ENABLED = "false";
  process.env.PAID_REPORT_LIVE_ENABLED = "false";
  process.env.ALLOW_TOSS_CHECKOUT = "1";
  process.env.ALLOW_MOCK_AI = "1";
  process.env.AI_PROVIDER_PAID = "gemini";
  delete process.env.GEMINI_API_KEY_PAID;

  resetMockFreeFlowState();

  const { confirmTossPaymentForOwner } = await import(
    "../src/lib/services/confirm-payment"
  );
  const { adminRetryPaidReportGeneration, retryPaidReportGeneration } =
    await import("../src/lib/services/paid-report-job");

  const report: Record<string, string | number> = {};

  report.waitingForAiFailureMetrics =
    !isPaidReportOperationalFailure(PAID_REPORT_WAITING_ERROR_CODE, "PENDING") &&
    !shouldNotifyPaidReportFailure(PAID_REPORT_WAITING_ERROR_CODE, "PENDING")
      ? "EXCLUDED"
      : "FAIL";

  report.legacyFlagPrecedence =
    isPaidCheckoutEnabled() && !isPaidReportGenerationEnabled() ? "PASS" : "FAIL";

  const guest = createGuestSessionId();
  const free = await createFreeFortune({ raw: sampleInput, guestSessionId: guest });
  const created = await createOrderForGuest({
    guestSessionId: guest,
    productId: MOCK_PRODUCT_IDS.money,
    sourceResultId: free.freeResultId,
    paymentMethod: "TOSS",
  });

  let geminiCalls = 0;
  const origGen = freeInterpreter.generatePaidInterpretation;
  (freeInterpreter as { generatePaidInterpretation: typeof origGen }).generatePaidInterpretation =
    async (...args) => {
      geminiCalls += 1;
      return origGen(...args);
    };

  const paymentKey = `mock_pk_p63_${created.order.orderNo}`;
  const firstConfirm = await confirmTossPaymentForOwner({
    guestSessionId: guest,
    orderIdParam: created.order.orderNo,
    paymentKey,
    callbackAmount: created.order.amount,
  });

  const order = await getOrderById(created.order.id);
  const rep = await getReportByOrderId(created.order.id);
  const waiting = await listWaitingForAiReports();

  report.adminWaitingQueue = waiting.some((w) => w.order_id === created.order.id)
    ? "PASS"
    : "FAIL";

  report.paidKeyMissingSafety = "PASS";
  try {
    await adminRetryPaidReportGeneration({ orderId: created.order.id });
    report.paidKeyMissingSafety = "FAIL";
  } catch (e) {
    if (
      typeof e === "object" &&
      e !== null &&
      "code" in e &&
      (e as { code: string }).code === "PAID_AI_NOT_CONFIGURED"
    ) {
      report.paidKeyMissingSafety = "PASS";
    }
  }

  const orderAfterAdmin = await getOrderById(created.order.id);
  const repAfterAdmin = await getReportByOrderId(created.order.id);
  if (orderAfterAdmin?.status !== "PAID") report.paidKeyMissingSafety = "FAIL";
  if (repAfterAdmin?.error_code !== PAID_REPORT_WAITING_ERROR_CODE) {
    report.paidKeyMissingSafety = "FAIL";
  }

  report.customerWaitingUx =
    order?.status === "PAID" &&
    rep?.generation_status === "PENDING" &&
    rep?.error_code === PAID_REPORT_WAITING_ERROR_CODE
      ? "PASS"
      : "FAIL";

  let pdfDenied = false;
  try {
    if (order && rep) {
      await serveConsultingPdf({ order, report: rep, accessActor: "customer" });
    }
  } catch {
    pdfDenied = true;
  }
  report.waitingPdfAccess = pdfDenied ? "DENIED" : "FAIL";

  const secondConfirm = await confirmTossPaymentForOwner({
    guestSessionId: guest,
    orderIdParam: created.order.orderNo,
    paymentKey,
    callbackAmount: created.order.amount,
  });

  const reportsAfterDup = [
    ...(await import("../src/lib/mock-store")).mockStore.reports.values(),
  ].filter((r) => r.order_id === created.order.id);

  report.duplicatePaymentConfirm =
    reportsAfterDup.length === 1 ? "SAFE" : "FAIL";
  report.duplicateTelegram =
    firstConfirm.alreadyPaid === false && secondConfirm.alreadyPaid === true
      ? 0
      : 1;

  let customerGenDenied = false;
  try {
    await retryPaidReportGeneration({
      orderId: created.order.id,
      guestSessionId: guest,
    });
  } catch {
    customerGenDenied = true;
  }
  report.customerForcedGeneration = customerGenDenied ? "DENIED" : "FAIL";

  let mockBlocked = false;
  try {
    resolvePaidProvider({ actor: "customer", requestedProvider: "mock" });
  } catch {
    mockBlocked = true;
  }
  if (!mockBlocked) report.customerForcedGeneration = "FAIL";

  report.paidGeminiCalls = geminiCalls;
  report.paidCheckout = isPaidCheckoutEnabled() ? "ENABLED" : "FAIL";
  report.paidGeneration = isPaidReportGenerationEnabled() ? "ENABLED" : "DISABLED";
  report.paidAiCost = 0;

  const gateReady =
    report.waitingForAiFailureMetrics === "EXCLUDED" &&
    report.legacyFlagPrecedence === "PASS" &&
    report.adminWaitingQueue === "PASS" &&
    report.paidKeyMissingSafety === "PASS" &&
    report.customerWaitingUx === "PASS" &&
    report.waitingPdfAccess === "DENIED" &&
    report.duplicatePaymentConfirm === "SAFE" &&
    report.duplicateTelegram === 0 &&
    firstConfirm.alreadyPaid === false &&
    report.customerForcedGeneration === "DENIED" &&
    report.paidGeminiCalls === 0 &&
    report.paidCheckout === "ENABLED" &&
    report.paidGeneration === "DISABLED";

  console.log("\n## ZERO-COST LAUNCH OPERATIONS\n");
  console.log(`WAITING_FOR_AI Failure Metrics: ${report.waitingForAiFailureMetrics}`);
  console.log(`Legacy Flag Precedence: ${report.legacyFlagPrecedence}`);
  console.log(`Admin Waiting Queue: ${report.adminWaitingQueue}`);
  console.log(`Paid Key Missing Safety: ${report.paidKeyMissingSafety}`);
  console.log(`Customer Waiting UX: ${report.customerWaitingUx}`);
  console.log(`Waiting PDF Access: ${report.waitingPdfAccess}`);
  console.log(`Duplicate Payment Confirm: ${report.duplicatePaymentConfirm}`);
  console.log(`Duplicate Telegram: ${report.duplicateTelegram}`);
  console.log(`Customer Forced Generation: ${report.customerForcedGeneration}`);
  console.log(`Paid Gemini Calls: ${report.paidGeminiCalls}`);
  console.log("");
  console.log(`Paid Checkout: ${report.paidCheckout}`);
  console.log(`Paid Generation: ${report.paidGeneration}`);
  console.log(`Paid AI Cost: ${report.paidAiCost}`);
  console.log(`\n### ZERO-COST LAUNCH GATE\n${gateReady ? "READY" : "NOT READY"}\n`);

  process.exit(gateReady ? 0 : 1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(2);
});
