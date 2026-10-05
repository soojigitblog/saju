/**
 * Provider-contract snapshots from manseryeok@2.0.0, fixed so a provider
 * upgrade cannot silently alter the V2 calculation contract. Natal pillars
 * are independently cross-checked in fortune-cases.json where its source says
 * so. Exact luck-age accuracy remains a vendor-dependency assertion until a
 * separate Korean manseryeok reference is licensed/added.
 */
export const ADULT_V2_EXTERNAL_DAEUN_VALIDATION =
  "EXTERNAL_VALIDATION_PENDING" as const;

export const adultV2ReferenceCases = [
  {
    name: "1992 male / yang year / forward luck pillars",
    input: {
      gender: "male" as const,
      calendarType: "solar" as const,
      birthDate: "1992-10-24",
      birthTime: "05:30",
      birthTimeUnknown: false,
      timezone: "Asia/Seoul",
      countryCode: "KR",
    },
    expected: {
      pillars: ["壬申", "庚戌", "癸酉", "乙卯"],
      direction: "forward",
      startAge: 5,
      startDate: "1997-07-31",
      first: "辛亥",
      second: "壬子",
      third: "癸丑",
    },
  },
  {
    name: "1992 female / yang year / backward luck pillars",
    input: {
      gender: "female" as const,
      calendarType: "solar" as const,
      birthDate: "1992-10-24",
      birthTime: "05:30",
      birthTimeUnknown: false,
      timezone: "Asia/Seoul",
      countryCode: "KR",
    },
    expected: {
      pillars: ["壬申", "庚戌", "癸酉", "乙卯"],
      direction: "backward",
      startAge: 5,
      startDate: "1998-02-01",
      first: "己酉",
      second: "戊申",
      third: "丁未",
    },
  },
  {
    name: "1990 male / documented library example / forward luck pillars",
    input: {
      gender: "male" as const,
      calendarType: "solar" as const,
      birthDate: "1990-05-15",
      birthTime: "14:30",
      birthTimeUnknown: false,
      timezone: "Asia/Seoul",
      countryCode: "KR",
    },
    expected: {
      pillars: ["庚午", "辛巳", "庚辰", "癸未"],
      direction: "forward",
      startAge: 7,
      startDate: "1997-08-10",
      first: "壬午",
      second: "癸未",
      third: "甲申",
    },
  },
  {
    name: "2024 Lichun minus one minute / female / forward luck pillars",
    input: {
      gender: "female" as const,
      calendarType: "solar" as const,
      birthDate: "2024-02-04",
      birthTime: "17:26",
      birthTimeUnknown: false,
      timezone: "Asia/Seoul",
      countryCode: "KR",
    },
    expected: {
      pillars: ["癸卯", "乙丑", "戊戌", "辛酉"],
      direction: "forward",
      startAge: 1,
      startDate: "2024-02-04",
      first: "丙寅",
      second: "丁卯",
      third: "戊辰",
    },
  },
  {
    name: "2025 year end / male / backward luck pillars",
    input: {
      gender: "male" as const,
      calendarType: "solar" as const,
      birthDate: "2025-12-31",
      birthTime: "12:00",
      birthTimeUnknown: false,
      timezone: "Asia/Seoul",
      countryCode: "KR",
    },
    expected: {
      pillars: ["乙巳", "戊子", "甲戌", "庚午"],
      direction: "backward",
      startAge: 8,
      startDate: "2034-01-31",
      first: "丁亥",
      second: "丙戌",
      third: "乙酉",
    },
  },
] as const;
