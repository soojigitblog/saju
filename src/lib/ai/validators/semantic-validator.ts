import type { FortuneAiContext } from "@/lib/ai/types";
import {
  buildEvidenceWhitelist,
  isAllowedEvidenceKey,
} from "@/lib/ai/context";
import type { FreeFortuneResult } from "@/lib/ai/schemas/free-result";
import {
  requiredSectionKeysForProduct,
  isYearTotalProductSlug,
  type PaidFortuneReport,
} from "@/lib/ai/schemas/paid-report";
import { validateHookQuality } from "@/lib/ai/validators/hook-quality";
import { scorePaidReportQuality } from "@/lib/ai/validators/paid-quality";
import { paidQualityV2Errors } from "@/lib/ai/validators/paid-quality-v2";
import { AiEngineError } from "@/lib/ai/errors";

export const FORBIDDEN_PREDICTION_PATTERNS: RegExp[] = [
  /반드시\s*죽/,
  /사고가\s*난다/,
  /암에\s*걸/,
  /임신한다/,
  /이혼한다/,
  /무조건\s*돈/,
  /100%\s*성공/,
  /대박\s*난다/,
  /파산한다/,
  /반드시\s*성공/,
  /무조건\s*이긴/,
  /주식을\s*사세요/,
  /코인을\s*사면/,
  /부동산을\s*사면/,
  /올해\s*이혼/,
  /바람을\s*피/,
  /딸을\s*낳/,
  /아들을\s*낳/,
  /교통사고/,
  /수술수/,
  /간이\s*안\s*좋/,
  /한방\s*(은|이)\s*없/,
  /돈복\s*(이\s*)?없/,
  /사업운\s*(이\s*)?없/,
  /재물운\s*(이\s*)?없/,
  /결혼운\s*(이\s*)?(나쁘|없)/,
  /자식운\s*(이\s*)?없/,
  /성공하기\s*어렵/,
  /팔자\s*(가|는|도)?\s*(세|사납|나쁘)/,
  /사주\s*(가|는|도)?\s*(나쁘|나빠|험)/,
  /배우자\s*복\s*(이\s*)?없/,
  /부모\s*복\s*(이\s*)?없/,
  /단명/,
  /평생\s*(가난|불행)/,
  /~운\s*(이\s*)?없습니다/,
];

const UNKNOWN_HOUR_FORBIDDEN = [
  /시주/,
  /태어난\s*시간/,
  /자시/,
  /축시/,
  /인시/,
  /묘시/,
  /진시/,
  /사시/,
  /오시/,
  /미시/,
  /신시/,
  /유시/,
  /술시/,
  /해시/,
];

export type LengthLimits = {
  headlineMax: number;
  summaryMin: number;
  summaryMax: number;
  personalitySummaryMin: number;
  personalitySummaryMax: number;
  currentFlowSummaryMin: number;
  currentFlowSummaryMax: number;
  previewMin: number;
  previewMax: number;
  hookLineMin: number;
  hookLineMax: number;
  outerInnerMin: number;
  outerInnerMax: number;
  hiddenSelfMin: number;
  hiddenSelfMax: number;
  stressMin: number;
  stressMax: number;
  signatureMin: number;
  signatureMax: number;
  bulletMin: number;
  bulletMax: number;
};

export const FREE_LENGTH_LIMITS: LengthLimits = {
  headlineMax: 30,
  summaryMin: 80,
  summaryMax: 400,
  personalitySummaryMin: 60,
  personalitySummaryMax: 320,
  currentFlowSummaryMin: 60,
  currentFlowSummaryMax: 320,
  previewMin: 40,
  previewMax: 180,
  hookLineMin: 18,
  hookLineMax: 48,
  outerInnerMin: 20,
  outerInnerMax: 100,
  hiddenSelfMin: 40,
  hiddenSelfMax: 180,
  stressMin: 40,
  stressMax: 160,
  signatureMin: 40,
  signatureMax: 180,
  bulletMin: 12,
  bulletMax: 80,
};

function collectText(parts: string[]): string {
  return parts.filter(Boolean).join("\n");
}

function findForbidden(text: string): string | null {
  for (const re of FORBIDDEN_PREDICTION_PATTERNS) {
    if (re.test(text)) return re.source;
  }
  return null;
}

function validateEvidence(
  evidence: string[],
  ctx: FortuneAiContext,
  label: string
): string[] {
  const whitelist = buildEvidenceWhitelist(ctx);
  const errors: string[] = [];
  for (const key of evidence) {
    if (!isAllowedEvidenceKey(key, whitelist)) {
      errors.push(`${label}: invalid evidence key "${key}"`);
    }
    if (ctx.birthTimeUnknown) {
      if (/pillars\.hour|tenGods\.hour/.test(key) && !/hourUnknown/.test(key)) {
        errors.push(`${label}: hour evidence not allowed when birth time unknown ("${key}")`);
      }
    }
  }
  return errors;
}

function hasDuplicateSentences(texts: string[]): boolean {
  const normalized = texts
    .map((t) => t.replace(/\s+/g, " ").trim())
    .filter((t) => t.length >= 20);
  const seen = new Set<string>();
  for (const t of normalized) {
    if (seen.has(t)) return true;
    seen.add(t);
  }
  return false;
}

function paidChartIdentityTokens(ctx: FortuneAiContext): string[][] {
  // Stem + month pillar are stable, customer-facing chart anchors. Element
  // counts can tie, so they remain a prompt requirement rather than a brittle
  // hard rejection criterion at runtime.
  // Readers naturally use either the Chinese stem (庚) or its Korean name
  // (경금). Both identify the same chart; rejecting the latter causes good
  // Korean reports to be regenerated for presentation rather than substance.
  return [[ctx.dayMaster.stem, ctx.dayMaster.hangul], [ctx.pillars.month.ganji]];
}

export function validateFreeSemantics(
  result: FreeFortuneResult,
  ctx: FortuneAiContext,
  limits: LengthLimits = FREE_LENGTH_LIMITS
): void {
  const errors: string[] = [];

  if ([...result.headline].length > limits.headlineMax) {
    errors.push(`headline too long (>${limits.headlineMax})`);
  }

  errors.push(...validateHookQuality(result.hookLine));

  const summaryLen = [...result.summary].length;
  if (summaryLen < limits.summaryMin || summaryLen > limits.summaryMax) {
    errors.push(`summary length ${summaryLen} out of range`);
  }
  const pLen = [...result.personality.summary].length;
  if (pLen < limits.personalitySummaryMin || pLen > limits.personalitySummaryMax) {
    errors.push(`personality.summary length ${pLen} out of range`);
  }
  const cLen = [...result.currentFlow.summary].length;
  if (cLen < limits.currentFlowSummaryMin || cLen > limits.currentFlowSummaryMax) {
    errors.push(`currentFlow.summary length ${cLen} out of range`);
  }
  for (const preview of result.previews) {
    const len = [...preview.preview].length;
    if (len < limits.previewMin || len > limits.previewMax) {
      errors.push(`preview[${preview.category}] length ${len} out of range`);
    }
  }

  const hookLen = [...result.hookLine].length;
  if (hookLen < limits.hookLineMin || hookLen > limits.hookLineMax) {
    errors.push(`hookLine length ${hookLen} out of range`);
  }
  for (const [label, text] of [
    ["outerVsInner.outer", result.outerVsInner.outer],
    ["outerVsInner.inner", result.outerVsInner.inner],
  ] as const) {
    const len = [...text].length;
    if (len < limits.outerInnerMin || len > limits.outerInnerMax) {
      errors.push(`${label} length ${len} out of range`);
    }
  }
  const hiddenLen = [...result.hiddenSelf.body].length;
  if (hiddenLen < limits.hiddenSelfMin || hiddenLen > limits.hiddenSelfMax) {
    errors.push(`hiddenSelf.body length ${hiddenLen} out of range`);
  }
  const stressLen = [...result.stressPattern].length;
  if (stressLen < limits.stressMin || stressLen > limits.stressMax) {
    errors.push(`stressPattern length ${stressLen} out of range`);
  }
  const sigLen = [...result.signatureClosing].length;
  if (sigLen < limits.signatureMin || sigLen > limits.signatureMax) {
    errors.push(`signatureClosing length ${sigLen} out of range`);
  }
  for (const [label, items] of [
    ["strengths", result.strengths],
    ["cautionPatterns", result.cautionPatterns],
  ] as const) {
    for (const item of items) {
      const len = [...item].length;
      if (len < limits.bulletMin || len > limits.bulletMax) {
        errors.push(`${label} item length ${len} out of range`);
      }
    }
  }

  errors.push(...validateEvidence(result.evidence, ctx, "free"));

  const blob = collectText([
    result.headline,
    result.hookLine,
    result.summary,
    result.outerVsInner.outer,
    result.outerVsInner.inner,
    ...result.outerVsInner.insightBasis,
    result.hiddenSelf.title,
    result.hiddenSelf.body,
    ...result.hiddenSelf.insightBasis,
    result.personality.title,
    result.personality.summary,
    ...result.strengths,
    ...result.cautionPatterns,
    result.stressPattern,
    result.currentFlow.title,
    result.currentFlow.summary,
    result.signatureClosing,
    ...result.previews.map((p) => p.preview),
    ...result.keywords,
  ]);

  const forbidden = findForbidden(blob);
  if (forbidden) errors.push(`forbidden prediction pattern: ${forbidden}`);

  if (ctx.birthTimeUnknown) {
    for (const re of UNKNOWN_HOUR_FORBIDDEN) {
      if (!re.test(blob)) continue;

      // Allow soft limitation mentions of 시주 only (not concrete hour branches).
      if (/시주/.test(re.source)) {
        if (/시주.*(없|추정|알\s*수\s*없|제외|미포함|생략)/.test(blob)) {
          continue;
        }
      }

      errors.push(`unknown-hour text violation: ${re.source}`);
      break;
    }
  }

  if (
    hasDuplicateSentences([
      result.summary,
      result.personality.summary,
      result.currentFlow.summary,
      result.hiddenSelf.body,
      result.stressPattern,
      result.signatureClosing,
      ...result.previews.map((p) => p.preview),
    ])
  ) {
    errors.push("duplicate sentences detected");
  }

  if (errors.length > 0) {
    throw new AiEngineError("SEMANTIC_VALIDATION_FAILED", errors.join("; "), {
      // Content quality is flaky across LLM draws — callers may regenerate.
      retryable: true,
    });
  }
}

export function validatePaidSemantics(
  result: PaidFortuneReport,
  ctx: FortuneAiContext,
  options?: { productSlug?: string | null; requireConsultingDepth?: boolean }
): void {
  const errors: string[] = [];
  const required = requiredSectionKeysForProduct(options?.productSlug);
  const keys = new Set(result.sections.map((s) => s.key));
  for (const req of required) {
    if (!keys.has(req)) errors.push(`missing section: ${req}`);
  }

  if (!result.signatureStatement?.trim()) {
    errors.push("missing signatureStatement");
  }
  const identityTokens = paidChartIdentityTokens(ctx);
  const primarySection = result.sections[0];
  const identityText = [
    result.signatureStatement,
    primarySection?.coreInsight ?? "",
    primarySection?.shareableLine ?? "",
  ].join("\n");
  const missingIdentityAnchors = identityTokens.filter(
    (aliases) => !aliases.some((token) => identityText.includes(token))
  );
  if (missingIdentityAnchors.length > 0) {
    errors.push(
      `paid primary insight is not chart-bound (missing: ${missingIdentityAnchors
        .map((aliases) => aliases.join("/"))
        .join(", ")})`
    );
  }
  if (!result.finalSummary?.closingLine?.trim()) {
    errors.push("missing finalSummary.closingLine");
  }
  if (!result.profileDashboard || result.profileDashboard.length < 4) {
    errors.push("profileDashboard must have ≥4 items");
  }
  if (!result.actionItems || result.actionItems.length < 5) {
    errors.push("actionItems must have ≥5 items");
  }
  if (!result.fiveElementsSnapshot || result.fiveElementsSnapshot.length !== 5) {
    errors.push("fiveElementsSnapshot must have 5 items");
  }

  for (const section of result.sections) {
    if (!section.coreInsight?.trim()) {
      errors.push(`empty coreInsight: ${section.key}`);
    }
    if (!section.behaviorScenes?.length) {
      errors.push(`empty behaviorScenes: ${section.key}`);
    }
    if (!section.evidenceExplanation?.length) {
      errors.push(`empty evidenceExplanation: ${section.key}`);
    }
    const bodyLen = [
      section.coreInsight,
      ...(section.behaviorScenes ?? []),
      ...(section.evidenceExplanation ?? []),
    ].join("").length;
    if (bodyLen < 80) errors.push(`section too thin: ${section.key}`);
    errors.push(
      ...validateEvidence(section.evidence, ctx, `section.${section.key}`)
    );
  }
  errors.push(...validateEvidence(result.evidence, ctx, "paid.root"));

  if (result.contradictions) {
    for (const c of result.contradictions) {
      errors.push(...validateEvidence(c.evidence, ctx, "contradiction"));
    }
  }
  if (result.strengthShadows) {
    for (const s of result.strengthShadows) {
      errors.push(...validateEvidence(s.evidence, ctx, "strengthShadow"));
    }
  }

  if (result.monthlyOutlook) {
    const months = result.monthlyOutlook.map((m) => m.month);
    const uniq = new Set(months);
    if (uniq.size !== 12 || months.some((m) => m < 1 || m > 12)) {
      errors.push("monthlyOutlook must cover months 1..12 uniquely");
    }
  }

  const blob = collectText([
    result.title,
    result.signatureStatement,
    result.freeBridge ?? "",
    result.executiveSummary,
    ...result.profileDashboard.map((p) => `${p.label}${p.value}`),
    ...result.keywords,
    result.blueprint
      ? [
          result.blueprint.dayMasterTerm,
          result.blueprint.dayMasterPlain,
          result.blueprint.fiveElementsNote,
          result.blueprint.tenGodsNote,
          result.blueprint.structurePlain,
          result.blueprint.lifePlain,
        ].join(" ")
      : "",
    ...result.sections.flatMap((s) => [
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
      ...(s.cautions ?? []),
      s.pullQuote ?? "",
    ]),
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
  ]);

  const forbidden = findForbidden(blob);
  if (forbidden) errors.push(`forbidden prediction pattern: ${forbidden}`);

  if (ctx.birthTimeUnknown) {
    for (const re of UNKNOWN_HOUR_FORBIDDEN) {
      if (!re.test(blob)) continue;
      if (/시주/.test(re.source)) {
        if (/시주.*(없|추정|알\s*수\s*없|제외|미포함|생략)/.test(blob)) {
          continue;
        }
      }
      errors.push(`unknown-hour text violation: ${re.source}`);
      break;
    }
  }

  const totalLen = [...blob].length;
  const minLen = isYearTotalProductSlug(options?.productSlug) ? 2800 : 1800;
  if (totalLen < minLen) errors.push(`paid report too short (${totalLen})`);
  const maxLen = isYearTotalProductSlug(options?.productSlug) ? 28_000 : 18_000;
  if (totalLen > maxLen) errors.push(`paid report too long (${totalLen})`);

  const quality = scorePaidReportQuality(result, options);
  if (!quality.pass) {
    errors.push(
      `quality gate fail score=${quality.score}: ${quality.errors
        .slice(0, 6)
        .join("; ")}`
    );
  }

  if (result.reportKind !== "generic") {
    errors.push(
      ...paidQualityV2Errors(result, {
        requireConsultingDepth: options?.requireConsultingDepth,
      })
    );
  }

  if (errors.length > 0) {
    throw new AiEngineError("SEMANTIC_VALIDATION_FAILED", errors.join("; "), {
      retryable: true,
    });
  }
}
