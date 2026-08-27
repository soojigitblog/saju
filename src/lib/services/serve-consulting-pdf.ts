import "server-only";

import {
  buildConsultingPdfArtifact,
  consultingPdfResponseHeaders,
} from "@/lib/report/consulting-pdf-artifact";
import type { Order } from "@/lib/repositories/orders";
import type { Report } from "@/lib/repositories/reports";
import {
  loadConsultingReportRenderContext,
  type ConsultingReportRenderContext,
} from "@/lib/services/load-consulting-report-render";

export type ServeConsultingPdfInput = {
  order: Order;
  report: Report;
  accessActor?: "customer" | "qa" | "admin";
};

export type ServeConsultingPdfResult = {
  pdfBuffer: Buffer;
  headers: Record<string, string>;
  renderCtx: ConsultingReportRenderContext;
  pageCountEstimate: number;
};

export async function serveConsultingPdf(
  input: ServeConsultingPdfInput
): Promise<ServeConsultingPdfResult> {
  const renderCtx = await loadConsultingReportRenderContext({
    order: input.order,
    report: input.report,
    accessActor: input.accessActor ?? "customer",
  });

  const artifact = await buildConsultingPdfArtifact(input.report.id, renderCtx);

  return {
    pdfBuffer: artifact.pdfBuffer,
    headers: consultingPdfResponseHeaders({
      filename: artifact.filename,
      reportRenderVersion: artifact.reportRenderVersion,
    }),
    renderCtx,
    pageCountEstimate: artifact.pageCountEstimate,
  };
}
