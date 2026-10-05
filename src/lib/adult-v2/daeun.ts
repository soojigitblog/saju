import type { FortuneChart } from "@/lib/fortune-engine/types";
import type { DaeunCalculation, DaeunPeriod } from "./types";

function parseSolarDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

function toDateString(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function addUtcCalendarParts(
  birthDate: string,
  parts: { years: number; months: number; days: number }
): string {
  const result = parseSolarDate(birthDate);
  result.setUTCFullYear(result.getUTCFullYear() + parts.years);
  result.setUTCMonth(result.getUTCMonth() + parts.months);
  result.setUTCDate(result.getUTCDate() + parts.days);
  return toDateString(result);
}

/**
 * Uses manseryeok's already-calculated luck pillars. Direction, the period
 * sequence, and start components are not recomputed or guessed here.
 *
 * The displayed startDate is a civil-date representation of the library's
 * years/months/days output (the underlying rule is three days per one year).
 */
export function calculateDaeun(chart: FortuneChart): DaeunCalculation {
  const luck = chart.luckPillars;
  if (!luck) {
    throw new Error("DAEUN_UNAVAILABLE: luck pillars were not calculated by the provider");
  }

  const startDate = addUtcCalendarParts(chart.normalizedBirth.solarDate, {
    years: luck.startYears,
    months: luck.startMonths,
    days: luck.startDays,
  });
  const startYear = Number(startDate.slice(0, 4));
  const periods: DaeunPeriod[] = luck.periods.map((period, index) => {
    const next = luck.periods[index + 1];
    const periodStartYear = startYear + index * 10;
    return {
      index: index + 1,
      ganji: period.ganji,
      stem: period.stem,
      branch: period.branch,
      startAge: period.age,
      endAge: (next?.age ?? period.age + 10) - 1,
      startYear: periodStartYear,
      endYear: periodStartYear + 9,
    };
  });

  return {
    direction: luck.forward ? "forward" : "backward",
    startAge: luck.startAge,
    startAgeExact: {
      years: luck.startYears,
      months: luck.startMonths,
      days: luck.startDays,
    },
    startDate,
    method: "manseryeok_luck_pillars",
    caveats: chart.input.birthTimeUnknown
      ? ["출생시각 미상: 만세력 계산에는 제품의 정오 KST 기준시각이 사용되었습니다."]
      : [],
    periods,
  };
}

export function daeunForYear(
  daeun: DaeunCalculation,
  year: number
): DaeunPeriod | null {
  return daeun.periods.find((period) => year >= period.startYear && year <= period.endYear) ?? null;
}
