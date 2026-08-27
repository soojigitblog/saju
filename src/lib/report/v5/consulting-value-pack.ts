/**
 * Consulting-grade value pack — Level 3 discoveries for PDF assembly.
 * Separate from easy-value-pack (no teaser morph dependency).
 */
import type { PaidFortuneReport, PaidSection } from "@/lib/ai/schemas/paid-report";
import { enrichConsultingGrade, countLevel3 } from "@/lib/ai/interpreters/mock-consulting-grade";
import { sanitizeEditorialCopy } from "@/lib/report/v5/easy-korean";

function cleanCustomerText(s: string): string {
  return sanitizeEditorialCopy(String(s ?? "").trim());
}

export type ConsultingDiscovery = {
  id: string;
  question: string;
  level: 1 | 2 | 3;
  narrative: string;
  chain: { label: string; text: string }[];
  selfView: string;
  outsideView: string;
  selfMisread: string;
  counter: string;
  strength?: string;
  cost?: string;
  shareCandidate?: string;
  evidenceEasy?: string;
  evidenceSources: string[];
};

export type ConsultingPack = {
  kind: "money" | "career" | "love" | "total";
  report: PaidFortuneReport;
  discoveries: ConsultingDiscovery[];
  profileLines: { label: string; value: string }[];
  shareLines: string[];
  contradictions: NonNullable<PaidFortuneReport["contradictions"]>;
  strengthShadows: NonNullable<PaidFortuneReport["strengthShadows"]>;
  actions: NonNullable<PaidFortuneReport["actionItems"]>;
  crossDomain: NonNullable<PaidFortuneReport["crossDomainLinks"]>;
  patternChains: NonNullable<PaidFortuneReport["patternChains"]>;
  portrait: string[];
  closing: string;
  signature: string;
  level3Count: number;
};

function sec(report: PaidFortuneReport, key: string): PaidSection | undefined {
  return report.sections.find((s) => s.key === key);
}

function discoveryFromSection(
  s: PaidSection | undefined,
  id: string,
  fallbackQ: string
): ConsultingDiscovery | null {
  if (!s) return null;
  const level = (s.discoveryLevel ?? 2) as 1 | 2 | 3;
  const narrative = cleanCustomerText(s.whyDeeper || s.coreInsight);
  if (!narrative) return null;
  return {
    id,
    question: cleanCustomerText(s.question || fallbackQ),
    level,
    narrative,
    chain: (s.reactionChain ?? []).map((c) => ({
      label: c.label,
      text: cleanCustomerText(c.text),
    })),
    selfView: cleanCustomerText(s.selfInterpretation ?? ""),
    outsideView: cleanCustomerText(s.outsideInterpretation ?? ""),
    selfMisread: cleanCustomerText(s.selfMisread ?? ""),
    counter: cleanCustomerText(s.counterPattern ?? ""),
    strength: cleanCustomerText(s.strengthSide ?? ""),
    cost: cleanCustomerText(s.shadowSide ?? s.riskSide ?? ""),
    shareCandidate: cleanCustomerText(s.shareableLine ?? ""),
    evidenceEasy: cleanCustomerText(s.evidenceExplanation?.[0] ?? ""),
    evidenceSources: [...(s.evidence ?? [])],
  };
}

function pickDiscoveries(
  report: PaidFortuneReport,
  keys: { key: string; id: string; q: string }[]
): ConsultingDiscovery[] {
  const out: ConsultingDiscovery[] = [];
  for (const row of keys) {
    const d = discoveryFromSection(sec(report, row.key), row.id, row.q);
    if (d) out.push(d);
  }
  return out;
}

function basePack(
  kind: ConsultingPack["kind"],
  report: PaidFortuneReport,
  discoveries: ConsultingDiscovery[]
): ConsultingPack {
  return {
    kind,
    report,
    discoveries,
    profileLines: (report.profileDashboard ?? []).map((p) => ({
      label: p.label,
      value: cleanCustomerText(p.value),
    })),
    shareLines: (report.shareableInsights ?? []).map(cleanCustomerText).filter(Boolean),
    contradictions: report.contradictions ?? [],
    strengthShadows: report.strengthShadows ?? [],
    actions: report.actionItems ?? [],
    crossDomain: report.crossDomainLinks ?? [],
    patternChains: report.patternChains ?? [],
    portrait: (report.finalSummary.portraitNarrative ?? [])
      .map(cleanCustomerText)
      .filter(
        (p) =>
          p &&
          !/리포트의\s*핵심|이\s*재물\s*리포트|일\s*리포트|연애\s*리포트|focused\s*report/i.test(
            p
          )
      ),
    closing: cleanCustomerText(report.finalSummary.closingLine),
    signature: cleanCustomerText(report.signatureStatement),
    level3Count: countLevel3(report),
  };
}

export function buildMoneyConsultingPack(
  raw: PaidFortuneReport,
  opts?: { live?: boolean }
): ConsultingPack {
  const report = opts?.live
    ? { ...raw, reportKind: "money" as const }
    : enrichConsultingGrade({ ...raw, reportKind: "money" });
  const discoveries = pickDiscoveries(report, [
    { key: "money_v4_structure", id: "m-size", q: "큰돈과 작은돈에서 왜 행동이 달라질까?" },
    { key: "money_v4_earn_spend", id: "m-earn", q: "벌 때와 쓸 때 무엇이 먼저 보일까?" },
    { key: "money_v4_blindspot", id: "m-delay", q: "결정을 미루면 무엇이 새어 나갈까?" },
    { key: "money_v4_work", id: "m-income", q: "수입 만족을 결정하는 것은 무엇인가?" },
    { key: "money_v4_people", id: "m-people", q: "돈과 사람이 섞이면 왜 예민해질까?" },
    { key: "money_v4_playbook", id: "m-style", q: "나에게 맞는 돈 관리 방식은?" },
  ]);
  return basePack("money", report, discoveries);
}

export function buildCareerConsultingPack(
  raw: PaidFortuneReport,
  opts?: { live?: boolean }
): ConsultingPack {
  const report = opts?.live
    ? { ...raw, reportKind: "career" as const }
    : enrichConsultingGrade({ ...raw, reportKind: "career" });
  const discoveries = pickDiscoveries(report, [
    { key: "career_strength_work", id: "c-env", q: "어떤 환경에서 강점이 살아날까?" },
    { key: "career_character", id: "c-start", q: "일을 시작할 때 무엇이 있어야 움직일까?" },
    { key: "career_org_friction", id: "c-boss", q: "왜 어떤 상사 아래에서만 지칠까?" },
    { key: "career_overload", id: "c-load", q: "언제 책임감이 과부하로 바뀌까?" },
    { key: "career_conflict", id: "c-conflict", q: "일이 꼬이면 가장 먼저 어떤 반응이 나올까?" },
    { key: "career_recognition", id: "c-recog", q: "무엇으로 인정받고 싶어 할까?" },
  ]);
  return basePack("career", report, discoveries);
}

export function buildLoveConsultingPack(
  raw: PaidFortuneReport,
  opts?: { live?: boolean }
): ConsultingPack {
  const report = opts?.live
    ? { ...raw, reportKind: "love" as const }
    : enrichConsultingGrade({ ...raw, reportKind: "love" });
  const discoveries = pickDiscoveries(report, [
    { key: "love_before", id: "l-before", q: "호감과 확신은 같은 속도로 움직일까?" },
    { key: "love_after", id: "l-after", q: "확신이 생기면 무엇이 달라질까?" },
    { key: "love_needs", id: "l-trust", q: "사랑받는다고 느끼는 기준은?" },
    { key: "love_fight", id: "l-fight", q: "갈등하면 어떤 식으로 반응할까?" },
    { key: "love_expression", id: "l-expr", q: "좋아하는데도 왜 표현이 늦게 보일까?" },
    { key: "love_attraction", id: "l-open", q: "마음이 열리는 데 무엇이 필요할까?" },
  ]);
  return basePack("love", report, discoveries);
}

export function buildTotalConsultingPack(
  raw: PaidFortuneReport,
  opts?: { live?: boolean }
): ConsultingPack {
  const report = opts?.live
    ? { ...raw, reportKind: "total" as const }
    : enrichConsultingGrade({ ...raw, reportKind: "total" });
  const discoveries = pickDiscoveries(report, [
    { key: "total_v4_decision", id: "t-decide", q: "나는 왜 어떤 날은 빠르고 어떤 날은 느릴까?" },
    { key: "total_v4_relationship", id: "t-rel", q: "처음의 나와 가까워진 뒤의 나는 왜 다를까?" },
    { key: "total_v4_work", id: "t-work", q: "일에서 내 강점은 어디서 선명해질까?" },
    { key: "total_v4_money_link", id: "t-money", q: "돈에서는 무엇을 지키려 할까?" },
    { key: "total_v4_love", id: "t-love", q: "연애에서는 왜 속도가 갈라질까?" },
    { key: "total_v4_stress", id: "t-stress", q: "스트레스는 어디서 쌓일까?" },
    { key: "total_v4_paradox", id: "t-paradox", q: "겉과 속이 다른 것처럼 보이는 이유는?" },
    { key: "total_v4_shadow", id: "t-shadow", q: "강점이 그림자가 되는 순간은?" },
  ]);
  return basePack("total", report, discoveries);
}

export function buildConsultingPack(
  kind: "money" | "career" | "love" | "total",
  report: PaidFortuneReport,
  opts?: { live?: boolean }
): ConsultingPack {
  switch (kind) {
    case "money":
      return buildMoneyConsultingPack(report, opts);
    case "career":
      return buildCareerConsultingPack(report, opts);
    case "love":
      return buildLoveConsultingPack(report, opts);
    case "total":
      return buildTotalConsultingPack(report, opts);
  }
}
