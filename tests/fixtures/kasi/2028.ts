import type { KasiSolarTermYearFixture, KasiTerm } from "./types";

/** Source-of-truth year for this file — do not mix other years here. */
export const KASI_YEAR = 2028 as const;

/**
 * Sanity fixture: 2028 입춘 must NOT be copied into 2026 fixtures.
 * (PHASE 3.1 regression: 16:31 was wrongly used as 2026 입춘.)
 */
export const KASI_2028_LICHUN: KasiTerm = {
  name: "입춘",
  year: KASI_YEAR,
  month: 2,
  day: 4,
  hour: 16,
  minute: 31,
  timezone: "Asia/Seoul",
};

export const KASI_2028: KasiSolarTermYearFixture = {
  meta: {
    source: "KASI",
    sourceType: "calendar-data",
    year: KASI_YEAR,
    timezone: "Asia/Seoul",
    verifiedAt: "2026-08-20",
    referenceNote:
      "KASI 달력자료 year=2028 — 입춘 16:31 KST sanity only (guards year mix-up with 2026).",
  },
  jieTerms: [KASI_2028_LICHUN],
};
