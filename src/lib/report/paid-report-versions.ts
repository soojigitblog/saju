/** Consulting interpretation pipeline version — stamped on new paid generations only. */
export const INTERPRETATION_VERSION_CONSULTING = "consulting-v1" as const;

/** Consulting PDF renderer version — stamped on new paid generations only. */
export const REPORT_RENDER_VERSION_CONSULTING = "consulting-pdf-v1" as const;

export function isConsultingReportRenderVersion(
  version: string | undefined | null
): boolean {
  return version === REPORT_RENDER_VERSION_CONSULTING;
}
