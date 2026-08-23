/** Unified AM/PM ↔ 24h conversion — single source of truth for birth time UI. */

export type AmPmPeriod = "AM" | "PM";

export type BirthTimeDisplay = {
  period: AmPmPeriod;
  hour12: number; // 1–12
  minute: number; // 0–59
};

const TIME24_RE = /^(\d{2}):(\d{2})$/;

/** 24h "HH:mm" → display parts for UI. */
export function toDisplayTime(isoTime: string): BirthTimeDisplay {
  const match = TIME24_RE.exec(isoTime);
  if (!match) {
    throw new Error(`Invalid time format: ${isoTime}`);
  }
  const hour24 = Number(match[1]);
  const minute = Number(match[2]);
  if (hour24 < 0 || hour24 > 23 || minute < 0 || minute > 59) {
    throw new Error(`Time out of range: ${isoTime}`);
  }

  if (hour24 === 0) return { period: "AM", hour12: 12, minute };
  if (hour24 === 12) return { period: "PM", hour12: 12, minute };
  if (hour24 < 12) return { period: "AM", hour12: hour24, minute };
  return { period: "PM", hour12: hour24 - 12, minute };
}

/** Display parts → 24h "HH:mm" for API / DB / engine. */
export function toStorageTime(display: BirthTimeDisplay): string {
  const { period, hour12, minute } = display;
  if (hour12 < 1 || hour12 > 12 || minute < 0 || minute > 59) {
    throw new Error("Invalid display time");
  }

  let hour24: number;
  if (period === "AM") {
    hour24 = hour12 === 12 ? 0 : hour12;
  } else {
    hour24 = hour12 === 12 ? 12 : hour12 + 12;
  }

  return `${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** Human-readable Korean label for confirmation UI. */
export function formatBirthTimeKorean(isoTime: string): string {
  const { period, hour12, minute } = toDisplayTime(isoTime);
  const periodLabel = period === "AM" ? "오전" : "오후";
  const minLabel = minute === 0 ? "" : ` ${minute}분`;
  return `${periodLabel} ${hour12}시${minLabel}`;
}

export const HOUR12_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);
export const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, i) => i);
