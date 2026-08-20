import { createHash } from "node:crypto";
import type { BirthInput, FortuneEngineConfig } from "./types";
import { FORTUNE_RELEASE_MANIFEST } from "./release-manifest";

/**
 * Canonical SHA-256 over normalized birth + conventions + engine/provider identity.
 * Excludes: calculatedAt, nickname, profileId.
 */
export function buildCalculationHash(
  input: BirthInput,
  config: FortuneEngineConfig
): string {
  const canonical = JSON.stringify({
    engineName: FORTUNE_RELEASE_MANIFEST.engineName,
    engineVersion: FORTUNE_RELEASE_MANIFEST.engineVersion,
    providerName: FORTUNE_RELEASE_MANIFEST.provider.name,
    providerVersion: FORTUNE_RELEASE_MANIFEST.provider.version,
    conventions: {
      yearBoundary: config.yearBoundary,
      monthBoundary: config.monthBoundary,
      dayBoundary: config.dayBoundary,
      ziHourStart: config.ziHourStart,
      timeCorrection: config.timeCorrection,
      timezone: config.timezone,
      solarTermBoundaryRule: FORTUNE_RELEASE_MANIFEST.solarTermBoundaryRule,
    },
    normalizedBirth: {
      gender: input.gender,
      calendarType: input.calendarType,
      birthDate: input.birthDate,
      birthTime: input.birthTimeUnknown ? null : input.birthTime,
      birthTimeUnknown: input.birthTimeUnknown,
      lunarLeapMonth: Boolean(input.lunarLeapMonth),
      timezone: input.timezone,
      countryCode: input.countryCode,
    },
  });

  return createHash("sha256").update(canonical).digest("hex");
}
