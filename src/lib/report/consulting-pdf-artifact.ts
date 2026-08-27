import "server-only";

import { generatePaidReportPdf } from "@/lib/report/generate-paid-report-pdf";
import { renderConsultingPdfBuffer } from "@/lib/report/render-consulting-pdf-buffer";
import {
  INTERPRETATION_VERSION_CONSULTING,
  REPORT_RENDER_VERSION_CONSULTING,
} from "@/lib/report/paid-report-versions";
import type { ConsultingReportRenderContext } from "@/lib/services/load-consulting-report-render";

/** Opaque filename — no PII (name, birth date, phone, order details). */
export function consultingPdfFilename(reportId: string): string {
  const opaque = reportId.replace(/-/g, "").slice(0, 12);
  return `unyegyeol-report-${opaque}.pdf`;
}

export type ConsultingPdfArtifact = {
  pdfBuffer: Buffer;
  filename: string;
  interpretationVersion: typeof INTERPRETATION_VERSION_CONSULTING;
  reportRenderVersion: typeof REPORT_RENDER_VERSION_CONSULTING;
  pageCountEstimate: number;
};

export async function buildConsultingPdfArtifact(
  reportId: string,
  renderCtx: ConsultingReportRenderContext
): Promise<ConsultingPdfArtifact> {
  const { html, interpretationVersion, reportRenderVersion } =
    generatePaidReportPdf({
      nickname: renderCtx.nickname,
      productName: renderCtx.productName,
      productSlug: renderCtx.productSlug,
      report: renderCtx.report,
      chart: renderCtx.chart,
      live: renderCtx.live,
    });

  const pdfBuffer = await renderConsultingPdfBuffer(html);
  const pageCountEstimate = (html.match(/class="page /g) ?? []).length;

  return {
    pdfBuffer,
    filename: consultingPdfFilename(reportId),
    interpretationVersion,
    reportRenderVersion,
    pageCountEstimate,
  };
}

export const CONSULTING_PDF_CACHE_CONTROL = "private, no-store" as const;

export function consultingPdfResponseHeaders(input: {
  filename: string;
  reportRenderVersion: string;
}): Record<string, string> {
  return {
    "Content-Type": "application/pdf",
    "Content-Disposition": `inline; filename="${input.filename}"`,
    "Cache-Control": CONSULTING_PDF_CACHE_CONTROL,
    "X-Report-Render-Version": input.reportRenderVersion,
  };
}
