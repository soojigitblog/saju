import { countVisibleFiveElements } from "./calculators/five-elements";
import { buildTenGodsChart } from "./calculators/ten-gods";
import { resolveEngineConfig } from "./config";
import { buildCalculationHash } from "./hash";
import { formatLocalDate, normalizeBirthInput } from "./normalize/birth-input";
import { manseryeokProvider } from "./providers/manseryeok-provider";
import type { CalendarProvider } from "./providers/provider";
import type {
  BirthInput,
  FortuneChart,
  FortuneEngine,
  FortuneEngineConfig,
} from "./types";
import { assertValidChart } from "./validators/chart-validator";
import {
  FORTUNE_ENGINE_NAME,
  FORTUNE_ENGINE_VERSION,
} from "./version";
import { FORTUNE_RELEASE_MANIFEST } from "./release-manifest";

export function createFortuneEngine(options?: {
  config?: Partial<FortuneEngineConfig>;
  provider?: CalendarProvider;
}): FortuneEngine {
  const config = resolveEngineConfig(options?.config);
  const provider = options?.provider ?? manseryeokProvider;

  return {
    calculate(input: BirthInput): FortuneChart {
      const normalized = normalizeBirthInput({
        ...input,
        timezone: input.timezone || config.timezone,
        countryCode: input.countryCode || config.countryCode,
      });

      const pillarsResult = provider.computePillars({
        calendarType: normalized.calendarType,
        date: normalized.rawDate,
        time: normalized.effectiveTime,
        birthTimeUnknown: normalized.birthTimeUnknown,
        gender: normalized.gender,
        lunarLeapMonth: normalized.lunarLeapMonth,
        config,
      });

      const pillars = {
        year: pillarsResult.year,
        month: pillarsResult.month,
        day: pillarsResult.day,
        hour: pillarsResult.hour,
      };

      const dayMaster = pillars.day.stem;
      const fiveElements = countVisibleFiveElements([
        pillars.year,
        pillars.month,
        pillars.day,
        pillars.hour,
      ]);
      const tenGods = buildTenGodsChart(dayMaster, pillars);

      const chart: FortuneChart = {
        engine: {
          name: FORTUNE_ENGINE_NAME,
          version: FORTUNE_ENGINE_VERSION,
          provider: provider.name,
          providerVersion: provider.version,
          calculatedAt: new Date().toISOString(),
          calculationHash: buildCalculationHash(input, config),
        },
        input: {
          gender: normalized.gender,
          calendarType: normalized.calendarType,
          birthDate: formatLocalDate(normalized.rawDate),
          birthTime: normalized.rawTime
            ? `${String(normalized.rawTime.hour).padStart(2, "0")}:${String(normalized.rawTime.minute).padStart(2, "0")}`
            : null,
          birthTimeUnknown: normalized.birthTimeUnknown,
          lunarLeapMonth: normalized.lunarLeapMonth,
          timezone: normalized.timezone,
          countryCode: normalized.countryCode,
        },
        normalizedBirth: {
          solarDate: formatLocalDate(pillarsResult.solarDate),
          lunarDate: formatLocalDate(pillarsResult.lunarDate),
          lunarLeapMonth: pillarsResult.lunarDate.isLeapMonth,
          solarTime: normalized.rawTime
            ? `${String(normalized.rawTime.hour).padStart(2, "0")}:${String(normalized.rawTime.minute).padStart(2, "0")}`
            : null,
        },
        conventions: {
          yearBoundary: config.yearBoundary,
          monthBoundary: config.monthBoundary,
          dayBoundary: config.dayBoundary,
          dayBoundaryConvention: config.dayBoundary,
          ziHourStart: config.ziHourStart,
          timeCorrection: config.timeCorrection,
          timezone: config.timezone,
          solarTermBoundaryRule: FORTUNE_RELEASE_MANIFEST.solarTermBoundaryRule,
        },
        pillars,
        dayMaster,
        fiveElements,
        tenGods,
        solarTerms: pillarsResult.solarTerms,
        luckPillars: pillarsResult.luckPillars,
        warnings: pillarsResult.warnings,
      };

      assertValidChart(chart);
      return chart;
    },
  };
}

export const fortuneEngine = createFortuneEngine();
