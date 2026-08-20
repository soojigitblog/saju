import type { KasiSolarTermYearFixture, KasiTerm } from "./types";

/** Source-of-truth year for this file — do not mix other years here. */
export const KASI_YEAR = 2024 as const;

const LICHUN: KasiTerm = {
  name: "입춘",
  year: KASI_YEAR,
  month: 2,
  day: 4,
  hour: 17,
  minute: 27,
  timezone: "Asia/Seoul",
};

/**
 * 2024 KASI-aligned 입춘 (minute match also cited in manseryeok CHANGELOG).
 * Full 12-절 bulletin not required for regression; 입춘 alone guards year mix-up.
 */
export const KASI_2024: KasiSolarTermYearFixture = {
  meta: {
    source: "KASI",
    sourceType: "calendar-data",
    year: KASI_YEAR,
    timezone: "Asia/Seoul",
    verifiedAt: "2026-08-20",
    referenceNote:
      "KASI 달력자료(월력요항) year=2024 — 입춘 17:27 KST. See docs/fortune-engine.md",
  },
  jieTerms: [LICHUN],
};

/** @deprecated Prefer KASI_2024.jieTerms[0] */
export const KASI_2024_LICHUN = LICHUN;
