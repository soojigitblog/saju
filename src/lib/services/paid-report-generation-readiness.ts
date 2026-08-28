import {
  isPaidReportGenerationEnabled,
  resolveAiProviderForPaid,
} from "@/lib/ai/config";
import {
  isReportWaitingForAi,
  PAID_REPORT_WAITING_ERROR_CODE,
} from "@/lib/services/paid-report-waiting";

export type PaidReportGenerationReadiness =
  | "AI_KEY_REQUIRED"
  | "READY_FOR_ADMIN_APPROVAL"
  | "GENERATING"
  | "COMPLETED"
  | "RETRY_NEEDED"
  | "WAITING";

export function isPaidGeminiKeyConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY_PAID?.trim());
}

export function resolvePaidReportGenerationReadiness(input: {
  generationStatus: string;
  errorCode?: string | null;
}): { code: PaidReportGenerationReadiness; label: string } {
  const { generationStatus, errorCode } = input;

  if (generationStatus === "COMPLETED") {
    return { code: "COMPLETED", label: "완료" };
  }
  if (generationStatus === "GENERATING") {
    return { code: "GENERATING", label: "생성 중" };
  }
  if (
    generationStatus === "FAILED" &&
    errorCode &&
    errorCode !== PAID_REPORT_WAITING_ERROR_CODE
  ) {
    return { code: "RETRY_NEEDED", label: "재시도 필요" };
  }
  if (isReportWaitingForAi({ generationStatus, errorCode })) {
    if (!isPaidGeminiKeyConfigured()) {
      return { code: "AI_KEY_REQUIRED", label: "AI 설정 필요" };
    }
    if (!isPaidReportGenerationEnabled()) {
      return {
        code: "READY_FOR_ADMIN_APPROVAL",
        label: "생성 준비됨 · 관리자 승인 필요",
      };
    }
    return { code: "WAITING", label: "AI 생성 대기" };
  }
  if (generationStatus === "PENDING") {
    return { code: "WAITING", label: "AI 생성 대기" };
  }
  return { code: "WAITING", label: "AI 생성 대기" };
}

export function canAdminTriggerPaidGeneration(): boolean {
  if (process.env.NODE_ENV === "test" && process.env.AI_PROVIDER_PAID === "mock") {
    return true;
  }
  if (!isPaidGeminiKeyConfigured()) return false;
  return resolveAiProviderForPaid() !== "mock";
}
