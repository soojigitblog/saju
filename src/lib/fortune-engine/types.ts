export type YinYang = "yang" | "yin";
export type ElementKey = "wood" | "fire" | "earth" | "metal" | "water";

export type CalendarType = "solar" | "lunar";
export type Gender = "male" | "female";

export type YearBoundary = "lichun";
export type MonthBoundary = "solar_term";
export type DayBoundary = "midnight";
export type TimeCorrection = "none";

export type FortuneEngineConfig = {
  yearBoundary: YearBoundary;
  monthBoundary: MonthBoundary;
  dayBoundary: DayBoundary;
  /** Zi hour starts at 23:00 (traditional 2h branches). */
  ziHourStart: 23;
  timeCorrection: TimeCorrection;
  timezone: string;
  countryCode: string;
  /** Inclusive supported solar year range for this product. */
  minYear: number;
  maxYear: number;
};

export type BirthInput = {
  gender: Gender;
  calendarType: CalendarType;
  /** YYYY-MM-DD in the selected calendar */
  birthDate: string;
  /** HH:mm or null when unknown */
  birthTime: string | null;
  birthTimeUnknown: boolean;
  /** Required consideration when calendarType === "lunar" */
  lunarLeapMonth?: boolean;
  timezone: string;
  countryCode: string;
  location?: {
    latitude?: number;
    longitude?: number;
  };
};

export type LocalDateParts = {
  year: number;
  month: number;
  day: number;
};

export type LocalTimeParts = {
  hour: number;
  minute: number;
};

export type StemInfo = {
  index: number;
  hanja: string;
  hangul: string;
  element: ElementKey;
  yinYang: YinYang;
};

export type BranchInfo = {
  index: number;
  hanja: string;
  hangul: string;
  element: ElementKey;
  yinYang: YinYang;
  /** 본기 천간 index (0-9) */
  mainStemIndex: number;
};

export type GanjiInfo = {
  hanja: string;
  hangul: string;
};

export type Pillar = {
  stem: StemInfo;
  branch: BranchInfo;
  ganji: GanjiInfo;
};

export type TenGodLabel =
  | "비견"
  | "겁재"
  | "식신"
  | "상관"
  | "편재"
  | "정재"
  | "편관"
  | "정관"
  | "편인"
  | "정인"
  | "일간";

export type PillarTenGods = {
  stem: TenGodLabel;
  branch: TenGodLabel;
};

/** Deterministic luck-pillar data supplied by manseryeok. No interpretation is
 * included here: V2 consumes it as calculation input only. */
export type LuckPillarPeriod = {
  age: number;
  ganji: GanjiInfo;
  stem: StemInfo;
  branch: BranchInfo;
};

export type LuckPillars = {
  forward: boolean;
  startAge: number;
  startYears: number;
  startMonths: number;
  startDays: number;
  periods: LuckPillarPeriod[];
};

export type FortuneChart = {
  engine: {
    name: string;
    version: string;
    provider: string;
    providerVersion: string;
    calculatedAt: string;
    calculationHash: string;
  };
  input: {
    gender: Gender;
    calendarType: CalendarType;
    birthDate: string;
    birthTime: string | null;
    birthTimeUnknown: boolean;
    lunarLeapMonth: boolean;
    timezone: string;
    countryCode: string;
  };
  normalizedBirth: {
    solarDate: string;
    lunarDate: string;
    lunarLeapMonth: boolean;
    solarTime: string | null;
  };
  conventions: {
    yearBoundary: YearBoundary;
    monthBoundary: MonthBoundary;
    dayBoundary: DayBoundary;
    dayBoundaryConvention: DayBoundary;
    ziHourStart: 23;
    timeCorrection: TimeCorrection;
    timezone: string;
    solarTermBoundaryRule: "gte_enters_new";
  };
  pillars: {
    year: Pillar;
    month: Pillar;
    day: Pillar;
    hour: Pillar | null;
  };
  dayMaster: StemInfo;
  fiveElements: {
    method: "visible_stems_branches_count";
    wood: number;
    fire: number;
    earth: number;
    metal: number;
    water: number;
  };
  tenGods: {
    method: "day_master_vs_stem_and_branch_main_qi";
    year: PillarTenGods;
    month: PillarTenGods;
    day: PillarTenGods;
    hour: PillarTenGods | null;
  };
  solarTerms: {
    previous: { name: string; atKst: string } | null;
    next: { name: string; atKst: string } | null;
  };
  /** Present only when a gender-supported manseryeok calculation succeeds. */
  luckPillars?: LuckPillars;
  warnings: string[];
};

export type FortuneErrorCode =
  | "INVALID_SOLAR_DATE"
  | "INVALID_LUNAR_DATE"
  | "INVALID_LEAP_MONTH"
  | "UNSUPPORTED_DATE_RANGE"
  | "INVALID_BIRTH_TIME"
  | "INVALID_TIMEZONE"
  | "INVALID_GENDER"
  | "INVALID_INPUT"
  | "CALCULATION_FAILED";

export class FortuneEngineError extends Error {
  readonly code: FortuneErrorCode;

  constructor(code: FortuneErrorCode, message: string) {
    super(message);
    this.name = "FortuneEngineError";
    this.code = code;
  }
}

export interface FortuneEngine {
  calculate(input: BirthInput): FortuneChart;
}
