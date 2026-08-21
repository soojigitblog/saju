import type { FortuneAiContext } from "@/lib/ai/types";
import {
  buildEvidenceWhitelist,
  isAllowedEvidenceKey,
} from "@/lib/ai/context";
import type { CrossReadingResult } from "@/lib/ai/schemas/cross-reading";
import type { TarotAiContext } from "@/lib/tarot/engine/draw";
import { FORBIDDEN_PREDICTION_PATTERNS } from "@/lib/ai/validators/semantic-validator";
import { AiEngineError } from "@/lib/ai/errors";

export function validateCrossReadingSemantics(
  result: CrossReadingResult,
  fortuneCtx: FortuneAiContext,
  tarotCtx: TarotAiContext
): void {
  const errors: string[] = [];

  const fortuneWhitelist = buildEvidenceWhitelist(fortuneCtx);
  for (const key of result.evidence.fortune) {
    if (!isAllowedEvidenceKey(key, fortuneWhitelist)) {
      errors.push(`fortune evidence invalid: ${key}`);
    }
  }
  for (const key of result.fortunePattern.insightBasis) {
    // insightBasis may be human labels (丁火 일간) — soft check only for hallucinated card names
    if (/the\s+[a-z]+/i.test(key) && !tarotCtx.spread.some((s) => key.includes(s.nameEn))) {
      errors.push(`fortune insightBasis mentions unknown tarot: ${key}`);
    }
  }

  const selectedIds = new Set(tarotCtx.spread.map((s) => s.cardId));
  const selectedSlugs = new Set(tarotCtx.spread.map((s) => s.slug));
  const selectedEn = new Set(tarotCtx.spread.map((s) => s.nameEn.toLowerCase()));

  if (result.cards.length !== 3) errors.push("cards length must be 3");

  for (let i = 0; i < result.cards.length; i++) {
    const card = result.cards[i]!;
    const expected = tarotCtx.spread[i];
    if (!expected) {
      errors.push(`missing expected draw at ${i}`);
      continue;
    }
    if (card.cardId !== expected.cardId) {
      errors.push(`cardId mismatch at ${i}: got ${card.cardId} expected ${expected.cardId}`);
    }
    if (card.orientation !== expected.orientation) {
      errors.push(`orientation mismatch at ${i}`);
    }
    if (card.position !== expected.position || card.positionIndex !== expected.positionIndex) {
      errors.push(`position mismatch at ${i}`);
    }
    if (!selectedIds.has(card.cardId)) {
      errors.push(`non-selected card: ${card.cardId}`);
    }
  }

  for (const t of result.evidence.tarot) {
    const ok =
      selectedIds.has(t) ||
      selectedSlugs.has(t) ||
      [...selectedEn].some((n) => t.toLowerCase().includes(n)) ||
      tarotCtx.spread.some(
        (s) =>
          t.includes(s.nameKo) ||
          t.includes(s.orientation) ||
          t.includes(`${s.nameEn}`)
      );
    if (!ok) errors.push(`tarot evidence not in draw: ${t}`);
  }

  for (const t of result.crossInsight.tarotBasis) {
    const ok = tarotCtx.spread.some(
      (s) =>
        t.includes(s.nameEn) ||
        t.includes(s.nameKo) ||
        t.includes(s.cardId) ||
        t.includes(s.slug)
    );
    if (!ok) errors.push(`crossInsight.tarotBasis unknown card: ${t}`);
  }

  const blob = [
    result.fortunePattern.summary,
    result.crossInsight.headline,
    result.crossInsight.body,
    result.closingMessage,
    ...result.cards.map((c) => c.interpretation),
  ].join("\n");

  for (const re of FORBIDDEN_PREDICTION_PATTERNS) {
    if (re.test(blob)) {
      errors.push(`forbidden prediction: ${re.source}`);
      break;
    }
  }

  if (fortuneCtx.birthTimeUnknown) {
    if (/자시|축시|인시|묘시|진시|사시|오시|미시|신시|유시|술시|해시/.test(blob)) {
      errors.push("unknown-hour concrete branch mentioned");
    }
  }

  if (errors.length > 0) {
    throw new AiEngineError("SEMANTIC_VALIDATION_FAILED", errors.join("; "), {
      retryable: true,
    });
  }
}
