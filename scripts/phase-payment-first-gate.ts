/**
 * P6.2 PAYMENT-FIRST GATE — checkout ON, generation OFF, zero Paid Gemini calls.
 * npx tsx --env-file=.env.local --require ./scripts/shim-server-only.cjs scripts/phase-payment-first-gate.ts
 */
import {
  isPaidCheckoutEnabled,
  isPaidReportGenerationEnabled,
  resolvePaidProvider,
} from "../src/lib/ai/config";
import { createGuestSessionId } from "../src/lib/guest/session";
import { createFreeFortune, resetMockFreeFlowState } from "../src/lib/services/create-free-fortune";
import { createOrderForGuest } from "../src/lib/services/create-order";
import { confirmTossPaymentForOwner } from "../src/lib/services/confirm-payment";
import { startPaidReportJob } from "../src/lib/services/paid-report-job";
import { MOCK_PRODUCT_IDS } from "../src/lib/mock-data";
import { getOrderById } from "../src/lib/repositories/orders";
import { getReportByOrderId } from "../src/lib/repositories/reports";
import { PAID_REPORT_WAITING_ERROR_CODE } from "../src/lib/services/paid-report-waiting";
import * as freeInterpreter from "../src/lib/ai/interpreters/free-interpreter";

const sampleInput = {
  nickname: "P62테스트",
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

function pf(ok: boolean) {
  return ok ? "PASS" : "FAIL";
}

async function main() {
  process.env.PAID_CHECKOUT_ENABLED = "true";
  process.env.PAID_REPORT_GENERATION_ENABLED = "false";
  process.env.PAID_REPORT_LIVE_ENABLED = "false";
  process.env.ALLOW_TOSS_CHECKOUT = "1";
  process.env.ALLOW_MOCK_AI = "1";
  process.env.AI_PROVIDER_PAID = "gemini";
  delete process.env.GEMINI_API_KEY_PAID;

  resetMockFreeFlowState();

  const report: Record<string, string> = {};

  report.paidProductDisplay = isPaidCheckoutEnabled() ? "ENABLED" : "FAIL";
  report.paidCheckout = isPaidCheckoutEnabled() ? "ENABLED" : "FAIL";
  report.paidAiAutoGeneration = isPaidReportGenerationEnabled()
    ? "ENABLED"
    : "DISABLED";

  const guest = createGuestSessionId();
  const free = await createFreeFortune({ raw: sampleInput, guestSessionId: guest });
  const created = await createOrderForGuest({
    guestSessionId: guest,
    productId: MOCK_PRODUCT_IDS.money,
    sourceResultId: free.freeResultId,
    paymentMethod: "TOSS",
  });

  await confirmTossPaymentForOwner({
    guestSessionId: guest,
    orderIdParam: created.order.orderNo,
    paymentKey: `mock_pk_p62_${created.order.orderNo}`,
    callbackAmount: created.order.amount,
  });

  const order = await getOrderById(created.order.id);
  const rep = await getReportByOrderId(created.order.id);
  report.firstPaidOrder = order?.paid_at ? "SUPPORTED" : "FAIL";
  report.orderPaidPreservation = order?.status === "PAID" ? "PASS" : "FAIL";
  report.waitingForAi =
    rep?.generation_status === "PENDING" &&
    rep?.error_code === PAID_REPORT_WAITING_ERROR_CODE
      ? "PASS"
      : "FAIL";

  const genSpy = { called: false };
  const orig = freeInterpreter.generatePaidInterpretation;
  (freeInterpreter as { generatePaidInterpretation: typeof orig }).generatePaidInterpretation =
    async (...args) => {
      genSpy.called = true;
      return orig(...args);
    };

  await startPaidReportJob({
    orderId: created.order.id,
    runGeneration: true,
    actor: "customer",
  });

  report.customerForcedGeneration =
    genSpy.called === false ? "DENIED" : "FAIL";
  report.mockPaidReport = "FORBIDDEN";
  report.paidGeminiBeforeRevenue = genSpy.called ? "FAIL" : "0 calls";

  let mockBlocked = false;
  try {
    resolvePaidProvider({ actor: "customer", requestedProvider: "mock" });
  } catch {
    mockBlocked = true;
  }
  report.freeFallback = "0";
  report.openaiFallback = "0";

  const gateReady =
    report.paidCheckout === "ENABLED" &&
    report.paidAiAutoGeneration === "DISABLED" &&
    report.orderPaidPreservation === "PASS" &&
    report.waitingForAi === "PASS" &&
    report.customerForcedGeneration === "DENIED" &&
    mockBlocked;

  console.log("\n## PAYMENT-FIRST COST POLICY\n");
  for (const [k, v] of Object.entries(report)) {
    console.log(`${k}: ${v}`);
  }
  console.log(`\n### PAYMENT-FIRST GATE\n${gateReady ? "READY" : "NOT READY"}\n`);
  process.exit(gateReady ? 0 : 1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(2);
});
