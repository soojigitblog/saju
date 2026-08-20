import type { KasiSolarTermYearFixture, KasiTerm } from "./types";

/** Source-of-truth year for this file — do not mix other years here. */
export const KASI_YEAR = 2026 as const;

const TZ = "Asia/Seoul" as const;

/** Full 24절기 — KASI 2026 official calendar data (KST, minute precision). */
export const KASI_2026_ALL_TERMS: readonly KasiTerm[] = [
  { name: "소한", year: KASI_YEAR, month: 1, day: 5, hour: 17, minute: 23, timezone: TZ },
  { name: "대한", year: KASI_YEAR, month: 1, day: 20, hour: 10, minute: 45, timezone: TZ },
  { name: "입춘", year: KASI_YEAR, month: 2, day: 4, hour: 5, minute: 2, timezone: TZ },
  { name: "우수", year: KASI_YEAR, month: 2, day: 19, hour: 0, minute: 52, timezone: TZ },
  { name: "경칩", year: KASI_YEAR, month: 3, day: 5, hour: 22, minute: 59, timezone: TZ },
  { name: "춘분", year: KASI_YEAR, month: 3, day: 20, hour: 23, minute: 46, timezone: TZ },
  { name: "청명", year: KASI_YEAR, month: 4, day: 5, hour: 3, minute: 40, timezone: TZ },
  { name: "곡우", year: KASI_YEAR, month: 4, day: 20, hour: 10, minute: 39, timezone: TZ },
  { name: "입하", year: KASI_YEAR, month: 5, day: 5, hour: 20, minute: 49, timezone: TZ },
  { name: "소만", year: KASI_YEAR, month: 5, day: 21, hour: 9, minute: 37, timezone: TZ },
  { name: "망종", year: KASI_YEAR, month: 6, day: 6, hour: 0, minute: 48, timezone: TZ },
  { name: "하지", year: KASI_YEAR, month: 6, day: 21, hour: 17, minute: 25, timezone: TZ },
  { name: "소서", year: KASI_YEAR, month: 7, day: 7, hour: 10, minute: 57, timezone: TZ },
  { name: "대서", year: KASI_YEAR, month: 7, day: 23, hour: 4, minute: 13, timezone: TZ },
  { name: "입추", year: KASI_YEAR, month: 8, day: 7, hour: 20, minute: 43, timezone: TZ },
  { name: "처서", year: KASI_YEAR, month: 8, day: 23, hour: 11, minute: 19, timezone: TZ },
  { name: "백로", year: KASI_YEAR, month: 9, day: 7, hour: 23, minute: 41, timezone: TZ },
  { name: "추분", year: KASI_YEAR, month: 9, day: 23, hour: 9, minute: 5, timezone: TZ },
  { name: "한로", year: KASI_YEAR, month: 10, day: 8, hour: 15, minute: 29, timezone: TZ },
  { name: "상강", year: KASI_YEAR, month: 10, day: 23, hour: 18, minute: 38, timezone: TZ },
  { name: "입동", year: KASI_YEAR, month: 11, day: 7, hour: 18, minute: 52, timezone: TZ },
  { name: "소설", year: KASI_YEAR, month: 11, day: 22, hour: 16, minute: 23, timezone: TZ },
  { name: "대설", year: KASI_YEAR, month: 12, day: 7, hour: 11, minute: 53, timezone: TZ },
  { name: "동지", year: KASI_YEAR, month: 12, day: 22, hour: 5, minute: 50, timezone: TZ },
] as const;

const JIE_NAMES = [
  "소한",
  "입춘",
  "경칩",
  "청명",
  "입하",
  "망종",
  "소서",
  "입추",
  "백로",
  "한로",
  "입동",
  "대설",
] as const;

export const KASI_2026_JIE_TERMS: readonly KasiTerm[] = JIE_NAMES.map((name) => {
  const term = KASI_2026_ALL_TERMS.find((t) => t.name === name);
  if (!term) throw new Error(`Missing 2026 jie term: ${name}`);
  return term;
});

export const KASI_2026_LICHUN = KASI_2026_ALL_TERMS.find((t) => t.name === "입춘")!;

export const KASI_2026: KasiSolarTermYearFixture = {
  meta: {
    source: "KASI",
    sourceType: "calendar-data",
    year: KASI_YEAR,
    timezone: "Asia/Seoul",
    verifiedAt: "2026-08-20",
    referenceNote:
      "KASI 달력자료(월력요항) year=2026 — 24절기 KST. See docs/fortune-engine.md. Do NOT copy from other years (e.g. 2028 입춘 16:31).",
  },
  jieTerms: KASI_2026_JIE_TERMS,
  allTerms: KASI_2026_ALL_TERMS,
};
