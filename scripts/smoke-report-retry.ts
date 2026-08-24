/**
 * One-off smoke order report retry (PHASE 6.6).
 * Usage: npx tsx --require ./scripts/shim-server-only.cjs scripts/smoke-report-retry.ts
 */
import { adminRetryPaidReportGeneration } from "@/lib/services/paid-report-job";
import { getOrderById } from "@/lib/repositories/orders";
import { getReportByOrderId } from "@/lib/repositories/reports";
import { getAiGenerationByKey } from "@/lib/repositories/ai-generations";

const SMOKE_ORDER_ID = "9b74f6c9-626a-4220-98bd-619ccafd4e9e";

async function main() {
  const order = await getOrderById(SMOKE_ORDER_ID);
  if (!order) {
    console.log(JSON.stringify({ ok: false, error: "ORDER_NOT_FOUND" }));
    process.exit(1);
  }

  console.log("before:", {
    orderNo: order.order_no,
    status: order.status,
    paid_at: order.paid_at,
  });

  const result = await adminRetryPaidReportGeneration({ orderId: SMOKE_ORDER_ID });

  const afterOrder = await getOrderById(SMOKE_ORDER_ID);
  const report = await getReportByOrderId(SMOKE_ORDER_ID);
  const gens = report
    ? await getAiGenerationByKey(`paid:${SMOKE_ORDER_ID}`)
    : null;

  console.log(
    JSON.stringify(
      {
        ok: true,
        retry: result,
        order: {
          status: afterOrder?.status,
          paid_at: afterOrder?.paid_at,
        },
        report: report
          ? {
              generation_status: report.generation_status,
              error_code: report.error_code,
              input_tokens: report.input_tokens,
              estimated_ai_cost_usd: report.estimated_ai_cost_usd,
            }
          : null,
        ai_generation: gens
          ? {
              status: gens.status,
              error_code: gens.error_code,
              total_tokens: gens.total_tokens,
            }
          : null,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
