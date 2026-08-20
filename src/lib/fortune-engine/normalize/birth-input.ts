import { DEFAULT_ENGINE_CONFIG } from "../constants";
import {
  FortuneEngineError,
  type BirthInput,
  type LocalDateParts,
  type LocalTimeParts,
} from "../types";

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^(\d{2}):(\d{2})$/;

export function parseLocalDate(isoDate: string): LocalDateParts {
  const match = DATE_RE.exec(isoDate);
  if (!match) {
    throw new FortuneEngineError(
      "INVALID_INPUT",
      "birthDate must be YYYY-MM-DD"
    );
  }
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

export function parseLocalTime(isoTime: string): LocalTimeParts {
  const match = TIME_RE.exec(isoTime);
  if (!match) {
    throw new FortuneEngineError(
      "INVALID_BIRTH_TIME",
      "birthTime must be HH:mm"
    );
  }
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw new FortuneEngineError("INVALID_BIRTH_TIME", "birthTime out of range");
  }
  return { hour, minute };
}

export function formatLocalDate(parts: LocalDateParts): string {
  return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function formatLocalTime(parts: LocalTimeParts): string {
  return `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
}

/** Civil Gregorian existence check without Date timezone shifts. */
export function isValidGregorianDate(parts: LocalDateParts): boolean {
  const { year, month, day } = parts;
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const lengths = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= lengths[month - 1];
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export type NormalizedBirthInput = {
  gender: BirthInput["gender"];
  calendarType: BirthInput["calendarType"];
  lunarLeapMonth: boolean;
  birthTimeUnknown: boolean;
  timezone: string;
  countryCode: string;
  rawDate: LocalDateParts;
  rawTime: LocalTimeParts | null;
  /** Time used for pillar calc when unknown: 12:00 (non-boundary) — hour pillar still null */
  effectiveTime: LocalTimeParts;
};

export function normalizeBirthInput(input: BirthInput): NormalizedBirthInput {
  if (input.gender !== "male" && input.gender !== "female") {
    throw new FortuneEngineError("INVALID_GENDER", "gender must be male or female");
  }

  if (input.timezone !== DEFAULT_ENGINE_CONFIG.timezone) {
    // MVP only supports Asia/Seoul explicitly
    if (input.timezone !== "Asia/Seoul") {
      throw new FortuneEngineError(
        "INVALID_TIMEZONE",
        "Only Asia/Seoul is supported in MVP"
      );
    }
  }

  const rawDate = parseLocalDate(input.birthDate);
  if (rawDate.year < DEFAULT_ENGINE_CONFIG.minYear || rawDate.year > DEFAULT_ENGINE_CONFIG.maxYear) {
    throw new FortuneEngineError(
      "UNSUPPORTED_DATE_RANGE",
      `Supported years: ${DEFAULT_ENGINE_CONFIG.minYear}–${DEFAULT_ENGINE_CONFIG.maxYear}`
    );
  }

  if (input.calendarType === "solar") {
    if (!isValidGregorianDate(rawDate)) {
      throw new FortuneEngineError("INVALID_SOLAR_DATE", "Invalid solar date");
    }
  }

  if (input.calendarType === "lunar" && input.lunarLeapMonth == null) {
    // default false but UI should send explicitly; allow false default
  }

  const lunarLeapMonth =
    input.calendarType === "lunar" ? Boolean(input.lunarLeapMonth) : false;

  if (input.calendarType === "solar" && input.lunarLeapMonth) {
    throw new FortuneEngineError(
      "INVALID_INPUT",
      "lunarLeapMonth is only valid for lunar calendar"
    );
  }

  let rawTime: LocalTimeParts | null = null;
  if (input.birthTimeUnknown) {
    if (input.birthTime != null) {
      throw new FortuneEngineError(
        "INVALID_BIRTH_TIME",
        "birthTime must be null when birthTimeUnknown is true"
      );
    }
  } else {
    if (!input.birthTime) {
      throw new FortuneEngineError(
        "INVALID_BIRTH_TIME",
        "birthTime is required when birthTimeUnknown is false"
      );
    }
    rawTime = parseLocalTime(input.birthTime);
  }

  const effectiveTime = rawTime ?? { hour: 12, minute: 0 };

  return {
    gender: input.gender,
    calendarType: input.calendarType,
    lunarLeapMonth,
    birthTimeUnknown: input.birthTimeUnknown,
    timezone: input.timezone,
    countryCode: input.countryCode || DEFAULT_ENGINE_CONFIG.countryCode,
    rawDate,
    rawTime,
    effectiveTime,
  };
}
