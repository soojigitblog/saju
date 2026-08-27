import "server-only";

import { buildFortuneAiContext } from "@/lib/ai/context";
import { buildInterpretationContextV2 } from "@/lib/ai/interpretation-context-v2";
import type { PaidFortuneReport } from "@/lib/ai/schemas/paid-report";
import type { FortuneChart } from "@/lib/fortune-engine/types";
import { buildPaidReportPdfHtmlConsulting } from "@/lib/report/paid-report-pdf-consulting";
import {
  resolvePaidReportKindFromProductSlug,
  type PaidFortuneReportKind,
} from "@/lib/report/paid-report-kind";
import {
  INTERPRETATION_VERSION_CONSULTING,
  REPORT_RENDER_VERSION_CONSULTING,
} from "@/lib/report/paid-report-versions";

export type GeneratePaidReportPdfInput = {
  nickname: string;
  productName: string;
  productSlug: string;
  report: PaidFortuneReport;
  chart: FortuneChart;
  /** Live Gemini: skip mock consulting enrich overlay in PDF path. */
  live?: boolean;
};

export type GeneratePaidReportPdfResult = {
  html: string;
  reportKind: PaidFortuneReportKind;
  interpretationVersion: typeof INTERPRETATION_VERSION_CONSULTING;
  reportRenderVersion: typeof REPORT_RENDER_VERSION_CONSULTING;
};

/**
 * Single entry point for consulting PDF HTML — used by QA scripts, E2E, and production.
 */
export function generatePaidReportPdf(
  input: GeneratePaidReportPdfInput
): GeneratePaidReportPdfResult {
  const reportKind = resolvePaidReportKindFromProductSlug(input.productSlug);
  const ctx = buildFortuneAiContext(input.chart);
  const v2 = buildInterpretationContextV2(ctx, input.chart);
  const html = buildPaidReportPdfHtmlConsulting({
    nickname: input.nickname,
    productName: input.productName,
    productSlug: input.productSlug,
    report: input.report,
    ctx,
    v2,
    live: input.live,
  });

  return {
    html,
    reportKind,
    interpretationVersion: INTERPRETATION_VERSION_CONSULTING,
    reportRenderVersion: REPORT_RENDER_VERSION_CONSULTING,
  };
}

export function consultingArtifactUrls(reportId: string): {
  htmlUrl: string;
  pdfUrl: string;
} {
  return {
    htmlUrl: `/api/reports/${reportId}/consulting-html`,
    pdfUrl: `/api/reports/${reportId}/consulting-pdf`,
  };
}
