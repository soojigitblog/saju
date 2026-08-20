import type { BranchInfo, FortuneEngineConfig, StemInfo } from "./types";
import { FORTUNE_RELEASE_MANIFEST } from "./release-manifest";

export const DEFAULT_ENGINE_CONFIG: FortuneEngineConfig = {
  yearBoundary: FORTUNE_RELEASE_MANIFEST.conventions.yearBoundary,
  monthBoundary: FORTUNE_RELEASE_MANIFEST.conventions.monthBoundary,
  dayBoundary: FORTUNE_RELEASE_MANIFEST.conventions.dayBoundary,
  ziHourStart: FORTUNE_RELEASE_MANIFEST.conventions.ziHourStart,
  timeCorrection: FORTUNE_RELEASE_MANIFEST.conventions.timeCorrection,
  timezone: FORTUNE_RELEASE_MANIFEST.conventions.timezone,
  countryCode: FORTUNE_RELEASE_MANIFEST.conventions.countryCode,
  minYear: FORTUNE_RELEASE_MANIFEST.supportYear.min,
  maxYear: FORTUNE_RELEASE_MANIFEST.supportYear.max,
};

export const SUPPORT_YEAR_MIN = FORTUNE_RELEASE_MANIFEST.supportYear.min;
export const SUPPORT_YEAR_MAX = FORTUNE_RELEASE_MANIFEST.supportYear.max;

export const STEMS: readonly StemInfo[] = [
  { index: 0, hanja: "甲", hangul: "갑", element: "wood", yinYang: "yang" },
  { index: 1, hanja: "乙", hangul: "을", element: "wood", yinYang: "yin" },
  { index: 2, hanja: "丙", hangul: "병", element: "fire", yinYang: "yang" },
  { index: 3, hanja: "丁", hangul: "정", element: "fire", yinYang: "yin" },
  { index: 4, hanja: "戊", hangul: "무", element: "earth", yinYang: "yang" },
  { index: 5, hanja: "己", hangul: "기", element: "earth", yinYang: "yin" },
  { index: 6, hanja: "庚", hangul: "경", element: "metal", yinYang: "yang" },
  { index: 7, hanja: "辛", hangul: "신", element: "metal", yinYang: "yin" },
  { index: 8, hanja: "壬", hangul: "임", element: "water", yinYang: "yang" },
  { index: 9, hanja: "癸", hangul: "계", element: "water", yinYang: "yin" },
] as const;

/** 지지 + 본기(mainStemIndex) */
export const BRANCHES: readonly BranchInfo[] = [
  { index: 0, hanja: "子", hangul: "자", element: "water", yinYang: "yang", mainStemIndex: 9 },
  { index: 1, hanja: "丑", hangul: "축", element: "earth", yinYang: "yin", mainStemIndex: 5 },
  { index: 2, hanja: "寅", hangul: "인", element: "wood", yinYang: "yang", mainStemIndex: 0 },
  { index: 3, hanja: "卯", hangul: "묘", element: "wood", yinYang: "yin", mainStemIndex: 1 },
  { index: 4, hanja: "辰", hangul: "진", element: "earth", yinYang: "yang", mainStemIndex: 4 },
  { index: 5, hanja: "巳", hangul: "사", element: "fire", yinYang: "yin", mainStemIndex: 2 },
  { index: 6, hanja: "午", hangul: "오", element: "fire", yinYang: "yang", mainStemIndex: 3 },
  { index: 7, hanja: "未", hangul: "미", element: "earth", yinYang: "yin", mainStemIndex: 5 },
  { index: 8, hanja: "申", hangul: "신", element: "metal", yinYang: "yang", mainStemIndex: 6 },
  { index: 9, hanja: "酉", hangul: "유", element: "metal", yinYang: "yin", mainStemIndex: 7 },
  { index: 10, hanja: "戌", hangul: "술", element: "earth", yinYang: "yang", mainStemIndex: 4 },
  { index: 11, hanja: "亥", hangul: "해", element: "water", yinYang: "yin", mainStemIndex: 8 },
] as const;

export const SOLAR_TERM_NAMES_KO = [
  "소한",
  "대한",
  "입춘",
  "우수",
  "경칩",
  "춘분",
  "청명",
  "곡우",
  "입하",
  "소만",
  "망종",
  "하지",
  "소서",
  "대서",
  "입추",
  "처서",
  "백로",
  "추분",
  "한로",
  "상강",
  "입동",
  "소설",
  "대설",
  "동지",
] as const;

/** 12 절(節) used for month-pillar transitions */
export const JIE_SOLAR_TERM_NAMES = [
  "소한",
  "입춘",
  "경칩",
  "청명",
  "입하",
  "망종",
  "소서",
  "입추",
  "백로",
  "한로",
  "입동",
  "대설",
] as const;

export function stemByHanja(hanja: string): StemInfo {
  const found = STEMS.find((s) => s.hanja === hanja);
  if (!found) throw new Error(`Unknown stem hanja: ${hanja}`);
  return found;
}

export function stemByHangul(hangul: string): StemInfo {
  const found = STEMS.find((s) => s.hangul === hangul);
  if (!found) throw new Error(`Unknown stem hangul: ${hangul}`);
  return found;
}

export function branchByHanja(hanja: string): BranchInfo {
  const found = BRANCHES.find((b) => b.hanja === hanja);
  if (!found) throw new Error(`Unknown branch hanja: ${hanja}`);
  return found;
}

export function branchByHangul(hangul: string): BranchInfo {
  const found = BRANCHES.find((b) => b.hangul === hangul);
  if (!found) throw new Error(`Unknown branch hangul: ${hangul}`);
  return found;
}
