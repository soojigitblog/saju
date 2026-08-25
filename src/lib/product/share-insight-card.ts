/**
 * PHASE P2.2 — Privacy-safe Insight Card share schema (design only).
 * No image/PDF generation in this phase.
 */

export type InsightShareCardV1 = {
  schemaVersion: "insight-card-v1";
  /** Public-facing brand line */
  brand: "운의결";
  /** Domain label without implying timing luck */
  domainLabel: "성향" | "돈" | "일" | "관계" | "종합" | "교차";
  /** Share-worthy line — must not include PII */
  insightLine: string;
  /** Optional short context, still non-PII */
  contextLine?: string;
  /** Landing CTA target */
  cta: {
    label: "나도 사주 풀어보기";
    href: "/";
  };
  /** Explicitly stripped fields (documentation for implementers) */
  privacy: {
    includesNickname: false;
    includesBirthDate: false;
    includesOrderNo: false;
    includesChart: false;
    includesShareOwnerId: false;
  };
};

const PII_PATTERNS = [
  /\d{4}[-./]\d{1,2}[-./]\d{1,2}/,
  /주문\s*번호|order\s*no/i,
  /\b\d{6,}\b/,
  /님\s*$/,
];

export function sanitizeInsightLine(line: string): string {
  let s = line.trim();
  for (const re of PII_PATTERNS) {
    s = s.replace(re, "");
  }
  return s.replace(/\s{2,}/g, " ").trim().slice(0, 140);
}

export function buildInsightShareCard(input: {
  domainLabel: InsightShareCardV1["domainLabel"];
  insightLine: string;
  contextLine?: string;
}): InsightShareCardV1 {
  return {
    schemaVersion: "insight-card-v1",
    brand: "운의결",
    domainLabel: input.domainLabel,
    insightLine: sanitizeInsightLine(input.insightLine),
    contextLine: input.contextLine
      ? sanitizeInsightLine(input.contextLine)
      : undefined,
    cta: {
      label: "나도 사주 풀어보기",
      href: "/",
    },
    privacy: {
      includesNickname: false,
      includesBirthDate: false,
      includesOrderNo: false,
      includesChart: false,
      includesShareOwnerId: false,
    },
  };
}

export function assertInsightCardPrivacy(card: InsightShareCardV1): {
  ok: boolean;
  issues: string[];
} {
  const blob = `${card.insightLine}\n${card.contextLine ?? ""}`;
  const issues: string[] = [];
  if (/\d{4}[-./]\d{1,2}/.test(blob)) issues.push("birth-like date");
  if (/주문|order/i.test(blob)) issues.push("order reference");
  if (card.privacy.includesNickname) issues.push("nickname flag true");
  if (card.privacy.includesBirthDate) issues.push("birthDate flag true");
  if (card.privacy.includesOrderNo) issues.push("orderNo flag true");
  if (card.privacy.includesChart) issues.push("chart flag true");
  return { ok: issues.length === 0, issues };
}
