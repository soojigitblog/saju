/**
 * Optional cross-validation vs lunar-javascript.
 * Divergences around KST vs CST solar terms / zi-stem conventions are documented — not failures.
 */
import { describe, expect, it } from "vitest";
import { Solar } from "lunar-javascript";
import { fortuneEngine } from "@/lib/fortune-engine";

type Case = {
  name: string;
  y: number;
  m: number;
  d: number;
  h: number;
  mi: number;
  expectAgree: boolean;
  note?: string;
};

const cases: Case[] = [
  { name: "agree_1992", y: 1992, m: 10, d: 24, h: 5, mi: 30, expectAgree: true },
  { name: "agree_1990", y: 1990, m: 5, d: 15, h: 14, mi: 30, expectAgree: true },
  {
    name: "lichun_minus_may_diverge",
    y: 2024,
    m: 2,
    d: 4,
    h: 17,
    mi: 26,
    expectAgree: false,
    note: "KST 입춘 17:27 — lunar-javascript often uses different term table/timezone",
  },
  {
    name: "zi_23_may_diverge_hour_stem",
    y: 2024,
    m: 3,
    d: 10,
    h: 23,
    mi: 0,
    expectAgree: false,
    note: "midnight convention hour stem vs alternate jasi stem",
  },
];

describe("cross validation manseryeok engine vs lunar-javascript", () => {
  for (const c of cases) {
    it(c.name, () => {
      const chart = fortuneEngine.calculate({
        gender: "male",
        calendarType: "solar",
        birthDate: `${c.y}-${String(c.m).padStart(2, "0")}-${String(c.d).padStart(2, "0")}`,
        birthTime: `${String(c.h).padStart(2, "0")}:${String(c.mi).padStart(2, "0")}`,
        birthTimeUnknown: false,
        timezone: "Asia/Seoul",
        countryCode: "KR",
      });

      const eight = Solar.fromYmdHms(c.y, c.m, c.d, c.h, c.mi, 0)
        .getLunar()
        .getEightChar();
      const lj = {
        year: eight.getYear(),
        month: eight.getMonth(),
        day: eight.getDay(),
        hour: eight.getTime(),
      };
      const ours = {
        year: chart.pillars.year.ganji.hanja,
        month: chart.pillars.month.ganji.hanja,
        day: chart.pillars.day.ganji.hanja,
        hour: chart.pillars.hour!.ganji.hanja,
      };

      const agree =
        ours.year === lj.year &&
        ours.month === lj.month &&
        ours.day === lj.day &&
        ours.hour === lj.hour;

      if (c.expectAgree) {
        expect(ours).toEqual(lj);
      } else {
        expect(agree).toBe(false);
      }
    });
  }
});
