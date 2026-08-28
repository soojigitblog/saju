import {
  isReportWaitingForAi,
  PAID_REPORT_WAITING_ERROR_CODE,
} from "@/lib/services/paid-report-waiting";

/** Pre-live / policy blocks — not operational AI failures. */
export const PAID_REPORT_NON_ALERT_ERROR_CODES = [
  "PAID_REPORT_LIVE_DISABLED",
  "PAID_GENERATION_DISABLED",
  "PAID_CHECKOUT_DISABLED",
  "CUSTOMER_MOCK_PROVIDER_FORBIDDEN",
  PAID_REPORT_WAITING_ERROR_CODE,
  "PAID_AI_NOT_CONFIGURED",
] as const;

export type PaidReportNonAlertErrorCode =
  (typeof PAID_REPORT_NON_ALERT_ERROR_CODES)[number];

/** Operational failure — excludes intentional WAITING_FOR_AI queue state. */
export function isPaidReportOperationalFailure(
  errorCode: string | null | undefined,
  generationStatus?: string | null
): boolean {
  if (
    generationStatus &&
    isReportWaitingForAi({ generationStatus, errorCode })
  ) {
    return false;
  }
  if (!errorCode) return false;
  return !(
    PAID_REPORT_NON_ALERT_ERROR_CODES as readonly string[]
  ).includes(errorCode);
}

export function shouldNotifyPaidReportFailure(
  errorCode: string | null | undefined,
  generationStatus?: string | null
): boolean {
  return isPaidReportOperationalFailure(errorCode, generationStatus);
}

export function shouldTrackPaidReportFailureAnalytics(
  errorCode: string | null | undefined,
  generationStatus?: string | null
): boolean {
  return isPaidReportOperationalFailure(errorCode, generationStatus);
}
