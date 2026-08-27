import { FreeFlowError } from "@/lib/services/free-flow-errors";

export type PaidFortuneReportKind = "money" | "career" | "love" | "total";

/** Stable product slug → report kind. Unknown slug HARD FAIL. */
const SLUG_TO_KIND: Record<string, PaidFortuneReportKind> = {
  "2026-money": "money",
  "2026-career": "career",
  "2026-love": "love",
  "2026-total": "total",
};

export function resolvePaidReportKindFromProductSlug(
  slug: string
): PaidFortuneReportKind {
  const kind = SLUG_TO_KIND[slug];
  if (!kind) {
    throw new FreeFlowError(
      "UNKNOWN_PAID_PRODUCT",
      `지원하지 않는 유료 상품입니다: ${slug}`,
      400
    );
  }
  return kind;
}

export function isKnownPaidFortuneProductSlug(slug: string): boolean {
  return slug in SLUG_TO_KIND;
}
