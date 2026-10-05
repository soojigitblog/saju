import type {
  FortuneEngineConfig,
  LocalDateParts,
  LocalTimeParts,
  Pillar,
  LuckPillars,
} from "../types";

export type ProviderPillarsResult = {
  year: Pillar;
  month: Pillar;
  day: Pillar;
  hour: Pillar | null;
  solarDate: LocalDateParts;
  lunarDate: LocalDateParts & { isLeapMonth: boolean };
  solarTerms: {
    previous: { name: string; atKst: string } | null;
    next: { name: string; atKst: string } | null;
  };
  luckPillars?: LuckPillars;
  warnings: string[];
};

export type CalendarProvider = {
  readonly name: string;
  readonly version: string;
  computePillars(input: {
    calendarType: "solar" | "lunar";
    date: LocalDateParts;
    time: LocalTimeParts;
    birthTimeUnknown: boolean;
    gender: "male" | "female";
    lunarLeapMonth: boolean;
    config: FortuneEngineConfig;
  }): ProviderPillarsResult;
};
