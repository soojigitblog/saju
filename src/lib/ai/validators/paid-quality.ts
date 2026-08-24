import type { PaidFortuneReport, PaidSection } from "@/lib/ai/schemas/paid-report";
import {
  resolvePaidProductKind,
  SECTION_DOMAIN_HINTS,
  type PaidSectionKey,
} from "@/lib/ai/schemas/paid-report";
import { evidenceToAxis } from "@/lib/ai/fortune-context-audit";

/**
 * PHASE P1.4 Paid Quality Gate
 */

const BARNUM_PATTERNS: RegExp[] = [
  /마음이\s*따뜻/,
  /사람을\s*중요하게\s*생각/,
  /인정\s*받고\s*싶어/,
  /노력하면\s*좋은\s*결과/,
  /스트레스를\s*받을\s*수\s*있/,
  /성격이\s*좋습니다/,
  /좋은\s*사람이/,
  /운이\s*좋습니다/,
  /긍정적인\s*마음/,
  /저축하세요/,
  /계획적으로\s*쓰세요/,
];

/** Common Korean particle mistakes like 정체은 / 구조은 / 관계은 */
const BAD_PARTICLE_RE =
  /([가-힣]{1,12})(은)(?=\s|[.,!?·"'”’）)\]]|$)/g;

const FACT_ASSERTION_PATTERNS: RegExp[] = [
  /월급이\s*들어오면/,
  /친구가\s*링크를/,
  /배달·구독에\s*놀랍/,
  /장바구니에\s*넣었다가/,
  /매주\s*같은\s*요일에\s*반드시/,
];

const DEV_TEXT_PATTERNS: RegExp[] = [
  /\bmock\b/i,
  /\bfixture\b/i,
  /#1\b/,
  /장면\s*1\b/,
  /chapter\s*3/i,
  /evidence\s*1/i,
  /placeholder/i,
  /QA-V\d/i,
];

const STYLE_BANNED: RegExp[] = [
  /주어진 데이터 범위/,
  /이 챕터에서는/,
  /형용사 대신 행동으로/,
  /대운·세운이 없/,
  /대운·세운은 없/,
  /계획적으로\s*소비/,
  /긍정적으로\s*생각/,
  /대화를\s*많이\s*하/,
];

const TEMPLATE_PATTERNS: RegExp[] = [
  /(.+?)(?:은|는)\s*납득\s*후(?:에)?\s*움직/,
  /챕터\s*\d+\s*evidence/,
  /장면\s*\d+/,
  /일간\s*.+\s*\+\s*오행[·・]?십성\s*상대\s*분포/,
];

const FORBIDDEN_ENGINE_TERMS: RegExp[] = [
  /대운/,
  /세운/,
  /월운/,
  /용신/,
  /신강/,
  /신약/,
  /\d{1,2}\s*월에\s*(재물|이직|연애|돈이)/,
];

export type PaidQualityReport = {
  pass: boolean;
  score: number;
  errors: string[];
  metrics: {
    chapterCount: number;
    behaviorSceneCount: number;
    uniqueWhyCount: number;
    templateHits: number;
    domainMisses: number;
    koreanErrors: number;
    barnumHits: number;
    whyBoxCount: number;
    paradoxCount: number;
    devTextHits: number;
    styleHits: number;
    factAssertionHits: number;
    evidenceAxisCount: number;
  };
};

function sectionBlob(s: PaidSection): string {
  return [
    s.title,
    s.question ?? "",
    s.coreInsight,
    ...(s.behaviorScenes ?? []),
    s.strengthSide ?? "",
    s.riskSide ?? "",
    s.triggerSituation ?? "",
    s.practicalMeaning ?? "",
    ...(s.actionAdvice ?? []),
    ...(s.evidenceExplanation ?? []),
    s.takeaway ?? "",
    s.pullQuote ?? "",
    s.narrativeBridge ?? "",
    s.paradoxNote ?? "",
  ].join("\n");
}

function collectAllText(result: PaidFortuneReport): string {
  return [
    result.title,
    result.signatureStatement,
    result.freeBridge ?? "",
    result.executiveSummary,
    ...result.profileDashboard.map((p) => `${p.label} ${p.value}`),
    ...result.keywords,
    result.blueprint
      ? [
          result.blueprint.dayMasterTerm,
          result.blueprint.dayMasterPlain,
          result.blueprint.fiveElementsNote,
          result.blueprint.tenGodsNote,
          result.blueprint.structurePlain,
          result.blueprint.lifePlain,
        ].join("\n")
      : "",
    ...result.sections.map(sectionBlob),
    ...(result.contradictions ?? []).flatMap((c) => [
      c.poleA,
      c.poleB,
      c.howItShows,
      c.upside,
      c.downside,
      c.whenStronger,
    ]),
    ...(result.strengthShadows ?? []).flatMap((s) => [
      s.strength,
      s.overuse,
      s.problem,
    ]),
    ...(result.lifeScenes ?? []),
    ...result.actionItems.flatMap((a) => [a.what, a.why, a.how]),
    ...result.finalSummary.strengths,
    ...result.finalSummary.cautions,
    ...(result.finalSummary.changeHabits ?? []),
    ...(result.finalSummary.keepHabits ?? []),
    result.finalSummary.closingLine,
  ].join("\n");
}

export function findKoreanParticleErrors(text: string): string[] {
  const hits: string[] = [];
  const knownBad = [
    /정체은/,
    /구조은/,
    /관계은/,
    /스트레스은/,
    /정리은/,
    /성향은\s*납득/,
    /직업은\s*납득/,
  ];
  for (const re of knownBad) {
    if (re.test(text)) hits.push(re.source);
  }
  void BAD_PARTICLE_RE;
  return hits.slice(0, 8);
}

function detectTemplateRepetition(sections: PaidSection[]): number {
  let hits = 0;
  const slogans = sections.map((s) => s.coreInsight.replace(/\s+/g, " ").trim());
  // Same ending pattern
  const endings = slogans.map((s) => {
    const m = s.match(/(.{6,18})$/);
    return m?.[1] ?? s;
  });
  const endCount = new Map<string, number>();
  for (const e of endings) {
    endCount.set(e, (endCount.get(e) ?? 0) + 1);
  }
  for (const n of endCount.values()) {
    if (n >= 3) hits += n;
  }

  // Pattern: X은/는 납득 후 움직
  const nabdeuk = sections.filter((s) =>
    /납득\s*후/.test(sectionBlob(s))
  ).length;
  if (nabdeuk >= 2) hits += nabdeuk;

  // Identical WHY openings
  const whyStarts = sections.map((s) =>
    (s.evidenceExplanation?.[0] ?? "").slice(0, 24)
  );
  const whyCount = new Map<string, number>();
  for (const w of whyStarts) {
    if (w.length < 10) continue;
    whyCount.set(w, (whyCount.get(w) ?? 0) + 1);
  }
  for (const n of whyCount.values()) {
    if (n >= 3) hits += n;
  }

  for (const s of sections) {
    const blob = sectionBlob(s);
    for (const re of TEMPLATE_PATTERNS) {
      if (re.test(blob)) {
        hits += 1;
        break;
      }
    }
  }
  return hits;
}

function domainMiss(section: PaidSection): boolean {
  const hints = SECTION_DOMAIN_HINTS[section.key as PaidSectionKey];
  if (!hints || hints.length === 0) return false;
  const blob = sectionBlob(section);
  return !hints.some((h) => blob.includes(h));
}

export function scorePaidReportQuality(
  result: PaidFortuneReport,
  options?: { productSlug?: string | null }
): PaidQualityReport {
  const errors: string[] = [];
  let score = 100;
  const kind = resolvePaidProductKind(options?.productSlug);
  const allText = collectAllText(result);

  if (!result.signatureStatement?.trim()) {
    errors.push("missing signatureStatement");
    score -= 12;
  }
  if (!result.finalSummary?.closingLine?.trim()) {
    errors.push("missing finalSummary.closingLine");
    score -= 8;
  }
  if (!result.profileDashboard || result.profileDashboard.length < 4) {
    errors.push("profileDashboard needs ≥4 items");
    score -= 10;
  }
  if (!result.actionItems || result.actionItems.length < 5) {
    errors.push("actionItems needs ≥5");
    score -= 10;
  }

  const koreanHits = findKoreanParticleErrors(allText);
  if (koreanHits.length > 0) {
    errors.push(`korean particle error: ${koreanHits.slice(0, 3).join(", ")}`);
    score -= 20;
  }

  for (const re of FORBIDDEN_ENGINE_TERMS) {
    if (re.test(allText)) {
      // allow "대운·세운은 없습니다" style denials
      if (/대운|세운|월운|용신/.test(re.source)) {
        const denial =
          /대운[·・\s]*세운이?\s*(없|미지원|포함하지\s*않|만들지\s*않)/.test(
            allText
          ) || /대운[·・\s]*세운/.test(allText) === false;
        if (
          /대운|세운/.test(re.source) &&
          /없|미지원|포함하지\s*않|만들지\s*않|제외|금지/.test(allText)
        ) {
          continue;
        }
        if (denial && /없|미지원|포함하지|만들지\s*않/.test(allText)) continue;
      }
      errors.push(`engine hallucination risk: ${re.source}`);
      score -= 15;
      break;
    }
  }

  let behaviorSceneCount = 0;
  let uniqueWhyCount = 0;
  let barnumHits = 0;
  let domainMisses = 0;
  let whyBoxCount = 0;
  let paradoxCount = 0;
  let factAssertionHits = 0;
  let evidenceAxisCount = 0;
  let devTextHits = 0;
  let styleHits = 0;
  const whyFingerprints = new Set<string>();

  const bodyText = [
    result.executiveSummary,
    ...result.sections.map(sectionBlob),
    ...(result.lifeScenes ?? []),
    ...result.actionItems.flatMap((a) => [a.when ?? "", a.what, a.why, a.how]),
    result.finalSummary.closingLine,
  ].join("\n");

  for (const re of FACT_ASSERTION_PATTERNS) {
    if (re.test(bodyText)) {
      factAssertionHits += 1;
      errors.push(`fact assertion: ${re.source}`);
      score -= 15;
      break;
    }
  }

  const allEvidence = [
    ...result.sections.flatMap((s) => s.evidence ?? []),
    ...(result.contradictions ?? []).flatMap((c) => c.evidence),
    ...(result.strengthShadows ?? []).flatMap((s) => s.evidence),
  ];
  const axisSet = new Set(
    allEvidence.map((k) => evidenceToAxis(k)).filter((a) => a !== "unknown")
  );
  evidenceAxisCount = axisSet.size;
  const isV4 = result.reportVersion === "v4" || result.sections.some((s) => s.key.includes("_v4_"));
  if (isV4 && kind === "total" && evidenceAxisCount < 4) {
    errors.push(`evidence diversity needs ≥4 axes (got ${evidenceAxisCount})`);
    score -= 12;
  }
  if (isV4 && kind === "money" && evidenceAxisCount < 3) {
    errors.push(`money evidence diversity needs ≥3 axes (got ${evidenceAxisCount})`);
    score -= 10;
  }

  for (const re of DEV_TEXT_PATTERNS) {
    if (re.test(allText)) {
      devTextHits += 1;
      errors.push(`dev text leak: ${re.source}`);
      score -= 25;
      break;
    }
  }

  for (const re of STYLE_BANNED) {
    if (re.test(bodyText)) {
      styleHits += 1;
      errors.push(`style banned: ${re.source}`);
      score -= 8;
    }
  }

  const sectionDisclaimerHits = result.sections.filter((s) =>
    /대운|세운|월운/.test(sectionBlob(s))
  ).length;
  if (sectionDisclaimerHits > 0) {
    errors.push(`system disclaimer repeated in sections (${sectionDisclaimerHits})`);
    score -= 10;
  }

  for (const s of result.sections) {
    behaviorSceneCount += s.behaviorScenes?.length ?? 0;
    if (s.includeWhyBox) whyBoxCount += 1;
    if (s.paradoxNote?.trim()) paradoxCount += 1;
    const whyJoined = (s.evidenceExplanation ?? []).join("|");
    if (whyJoined.length >= 30) {
      uniqueWhyCount += 1;
      whyFingerprints.add(whyJoined.slice(0, 40));
    }
    if ([...s.coreInsight].length < 20) {
      errors.push(`thin coreInsight: ${s.key}`);
      score -= 4;
    }
    if ((s.behaviorScenes?.length ?? 0) < 1) {
      errors.push(`missing behaviorScenes: ${s.key}`);
      score -= 5;
    }
    const blob = sectionBlob(s);
    for (const re of BARNUM_PATTERNS) {
      if (re.test(blob)) {
        barnumHits += 1;
        score -= 4;
        errors.push(`barnum-like: ${s.key}`);
        break;
      }
    }
    if (domainMiss(s)) {
      domainMisses += 1;
      errors.push(`domain relevance miss: ${s.key}`);
      score -= 6;
    }
  }

  if (whyFingerprints.size < Math.min(result.sections.length, 5)) {
    errors.push("evidenceExplanation too similar across chapters");
    score -= 12;
  }

  const templateHits = detectTemplateRepetition(result.sections);
  if (templateHits >= 3) {
    errors.push(`template repetition hits=${templateHits}`);
    score -= Math.min(25, templateHits * 3);
  }

  if (kind === "money") {
    const isV4m = result.reportVersion === "v4" || result.sections.some((s) => s.key.startsWith("money_v4"));
    const minSections = isV4m ? 6 : 10;
    if (result.sections.length < minSections) {
      errors.push(`money needs ${minSections} diagnosis sections`);
      score -= 15;
    }
    if (behaviorSceneCount < 5) {
      errors.push(`money needs ≥5 behavior scenes (got ${behaviorSceneCount})`);
      score -= 10;
    }
    if (isV4m) {
      if ((result.profileScales?.length ?? 0) > 3) {
        errors.push("money profileScales max 3");
        score -= 6;
      }
      if (!result.finalSummary.portraitNarrative?.length) {
        errors.push("money needs portraitNarrative");
        score -= 6;
      }
    } else {
      if (whyBoxCount < 3 || whyBoxCount > 5) {
        errors.push(`money WHY boxes need 3–5 (got ${whyBoxCount})`);
        score -= 8;
      }
      if (paradoxCount < 2) {
        errors.push(`money needs ≥2 paradox insights (got ${paradoxCount})`);
        score -= 8;
      }
      if (!result.profileScales || result.profileScales.length < 3) {
        errors.push("money needs profileScales (rule-based)");
        score -= 8;
      }
    }
    if (!result.scopeNotes?.trim()) {
      errors.push("money needs scopeNotes at end");
      score -= 6;
    }
    if (!isV4m && (result.finalSummary.changeHabits?.length ?? 0) < 2) {
      errors.push("money finalSummary needs changeHabits×2");
      score -= 6;
    }
    if (!isV4m && (result.finalSummary.keepHabits?.length ?? 0) < 2) {
      errors.push("money finalSummary needs keepHabits×2");
      score -= 6;
    }
  }

  if (kind === "total") {
    const isV4t = result.reportVersion === "v4" || result.sections.some((s) => s.key.startsWith("total_v4"));
    const minSections = isV4t ? 9 : 10;
    if (result.sections.length < minSections) {
      errors.push(`total needs ${minSections} narrative sections`);
      score -= 12;
    }
    if (!result.blueprint) {
      errors.push("total needs blueprint");
      score -= 10;
    }
    const minContra = isV4t ? 2 : 3;
    if ((result.contradictions?.length ?? 0) < minContra) {
      errors.push(`total needs ≥${minContra} contradictions`);
      score -= 10;
    }
    if ((result.strengthShadows?.length ?? 0) < 3) {
      errors.push("total needs ≥3 strengthShadows");
      score -= 10;
    }
    if (!isV4t && (result.lifeScenes?.length ?? 0) < 8) {
      errors.push("total needs ≥8 lifeScenes");
      score -= 10;
    }
    if (result.actionItems.length < 8) {
      errors.push("total needs ≥8 actionItems");
      score -= 8;
    }
    if (!isV4t) {
      if (whyBoxCount < 5 || whyBoxCount > 8) {
        errors.push(`total WHY boxes need 5–8 (got ${whyBoxCount})`);
        score -= 8;
      }
      const contraParadox = paradoxCount + (result.contradictions?.length ?? 0);
      if (contraParadox < 4) {
        errors.push(`total needs ≥4 paradox/contradiction (got ${contraParadox})`);
        score -= 8;
      }
    }
    if (!result.scopeNotes?.trim()) {
      errors.push("total needs scopeNotes at end");
      score -= 6;
    }
    if (isV4t && !result.finalSummary.portraitNarrative?.length) {
      errors.push("total needs portraitNarrative");
      score -= 8;
    }
  }

  if (result.freeBridge && [...result.freeBridge].length > 220) {
    errors.push("freeBridge too long");
    score -= 6;
  }

  score = Math.max(0, Math.min(100, score));
  const hard = errors.filter(
    (e) =>
      e.startsWith("korean") ||
      e.startsWith("template") ||
      e.startsWith("domain") ||
      e.startsWith("engine") ||
      e.includes("needs") ||
      e.includes("missing") ||
      e.includes("evidenceExplanation") ||
      e.includes("profileDashboard") ||
      e.includes("actionItems") ||
      e.includes("thin coreInsight") ||
      e.includes("missing behaviorScenes")
  );
  const passFinal = score >= 72 && hard.length === 0;

  return {
    pass: passFinal,
    score,
    errors: [...new Set(errors)].slice(0, 24),
    metrics: {
      chapterCount: result.sections.length,
      behaviorSceneCount,
      uniqueWhyCount,
      templateHits,
      domainMisses,
      koreanErrors: koreanHits.length,
      barnumHits,
      whyBoxCount,
      paradoxCount,
      devTextHits,
      styleHits,
      factAssertionHits,
      evidenceAxisCount,
    },
  };
}

export function assertPaidQualityGate(
  result: PaidFortuneReport,
  options?: { productSlug?: string | null }
): void {
  const report = scorePaidReportQuality(result, options);
  if (!report.pass) {
    throw new Error(
      `PAID_QUALITY_FAILED score=${report.score}: ${report.errors.join("; ")}`
    );
  }
}
