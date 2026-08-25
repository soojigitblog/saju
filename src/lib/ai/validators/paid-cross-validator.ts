import type { PaidCrossReading } from "@/lib/ai/schemas/paid-cross-reading";
import type { CrossReadingResult } from "@/lib/ai/schemas/cross-reading";
import type { TarotAiContext } from "@/lib/tarot/engine/draw";

const FORBIDDEN =
  /(?:^|[\s·,()])(?:대운|세운|월운|용신|신강|신약)(?:[\s·,()?!]|$)|올해\s*이직|몇\s*월에|반드시\s*이직|평생\s*혼자|배신|악연/;

export function validatePaidCrossReadingSemantics(
  data: PaidCrossReading,
  tarotCtx: TarotAiContext
): void {
  const drawnIds = new Set(tarotCtx.spread.map((s) => s.cardId));
  for (const c of data.cards) {
    if (!drawnIds.has(c.cardId)) {
      throw new Error(`PAID_TAROT_CARD_FIDELITY: unknown card ${c.cardId}`);
    }
  }
  if (data.cards.length !== 3) {
    throw new Error("PAID_TAROT_CARD_FIDELITY: need 3 cards");
  }
  if (data.crossConnections.length < 3) {
    throw new Error("PAID_TAROT_CROSS: need >=3 connections");
  }
  if (data.actionOptions.length < 3) {
    throw new Error("PAID_TAROT_ACTION: need >=3 actions");
  }
  if (data.shareableInsight.length < 3) {
    throw new Error("PAID_TAROT_SHARE: need >=3 shareable");
  }

  const blob = JSON.stringify(data);
  if (FORBIDDEN.test(blob)) {
    throw new Error("PAID_TAROT_UNSUPPORTED_CLAIM");
  }
  if (/무조건\s*(좋다|나쁘다)|반드시\s*(하세요|피하세요)/.test(blob)) {
    throw new Error("PAID_TAROT_ABSOLUTE_ADVICE");
  }

  // Cross must mention both saju and tarot linkage words in connections
  for (const cc of data.crossConnections) {
    if (cc.sajuSignal.length < 8 || cc.tarotSignal.length < 8) {
      throw new Error("PAID_TAROT_CROSS: weak connection poles");
    }
  }
}

/** Rough free vs paid overlap (word Jaccard on core texts). */
export function estimateFreePaidTarotOverlap(
  free: CrossReadingResult,
  paid: PaidCrossReading
): number {
  const fw = words(
    [
      free.crossInsight.headline,
      free.crossInsight.body,
      free.closingMessage,
      ...free.cards.map((c) => c.interpretation),
    ].join(" ")
  );
  const pw = words(
    [
      paid.closingInsight,
      paid.threeCardStory,
      paid.hiddenTension.collision,
      ...paid.crossConnections.map((c) => c.connection),
    ].join(" ")
  );
  if (fw.size === 0 || pw.size === 0) return 0;
  let hit = 0;
  for (const w of fw) if (pw.has(w)) hit += 1;
  return hit / Math.min(fw.size, pw.size);
}

function words(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^0-9a-z가-힣\s]/gi, " ")
      .split(/\s+/)
      .filter((x) => x.length >= 2)
  );
}
