import type { PaidFortuneReport } from "@/lib/ai/schemas/paid-report";
import { formatFortuneEvidenceForDisplay } from "@/lib/presentation/format-evidence-label";

export type PaidReportPreviewDTO = {
  id: string;
  orderNo: string;
  nickname: string;
  productName: string;
  headline: string;
  summary: string;
  signatureStatement?: string;
  freeBridge?: string;
  profileDashboard?: PaidFortuneReport["profileDashboard"];
  fiveElementsSnapshot?: PaidFortuneReport["fiveElementsSnapshot"];
  keywords: string[];
  chapters: Array<{
    number: string;
    title: string;
    question?: string;
    coreInsight: string;
    body: string;
    evidenceExplanation?: string[];
    evidence: string[];
    cautions?: string[];
    pullQuote?: string;
  }>;
  contradictions?: PaidFortuneReport["contradictions"];
  strengthShadows?: PaidFortuneReport["strengthShadows"];
  lifeScenes?: string[];
  actionItems: PaidFortuneReport["actionItems"];
  finalSummary: PaidFortuneReport["finalSummary"];
  evidence: string[];
  disclaimer: string;
  meta: { provider: string; model: string; preview: true };
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
    signatureStatement: report.signatureStatement,
    freeBridge: report.freeBridge ?? undefined,
    profileDashboard: report.profileDashboard,
    fiveElementsSnapshot: report.fiveElementsSnapshot,
    keywords: report.keywords,
    chapters: report.sections.map((s, i) => ({
      number: String(i + 1).padStart(2, "0"),
      title: s.title,
      question: s.question ?? undefined,
      coreInsight: s.coreInsight,
      body: [s.coreInsight, ...(s.behaviorScenes ?? [])].join("\n"),
      evidenceExplanation: s.evidenceExplanation ?? undefined,
      evidence: formatFortuneEvidenceForDisplay(s.evidence),
      cautions: s.cautions ?? undefined,
      pullQuote: s.pullQuote ?? undefined,
    })),
    contradictions: report.contradictions,
    strengthShadows: report.strengthShadows,
    lifeScenes: report.lifeScenes ?? undefined,
    actionItems: report.actionItems,
    finalSummary: report.finalSummary,
    evidence: formatFortuneEvidenceForDisplay(report.evidence),
    disclaimer: report.disclaimer,
    meta: {
      provider: input.provider,
      model: input.model,
      preview: true,
    },
  };
}
