/**
 * Shared KASI solar-term fixture types.
 * Values must come from KASI calendar bulletins — never from library output.
 */

export type KasiTimezone = "Asia/Seoul";

export type KasiTerm = {
  name: string;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  timezone: KasiTimezone;
};

export type KasiSolarTermFixtureMeta = {
  source: "KASI";
  sourceType: "calendar-data";
  year: number;
  timezone: KasiTimezone;
  verifiedAt: string;
  referenceNote: string;
};

export type KasiSolarTermYearFixture = {
  meta: KasiSolarTermFixtureMeta;
  /** Month-pillar boundary 절 (12) */
  jieTerms: readonly KasiTerm[];
  /** Optional full 24절기 when recorded */
  allTerms?: readonly KasiTerm[];
};
