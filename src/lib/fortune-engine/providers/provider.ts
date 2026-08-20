import type {
  FortuneEngineConfig,
  LocalDateParts,
  LocalTimeParts,
  Pillar,
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
    lunarLeapMonth: boolean;
    config: FortuneEngineConfig;
  }): ProviderPillarsResult;
};
