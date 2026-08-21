/**
 * Presentation-only mapping: technical evidence keys → Korean labels.
 * Validators / engines keep raw keys; UI must never show them raw.
 */

const ELEMENT_KO: Record<string, string> = {
  wood: "木",
  fire: "火",
  earth: "土",
  metal: "金",
  water: "水",
};

const PILLAR_KO: Record<string, string> = {
  year: "년주",
  month: "월주",
  day: "일주",
  hour: "시주",
};

const PART_KO: Record<string, string> = {
  stem: "천간",
  branch: "지지",
  ganji: "간지",
};

/** Looks like an internal whitelist key (possibly with =value). */
export function isTechnicalEvidenceKey(raw: string): boolean {
  const key = raw.trim();
  if (!key) return false;
  const bare = key.split("=")[0]?.trim() ?? key;
  return /^(dayMaster|fiveElements|pillars|tenGods|conventions|hourUnknown|birthTimeUnknown|gender)(\.|$)/.test(
    bare
  );
}

/**
 * Map a single evidence / insightBasis / fortuneBasis item to a user-facing label.
 * Already-Korean human labels are returned unchanged.
 */
export function formatEvidenceLabel(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  if (!isTechnicalEvidenceKey(trimmed)) return trimmed;

  const eq = trimmed.indexOf("=");
  const bare = (eq >= 0 ? trimmed.slice(0, eq) : trimmed).trim();
  const value = eq >= 0 ? trimmed.slice(eq + 1).trim() : "";

  if (bare === "dayMaster" || bare === "dayMaster.stem") {
    return value ? `${value} 일간` : "일간";
  }
  if (bare.startsWith("dayMaster.hangul")) {
    return value ? `${value} 일간` : "일간";
  }

  if (bare === "hourUnknown" || bare === "birthTimeUnknown") {
    return "시주 미상";
  }

  if (bare === "gender") {
    if (value === "female") return "여성";
    if (value === "male") return "남성";
    return "성별";
  }

  const five = bare.match(/^fiveElements\.(wood|fire|earth|metal|water)$/);
  if (five) {
    const el = ELEMENT_KO[five[1]!] ?? five[1]!;
    return `${el} 기운`;
  }

  const ten = bare.match(/^tenGods\.(year|month|day|hour)\.(stem|branch)$/);
  if (ten) {
    const pillar = PILLAR_KO[ten[1]!] ?? ten[1]!;
    const part = PART_KO[ten[2]!] ?? ten[2]!;
    return `${pillar} ${part}(십성)`;
  }

  const pillar = bare.match(/^pillars\.(year|month|day|hour)\.(stem|branch|ganji)$/);
  if (pillar) {
    const p = PILLAR_KO[pillar[1]!] ?? pillar[1]!;
    const part = PART_KO[pillar[2]!] ?? pillar[2]!;
    return `${p} ${part}`;
  }

  if (bare.startsWith("conventions.")) {
    const kind = bare.slice("conventions.".length);
    if (kind === "yearBoundary") return "년주 기준";
    if (kind === "monthBoundary") return "월주 기준";
    if (kind === "dayBoundary") return "일주 기준";
    return "명리 기준";
  }

  // Unknown technical-looking key — soften dots rather than leak English path as-is.
  return bare
    .replace(/^dayMaster\b/, "일간")
    .replace(/^fiveElements\./, "오행·")
    .replace(/^tenGods\./, "십성·")
    .replace(/^pillars\./, "사주·")
    .replace(/\./g, " ");
}

/** Format a list for “왜 이렇게 보나요?” style UI. */
export function formatFortuneEvidenceForDisplay(items: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const label = formatEvidenceLabel(item);
    if (!label || seen.has(label)) continue;
    seen.add(label);
    out.push(label);
  }
  return out;
}
