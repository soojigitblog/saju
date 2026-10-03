import "server-only";

import { buildFortuneAiContext } from "@/lib/ai/context";
import type { PaidFortuneReport } from "@/lib/ai/schemas/paid-report";
import type { FortuneChart } from "@/lib/fortune-engine/types";
import { FreeFlowError } from "@/lib/services/free-flow-errors";
import { getFortuneChartById } from "@/lib/repositories/fortune-charts";
import { getFreeResultById } from "@/lib/repositories/free-results";
import { getProductById } from "@/lib/repositories/products";
import { getProfileById } from "@/lib/repositories/profiles";
import type { Order } from "@/lib/repositories/orders";
import type { Report } from "@/lib/repositories/reports";
import { isConsultingReportRenderVersion } from "@/lib/report/paid-report-versions";
import { isKnownPaidFortuneProductSlug } from "@/lib/report/paid-report-kind";
import { deriveReportGenerationMode } from "@/lib/services/paid-report-metadata";
import { isTossTestSandboxCheckoutAllowed } from "@/lib/payments/toss-sandbox";

export type ConsultingReportRenderContext = {
  nickname: string;
  productName: string;
  productSlug: string;
  report: PaidFortuneReport;
  chart: FortuneChart;
  live: boolean;
  reportRenderVersion: string;
  generationMode: "mock" | "live";
};

export async function loadConsultingReportRenderContext(input: {
  order: Order;
  report: Report;
  /** customer (default): deny mock-generated reports. qa/admin: allow. */
  accessActor?: "customer" | "qa" | "admin";
}): Promise<ConsultingReportRenderContext> {
  if (input.report.generation_status !== "COMPLETED" || !input.report.result_json) {
    throw new FreeFlowError(
      "REPORT_NOT_READY",
      "리포트가 아직 준비되지 않았습니다.",
      409
    );
  }

  const accessActor = input.accessActor ?? "customer";
  const raw = input.report.result_json as Omit<PaidFortuneReport, "reportKind"> & {
    reportRenderVersion?: string;
    reportKind?: string;
    generationMode?: "mock" | "live";
  };

  if (raw.reportKind === "paid_tarot") {
    throw new FreeFlowError(
      "NOT_CONSULTING_REPORT",
      "컨설팅 PDF가 아닌 리포트입니다.",
      400
    );
  }

  if (!isConsultingReportRenderVersion(raw.reportRenderVersion)) {
    throw new FreeFlowError(
      "LEGACY_REPORT",
      "이 리포트는 레거시 형식입니다.",
      404
    );
  }

  const generationMode = deriveReportGenerationMode(input.report);

  // Production customer must never download mock QA reports (server model wins).
  // Toss TEST sandbox (local, test keys only) may view the generated mock report.
  if (
    accessActor === "customer" &&
    generationMode === "mock" &&
    !isTossTestSandboxCheckoutAllowed()
  ) {
    throw new FreeFlowError(
      "CUSTOMER_MOCK_REPORT_FORBIDDEN",
      "이 리포트는 확인할 수 없습니다.",
      403
    );
  }

  const product = await getProductById(input.order.product_id);
  if (!product?.slug || !isKnownPaidFortuneProductSlug(product.slug)) {
    throw new FreeFlowError(
      "UNKNOWN_PAID_PRODUCT",
      "지원하지 않는 유료 상품입니다.",
      400
    );
  }

  const profile = await getProfileById(input.order.profile_id);
  if (!profile) {
    throw new FreeFlowError("NOT_FOUND", "프로필을 찾을 수 없습니다.", 404);
  }

  let chart: FortuneChart | undefined;
  if (input.order.source_result_id) {
    const free = await getFreeResultById(input.order.source_result_id);
    if (free) {
      const chartRow = await getFortuneChartById(free.chart_id);
      chart = (chartRow?.chart ??
        (chartRow?.raw_chart_json as unknown as FortuneChart | undefined)) as
        | FortuneChart
        | undefined;
    }
  }
  if (!chart) {
    throw new FreeFlowError(
      "CHART_MISSING",
      "사주 데이터가 없어 PDF를 생성할 수 없습니다.",
      400
    );
  }

  buildFortuneAiContext(chart);

  return {
    nickname: profile.nickname,
    productName: input.order.product_name_snapshot ?? product.name,
    productSlug: product.slug,
    report: raw as PaidFortuneReport,
    chart,
    live: generationMode === "live",
    reportRenderVersion: raw.reportRenderVersion!,
    generationMode,
  };
}
