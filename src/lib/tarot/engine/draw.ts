import { randomBytes } from "node:crypto";
import { TAROT_DECK, getCardById, assertDeckIntegrity } from "@/lib/tarot/deck/cards";
import {
  SPREAD_POSITIONS,
  type DrawnCard,
  type ShuffledDeckSlot,
  type TarotOrientation,
} from "@/lib/tarot/types";

assertDeckIntegrity();

/** Fisher–Yates using crypto random bytes (not AI). */
export function shuffleDeck(): ShuffledDeckSlot[] {
  const slots: ShuffledDeckSlot[] = TAROT_DECK.map((card, deckIndex) => ({
    deckIndex,
    cardId: card.id,
    orientation: randomOrientation(),
  }));

  for (let i = slots.length - 1; i > 0; i--) {
    const j = cryptoUniformInt(i + 1);
    const tmp = slots[i]!;
    slots[i] = slots[j]!;
    slots[j] = tmp;
  }
  return slots;
}

function randomOrientation(): TarotOrientation {
  return cryptoUniformInt(2) === 0 ? "UPRIGHT" : "REVERSED";
}

function cryptoUniformInt(maxExclusive: number): number {
  if (maxExclusive <= 0) throw new Error("maxExclusive must be > 0");
  const max = 0x1_0000_0000;
  const limit = max - (max % maxExclusive);
  let x: number;
  do {
    x = randomBytes(4).readUInt32BE(0);
  } while (x >= limit);
  return x % maxExclusive;
}

/** Present N unique slots from shuffled deck for UI (default 15). */
export function pickPresentationSlots(
  shuffled: ShuffledDeckSlot[],
  count = 15
): Array<{ slotIndex: number; cardId: string }> {
  const n = Math.min(count, shuffled.length);
  return shuffled.slice(0, n).map((s, slotIndex) => ({
    slotIndex,
    cardId: s.cardId,
  }));
}

/**
 * Resolve 3 unique presentation slot indices into ordered draws.
 * Slot indices refer to presentation array (0..n-1), which maps to shuffled[0..n-1].
 */
export function resolveDrawsFromSlots(
  shuffled: ShuffledDeckSlot[],
  selectedSlotIndices: [number, number, number]
): DrawnCard[] {
  const unique = new Set(selectedSlotIndices);
  if (unique.size !== 3) {
    throw new Error("THREE_UNIQUE_SLOTS_REQUIRED");
  }

  return selectedSlotIndices.map((slotIndex, i) => {
    if (slotIndex < 0 || slotIndex >= shuffled.length) {
      throw new Error("INVALID_SLOT_INDEX");
    }
    const slot = shuffled[slotIndex]!;
    const card = getCardById(slot.cardId);
    if (!card) throw new Error(`UNKNOWN_CARD:${slot.cardId}`);
    const pos = SPREAD_POSITIONS[i]!;
    const upright = slot.orientation === "UPRIGHT";
    return {
      position: pos.position,
      positionIndex: pos.positionIndex,
      cardId: card.id,
      slug: card.slug,
      nameEn: card.nameEn,
      nameKo: card.nameKo,
      orientation: slot.orientation,
      canonicalMeaning: upright
        ? card.shortMeaningUpright
        : card.shortMeaningReversed,
      keywords: upright ? card.keywordsUpright : card.keywordsReversed,
    };
  });
}

export function buildTarotAiContext(input: {
  questionCategory: string;
  questionText: string | null;
  draws: DrawnCard[];
}) {
  return {
    questionCategory: input.questionCategory,
    question: input.questionText,
    spreadType: "THREE_ADVICE" as const,
    spread: input.draws.map((d) => ({
      position: d.position,
      positionIndex: d.positionIndex,
      cardId: d.cardId,
      slug: d.slug,
      nameEn: d.nameEn,
      nameKo: d.nameKo,
      orientation: d.orientation,
      canonicalMeaning: d.canonicalMeaning,
      keywords: d.keywords,
    })),
  };
}

export type TarotAiContext = ReturnType<typeof buildTarotAiContext>;
