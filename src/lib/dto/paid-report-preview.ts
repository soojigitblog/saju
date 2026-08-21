import type { PaidFortuneReport } from "@/lib/ai/schemas/paid-report";
import { formatFortuneEvidenceForDisplay } from "@/lib/presentation/format-evidence-label";

/** View model for paid report quality preview (no order required). */
export type PaidReportPreviewDTO = {
  id: string;
  orderNo: string;
  nickname: string;
  productName: string;
  headline: string;
  summary: string;
  keywords: string[];
  chapters: Array<{
    number: string;
    title: string;
    summary: string;
    body: string;
    evidence: string[];
    cautions: string[];
  }>;
  monthlyOutlook?: Array<{
    month: number;
    title: string;
    summary: string;
    detail: string;
    focus?: string[];
  }>;
  actionGuide: string[];
  evidence: string[];
  disclaimer: string;
  meta: {
    provider: string;
    model: string;
    preview: true;
  };
};

export function toPaidReportPreviewDTO(input: {
  report: PaidFortuneReport;
  nickname: string;
  productName: string;
  previewId: string;
  provider: string;
  model: string;
}): PaidReportPreviewDTO {
  const { report } = input;
  return {
    id: input.previewId,
    orderNo: "PREVIEW-NO-PAYMENT",
    nickname: input.nickname,
    productName: input.productName,
    headline: report.title,
    summary: report.executiveSummary,
    keywords: report.keywords,
    chapters: report.sections.map((s, i) => ({
      number: String(i + 1).padStart(2, "0"),
      title: s.title,
      summary: s.summary,
      body: s.detail,
      evidence: formatFortuneEvidenceForDisplay(s.evidence),
      cautions: s.cautions,
    })),
    monthlyOutlook: report.monthlyOutlook?.map((m) => ({
      month: m.month,
      title: m.title,
      summary: m.summary,
      detail: m.detail,
      focus: m.focus,
    })),
    actionGuide: report.actionGuide,
    evidence: formatFortuneEvidenceForDisplay(report.evidence),
    disclaimer: report.disclaimer,
    meta: {
      provider: input.provider,
      model: input.model,
      preview: true,
    },
  };
}
