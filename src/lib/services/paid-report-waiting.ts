/** Report waits for paid AI — not a customer-visible failure. */
export const PAID_REPORT_WAITING_ERROR_CODE = "WAITING_FOR_AI" as const;

export function isReportWaitingForAi(input: {
  generationStatus: string;
  errorCode?: string | null;
}): boolean {
  return (
    input.generationStatus === "PENDING" &&
    input.errorCode === PAID_REPORT_WAITING_ERROR_CODE
  );
}
