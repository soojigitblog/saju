/** Production dry-run orders — distinguish from real customer deposits. */
export const QA_DRY_RUN_DEPOSITOR_PREFIX = "QA-" as const;

export function isQaDryRunDepositor(
  depositorName: string | null | undefined
): boolean {
  const t = (depositorName ?? "").trim().toUpperCase();
  return t.startsWith(QA_DRY_RUN_DEPOSITOR_PREFIX);
}
