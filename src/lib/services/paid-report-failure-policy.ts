import "server-only";

/** Pre-live / policy blocks — not operational AI failures. */
export const PAID_REPORT_NON_ALERT_ERROR_CODES = [
  "PAID_REPORT_LIVE_DISABLED",
  "CUSTOMER_MOCK_PROVIDER_FORBIDDEN",
] as const;

export type PaidReportNonAlertErrorCode =
  (typeof PAID_REPORT_NON_ALERT_ERROR_CODES)[number];

export function isPaidReportOperationalFailure(
  errorCode: string | null | undefined
): boolean {
  if (!errorCode) return false;
  return !(
    PAID_REPORT_NON_ALERT_ERROR_CODES as readonly string[]
  ).includes(errorCode);
}

export function shouldNotifyPaidReportFailure(
  errorCode: string | null | undefined
): boolean {
  return isPaidReportOperationalFailure(errorCode);
}

export function shouldTrackPaidReportFailureAnalytics(
  errorCode: string | null | undefined
): boolean {
  return isPaidReportOperationalFailure(errorCode);
}
