import { calculateFourPillars, getSolarTerm } from "manseryeok";
import { pillarFromHanjaGanji } from "@/lib/fortune-engine/calculators/pillars";
import type { AnnualFortune } from "./types";

function kstParts(instant: Date) {
  const fields = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const value = (type: string) => Number(fields.find((field) => field.type === type)?.value ?? "0");
  return { year: value("year"), month: value("month"), day: value("day"), hour: value("hour"), minute: value("minute") };
}

function toKstIso(instant: Date): string {
  const parts = kstParts(instant);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}T${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}:00+09:00`;
}

/**
 * Se-un is anchored to that calendar year's exact Lichun instant. One minute
 * is added only to select the post-boundary pillar unambiguously; the reported
 * startsAtKst remains the unmodified library-provided boundary.
 */
export function calculateAnnualFortune(year: number): AnnualFortune {
  const lichun = getSolarTerm(year, 2);
  const postBoundary = kstParts(new Date(lichun.date.getTime() + 60_000));
  const detail = calculateFourPillars({
    ...postBoundary,
    dayBoundary: "midnight",
  });
  const hanja = detail.toHanjaObject().year.hanja;
  return {
    year,
    pillar: pillarFromHanjaGanji(hanja),
    startsAtKst: toKstIso(lichun.date),
    method: "manseryeok_lichun_year_pillar",
  };
}
