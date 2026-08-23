import { describe, expect, it } from "vitest";
import {
  formatBirthTimeKorean,
  toDisplayTime,
  toStorageTime,
} from "@/lib/birth-time/am-pm";
import { parseLocalTime } from "@/lib/fortune-engine/normalize/birth-input";
import { fortuneEngine } from "@/lib/fortune-engine";

describe("birth time AM/PM conversion", () => {
  const cases: Array<{ label: string; storage: string; period: "AM" | "PM"; hour12: number }> = [
    { label: "오전 1:00", storage: "01:00", period: "AM", hour12: 1 },
    { label: "오후 1:00", storage: "13:00", period: "PM", hour12: 1 },
    { label: "오전 12:00", storage: "00:00", period: "AM", hour12: 12 },
    { label: "오후 12:00", storage: "12:00", period: "PM", hour12: 12 },
    { label: "오전 11:59", storage: "11:59", period: "AM", hour12: 11 },
    { label: "오후 11:59", storage: "23:59", period: "PM", hour12: 11 },
  ];

  it.each(cases)("round-trips $label ($storage)", ({ storage, period, hour12 }) => {
    const display = toDisplayTime(storage);
    expect(display.period).toBe(period);
    expect(display.hour12).toBe(hour12);
    expect(toStorageTime(display)).toBe(storage);
    expect(formatBirthTimeKorean(storage)).toContain(period === "AM" ? "오전" : "오후");
  });

  it("engine parseLocalTime matches storage values", () => {
    for (const { storage } of cases) {
      const parsed = parseLocalTime(storage);
      const [h, m] = storage.split(":").map(Number);
      expect(parsed.hour).toBe(h);
      expect(parsed.minute).toBe(m);
    }
  });

  it("fortune engine accepts converted times end-to-end", () => {
    const chart = fortuneEngine.calculate({
      gender: "female",
      calendarType: "solar",
      birthDate: "1993-01-26",
      birthTime: toStorageTime({ period: "PM", hour12: 7, minute: 31 }),
      birthTimeUnknown: false,
      timezone: "Asia/Seoul",
      countryCode: "KR",
    });
    expect(chart.pillars.hour).toBeTruthy();
    expect(chart.pillars.hour?.stem).toBeTruthy();
  });
});
