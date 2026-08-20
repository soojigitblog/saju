/**
 * Single source of truth for Fortune Engine v1.0 release identity.
 * Do not duplicate these values elsewhere — import from here.
 */
export const FORTUNE_RELEASE_MANIFEST = {
  engineName: "fortune-engine",
  engineVersion: "1.0.0",
  provider: {
    name: "manseryeok",
    version: "2.0.0",
  },
  conventions: {
    yearBoundary: "lichun" as const,
    monthBoundary: "solar_term" as const,
    dayBoundary: "midnight" as const,
    ziHourStart: 23 as const,
    timeCorrection: "none" as const,
    timezone: "Asia/Seoul",
    countryCode: "KR",
  },
  /**
   * Solar-term / lichun month-year boundary rule used by the engine provider path:
   * birthInstant < termInstant  → still previous period
   * birthInstant >= termInstant → enters the new solar-term period
   */
  solarTermBoundaryRule: "gte_enters_new" as const,
  supportYear: {
    min: 1900,
    max: 2050,
  },
} as const;

export type FortuneReleaseManifest = typeof FORTUNE_RELEASE_MANIFEST;
