import type { FreeFortuneResult } from "@/lib/ai/schemas/free-result";
import type { PaidFortuneReport, PaidSection } from "@/lib/ai/schemas/paid-report";

export type ReadinessLevel = "NONE" | "WEAK" | "YES" | "STRONG";

export type PaidQualityV2Report = {
  strongPersonalDiscoveries: number;
  behaviorInsights: number;
  evidenceAxesUsed: number;
  maxAxisConcentration: number;
  insightDiversity: "PASS" | "FAIL";
  evidenceDiversity: "PASS" | "FAIL";
  genericAdvice: "NONE" | "FAIL";
  referralReadiness: ReadinessLevel;
  repurchaseReadiness: ReadinessLevel;
  shareWorthyInsightCount: number;
  possibleNextQuestions: "PASS" | "FAIL";
  mixedLanguageErrors: number;
  unsupportedClaims: number;
  nameDayMasterSafety: "SEPARATED" | "FAIL";
};

function sectionText(section: PaidSection): string {
  return [
    section.title,
    section.coreInterpretation ?? "",
    section.coreInsight,
    ...(section.behaviorPossibilities ?? []),
    ...(section.realLifeExamples ?? []),
    ...(section.behaviorScenes ?? []),
    section.counterPattern ?? "",
    section.strengthSide ?? "",
    section.shadowSide ?? "",
    section.practicalMeaning ?? "",
    ...(section.actionOptions ?? []),
    section.shareableLine ?? "",
  ].join("\n");
}

function uniqCount(values: string[]): number {
  return new Set(values.filter(Boolean)).size;
}

function normalizedWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^0-9a-z가-힣\s]/gi, " ")
    .split(/\s+/)
    .map((x) => x.trim())
    .filter((x) => x.length >= 2);
}

function overlapRatio(a: string, b: string): number {
  const aw = new Set(normalizedWords(a));
  const bw = new Set(normalizedWords(b));
  if (aw.size === 0 || bw.size === 0) return 0;
  let hit = 0;
  for (const x of aw) {
    if (bw.has(x)) hit += 1;
  }
  return hit / Math.min(aw.size, bw.size);
}

function genericAdviceFail(report: PaidFortuneReport): boolean {
  const blob = [
    ...report.sections.flatMap((s) => [...(s.actionOptions ?? []), ...(s.actionAdvice ?? []), ...(s.behaviorScenes ?? [])]),
    ...report.actionItems.flatMap((x) => [x.what, x.why, x.how]),
  ].join("\n");
  return /절약하세요|계획하세요|긍정적으로|무조건|항상|반드시/.test(blob);
}

function countMixedLanguage(text: string): number {
  const matches = text.match(/양\s*metal|yin\s*[가-힣]|yang\s*[가-힣]|[가-힣]+\s*metal/gi);
  return matches?.length ?? 0;
}

function countUnsupportedClaims(text: string): number {
  const safe = text.replace(
    /세운\s+(뒤|후|다음|기준|상태|문장|사람|것|시간)/g,
    "세운__verb"
  );
  const matches = safe.match(
    /(?:^|[\s·,()])(?:대운|세운|월운|용신|신강|신약)(?:[\s·,()?!]|$)/g
  );
  return matches?.length ?? 0;
}

export function evaluatePaidQualityV2(report: PaidFortuneReport): PaidQualityV2Report {
  const sectionAxisIds = report.sections.flatMap((s) => s.evidenceAxisIds ?? []);
  const evidenceAxesUsed = uniqCount(sectionAxisIds);
  const axisCounts = new Map<string, number>();
  for (const axis of sectionAxisIds) {
    axisCounts.set(axis, (axisCounts.get(axis) ?? 0) + 1);
  }
  const totalAxisUses = sectionAxisIds.length || 1;
  const maxAxisConcentration = Math.max(
    0,
    ...[...axisCounts.values()].map((n) => Math.round((n / totalAxisUses) * 100))
  );

  const strongPersonalDiscoveries = report.sections.filter(
    (s) =>
      (s.shareableLine?.length ?? 0) > 0 &&
      (s.counterPattern?.length ?? 0) > 0 &&
      ((s.evidenceAxisIds?.length ?? 0) >= 2)
  ).length;
  const behaviorInsights = uniqCount(
    report.sections.flatMap((s) => [
      ...(s.behaviorPossibilities ?? []),
      ...(s.realLifeExamples ?? []),
      ...(s.behaviorScenes ?? []),
    ])
  );
  const shareWorthyInsightCount = uniqCount([
    ...(report.shareableInsights ?? []),
    ...report.sections.map((s) => s.shareableLine ?? ""),
  ]);

  const insightFamilies = new Set(
    report.sections.map((s) =>
      (s.coreInterpretation ?? s.coreInsight)
        .replace(/\s+/g, " ")
        .split(/[,.]/)[0]
        .slice(0, 28)
    )
  ).size;
  const insightDiversity =
    report.reportKind === "total"
      ? insightFamilies >= 5
        ? "PASS"
        : "FAIL"
      : insightFamilies >= 3
        ? "PASS"
        : "FAIL";
  const evidenceDiversity =
    report.reportKind === "total"
      ? evidenceAxesUsed >= 4 && maxAxisConcentration < 70
        ? "PASS"
        : "FAIL"
      : evidenceAxesUsed >= 3 && maxAxisConcentration < 70
        ? "PASS"
        : "FAIL";

  const referralReadiness: ReadinessLevel =
    shareWorthyInsightCount >= 5 && strongPersonalDiscoveries >= 5
      ? "STRONG"
      : shareWorthyInsightCount >= 3 && strongPersonalDiscoveries >= 3
        ? "YES"
        : shareWorthyInsightCount >= 2
          ? "WEAK"
          : "NONE";

  const repurchaseReadiness: ReadinessLevel =
    (report.possibleNextQuestions?.length ?? 0) >= 3 && strongPersonalDiscoveries >= 3
      ? shareWorthyInsightCount >= 4
        ? "STRONG"
        : "YES"
      : (report.possibleNextQuestions?.length ?? 0) >= 1
        ? "WEAK"
        : "NONE";

  const allText = [
    report.title,
    report.signatureStatement,
    report.executiveSummary,
    ...report.sections.map(sectionText),
    ...(report.shareableInsights ?? []),
    ...(report.possibleNextQuestions ?? []),
  ].join("\n");

  return {
    strongPersonalDiscoveries,
    behaviorInsights,
    evidenceAxesUsed,
    maxAxisConcentration,
    insightDiversity,
    evidenceDiversity,
    genericAdvice: genericAdviceFail(report) ? "FAIL" : "NONE",
    referralReadiness,
    repurchaseReadiness,
    shareWorthyInsightCount,
    possibleNextQuestions: (report.possibleNextQuestions?.length ?? 0) >= 2 ? "PASS" : "FAIL",
    mixedLanguageErrors: countMixedLanguage(allText),
    unsupportedClaims: countUnsupportedClaims(allText.replace(/대운·세운·월운·용신·신강\/신약/g, "")),
    nameDayMasterSafety:
      /경님|갑님|을님|병님|정님|무님|기님|신님|임님|계님/.test(allText) ? "FAIL" : "SEPARATED",
  };
}

export function comparePaidReportOverlap(
  left: PaidFortuneReport,
  right: PaidFortuneReport
): { overlapRatio: number; verdict: "CLEAR" | "FAIL" } {
  const l = [
    left.signatureStatement,
    ...left.sections.map((s) => `${s.title}\n${s.coreInterpretation ?? s.coreInsight}`),
  ].join("\n");
  const r = [
    right.signatureStatement,
    ...right.sections.map((s) => `${s.title}\n${s.coreInterpretation ?? s.coreInsight}`),
  ].join("\n");
  const ratio = overlapRatio(l, r);
  return {
    overlapRatio: Number(ratio.toFixed(2)),
    verdict: ratio < 0.6 ? "CLEAR" : "FAIL",
  };
}

export function compareFreeVsPaidNovelty(
  free: FreeFortuneResult,
  paid: PaidFortuneReport
): { overlapRatio: number; verdict: "CLEAR" | "FAIL" } {
  const left = [
    free.hookLine,
    free.summary,
    free.personality.summary,
    free.hiddenSelf.body,
    ...free.previews.map((x) => x.preview),
  ].join("\n");
  const right = [
    paid.signatureStatement,
    paid.executiveSummary,
    ...paid.sections.map((s) => `${s.title}\n${s.coreInterpretation ?? s.coreInsight}`),
  ].join("\n");
  const ratio = overlapRatio(left, right);
  return {
    overlapRatio: Number(ratio.toFixed(2)),
    verdict: ratio < 0.58 ? "CLEAR" : "FAIL",
  };
}
