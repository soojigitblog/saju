import {
  calculateFourPillars,
  getSolarTermsOfYear,
  lunarToSolar,
  solarToLunar,
} from "manseryeok";
import { formatLocalDate } from "../normalize/birth-input";
import { pillarFromHanjaGanji } from "../calculators/pillars";
import { FortuneEngineError } from "../types";
import type { CalendarProvider, ProviderPillarsResult } from "./provider";
import { PROVIDER_NAME, PROVIDER_VERSION } from "../version";
import type { FortuneEngineConfig, LocalDateParts } from "../types";

function toKstIso(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}+09:00`;
}

function findAdjacentTerms(solar: LocalDateParts, at: Date) {
  const years = [solar.year - 1, solar.year, solar.year + 1];
  const terms: { name: string; at: Date; atKst: string }[] = [];

  for (const y of years) {
    try {
      for (const term of getSolarTermsOfYear(y)) {
        terms.push({
          name: term.name,
          at: term.date,
          atKst: toKstIso(term.date),
        });
      }
    } catch {
      // out of table
    }
  }

  terms.sort((a, b) => a.at.getTime() - b.at.getTime());
  let previous: { name: string; atKst: string } | null = null;
  let next: { name: string; atKst: string } | null = null;

  for (const term of terms) {
    if (term.at.getTime() <= at.getTime()) {
      previous = { name: term.name, atKst: term.atKst };
    } else {
      next = { name: term.name, atKst: term.atKst };
      break;
    }
  }

  return { previous, next };
}

function resolveSolarInstant(parts: {
  date: LocalDateParts;
  hour: number;
  minute: number;
}): Date {
  const iso = `${formatLocalDate(parts.date)}T${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}:00+09:00`;
  return new Date(iso);
}

export const manseryeokProvider: CalendarProvider = {
  name: PROVIDER_NAME,
  version: PROVIDER_VERSION,

  computePillars(input): ProviderPillarsResult {
    const warnings: string[] = [];
    const { config } = input;

    assertYearInProductRange(input.date.year, config);

    let solarDate = input.date;
    let lunarMeta = {
      year: input.date.year,
      month: input.date.month,
      day: input.date.day,
      isLeapMonth: false,
    };

    try {
      if (input.calendarType === "lunar") {
        const solar = lunarToSolar(
          input.date.year,
          input.date.month,
          input.date.day,
          input.lunarLeapMonth
        );
        solarDate = { year: solar.year, month: solar.month, day: solar.day };
        lunarMeta = {
          year: input.date.year,
          month: input.date.month,
          day: input.date.day,
          isLeapMonth: input.lunarLeapMonth,
        };
      } else {
        const lunar = solarToLunar(
          input.date.year,
          input.date.month,
          input.date.day
        );
        lunarMeta = {
          year: lunar.year,
          month: lunar.month,
          day: lunar.day,
          isLeapMonth: lunar.isLeapMonth,
        };
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "calendar conversion failed";
      if (input.calendarType === "lunar") {
        if (input.lunarLeapMonth) {
          throw new FortuneEngineError("INVALID_LEAP_MONTH", message);
        }
        throw new FortuneEngineError("INVALID_LUNAR_DATE", message);
      }
      throw new FortuneEngineError("INVALID_SOLAR_DATE", message);
    }

    let detail;
    try {
      detail = calculateFourPillars({
        year:
          input.calendarType === "lunar" ? input.date.year : solarDate.year,
        month:
          input.calendarType === "lunar" ? input.date.month : solarDate.month,
        day: input.calendarType === "lunar" ? input.date.day : solarDate.day,
        hour: input.time.hour,
        minute: input.time.minute,
        isLunar: input.calendarType === "lunar",
        isLeapMonth: input.lunarLeapMonth,
        dayBoundary: "midnight",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "calculation failed";
      throw new FortuneEngineError("CALCULATION_FAILED", message);
    }

    const hanja = detail.toHanjaObject();
    const year = pillarFromHanjaGanji(hanja.year.hanja);
    const month = pillarFromHanjaGanji(hanja.month.hanja);
    const day = pillarFromHanjaGanji(hanja.day.hanja);
    const hourPillar = input.birthTimeUnknown
      ? null
      : pillarFromHanjaGanji(hanja.hour.hanja);

    if (input.birthTimeUnknown) {
      warnings.push(
        "birth_time_unknown: hour pillar omitted; day/month/year computed with effective time 12:00 KST"
      );
    }

    const instant = resolveSolarInstant({
      date: solarDate,
      hour: input.time.hour,
      minute: input.time.minute,
    });

    return {
      year,
      month,
      day,
      hour: hourPillar,
      solarDate,
      lunarDate: lunarMeta,
      solarTerms: findAdjacentTerms(solarDate, instant),
      warnings,
    };
  },
};

function assertYearInProductRange(year: number, config: FortuneEngineConfig) {
  if (year < config.minYear || year > config.maxYear) {
    throw new FortuneEngineError(
      "UNSUPPORTED_DATE_RANGE",
      `Supported years: ${config.minYear}–${config.maxYear}`
    );
  }
}
