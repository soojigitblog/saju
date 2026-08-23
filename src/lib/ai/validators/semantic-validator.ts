import type { FortuneAiContext } from "@/lib/ai/types";
import {
  buildEvidenceWhitelist,
  isAllowedEvidenceKey,
} from "@/lib/ai/context";
import type { FreeFortuneResult } from "@/lib/ai/schemas/free-result";
import {
  REQUIRED_PAID_SECTION_KEYS,
  isYearTotalProductSlug,
  type PaidFortuneReport,
} from "@/lib/ai/schemas/paid-report";
import { validateHookQuality } from "@/lib/ai/validators/hook-quality";
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
  options?: { productSlug?: string | null }
): void {
  const errors: string[] = [];
  const keys = new Set(result.sections.map((s) => s.key));
  for (const required of REQUIRED_PAID_SECTION_KEYS) {
    if (!keys.has(required)) errors.push(`missing section: ${required}`);
  }

  for (const section of result.sections) {
    if (!section.detail.trim()) errors.push(`empty detail: ${section.key}`);
    errors.push(...validateEvidence(section.evidence, ctx, `section.${section.key}`));
  }
  errors.push(...validateEvidence(result.evidence, ctx, "paid.root"));

  const needsMonthly = isYearTotalProductSlug(options?.productSlug);
  if (needsMonthly) {
    if (!result.monthlyOutlook || result.monthlyOutlook.length !== 12) {
      errors.push("year-total product requires monthlyOutlook[12]");
    }
  }
  if (result.monthlyOutlook) {
    const months = result.monthlyOutlook.map((m) => m.month);
    const uniq = new Set(months);
    if (uniq.size !== 12 || months.some((m) => m < 1 || m > 12)) {
      errors.push("monthlyOutlook must cover months 1..12 uniquely");
    }
    for (const m of result.monthlyOutlook) {
      if (!m.detail.trim()) errors.push(`empty monthly detail: ${m.month}`);
    }
  }

  const blob = collectText([
    result.title,
    result.executiveSummary,
    ...result.keywords,
    ...result.actionGuide,
    ...result.sections.flatMap((s) => [
      s.title,
      s.summary,
      s.detail,
      ...s.cautions,
    ]),
    ...(result.monthlyOutlook ?? []).flatMap((m) => [
      m.title,
      m.summary,
      m.detail,
      ...(m.focus ?? []),
    ]),
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
  if (totalLen < 800) errors.push(`paid report too short (${totalLen})`);
  // Year-total with 12 months can be longer
  const maxLen = needsMonthly || result.monthlyOutlook ? 20_000 : 12_000;
  if (totalLen > maxLen) errors.push(`paid report too long (${totalLen})`);

  if (errors.length > 0) {
    throw new AiEngineError("SEMANTIC_VALIDATION_FAILED", errors.join("; "), {
      retryable: true,
    });
  }
}
