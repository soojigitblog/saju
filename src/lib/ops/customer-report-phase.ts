import {
  isReportWaitingForAi,
  PAID_REPORT_WAITING_ERROR_CODE,
} from "@/lib/services/paid-report-waiting";

export type CustomerReportPhase =
  | "awaiting_payment"
  | "payment_confirmed_preparing"
  | "generating"
  | "ready"
  | "expired"
  | "unavailable";

export function resolveCustomerReportPhase(input: {
  orderStatus: string;
  paidAt?: string | null;
  generationStatus?: string | null;
  errorCode?: string | null;
}): CustomerReportPhase {
  const paid = Boolean(input.paidAt);
  const gen = input.generationStatus ?? null;
  const err = input.errorCode ?? null;

  if (input.orderStatus === "EXPIRED") return "expired";
  if (!paid && input.orderStatus === "PENDING") return "awaiting_payment";

  if (gen === "COMPLETED") return "ready";
  if (gen === "GENERATING") return "generating";

  if (
    paid &&
    (isReportWaitingForAi({ generationStatus: gen ?? "PENDING", errorCode: err }) ||
      gen === "PENDING" ||
      (gen === "FAILED" && err === PAID_REPORT_WAITING_ERROR_CODE) ||
      (gen === "FAILED" && err === "PAID_REPORT_LIVE_DISABLED") ||
      (gen === "FAILED" && err === "PAID_GENERATION_DISABLED"))
  ) {
    return "payment_confirmed_preparing";
  }

  if (paid) return "payment_confirmed_preparing";
  return "unavailable";
}

export function customerReportPhaseLabel(phase: CustomerReportPhase): string {
  switch (phase) {
    case "awaiting_payment":
      return "입금 대기";
    case "payment_confirmed_preparing":
      return "결제 확인됨 · 리포트 준비 중";
    case "generating":
      return "리포트 생성 중";
    case "ready":
      return "리포트 준비 완료";
    case "expired":
      return "입금 기한 만료";
    default:
      return "주문 확인 중";
  }
}
