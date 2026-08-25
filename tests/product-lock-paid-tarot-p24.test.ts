import { describe, expect, it } from "vitest";
import { fortuneEngine } from "@/lib/fortune-engine";
import { buildFortuneAiContext } from "@/lib/ai/context";
import { buildInterpretationContextV2 } from "@/lib/ai/interpretation-context-v2";
import { buildMockPaidResult } from "@/lib/ai/interpreters/mock-content";
import { buildMockCrossReading } from "@/lib/ai/interpreters/mock-cross-content";
import { buildMockPaidCrossReading } from "@/lib/ai/interpreters/mock-paid-cross";
import { paidCrossReadingStrictSchema } from "@/lib/ai/schemas/paid-cross-reading";
import {
  estimateFreePaidTarotOverlap,
  validatePaidCrossReadingSemantics,
} from "@/lib/ai/validators/paid-cross-validator";
import { LOCKED_PRODUCT_NAMES } from "@/lib/product/monetization-p23";
import {
  CURRENT_ACTIVE_PRODUCT_AUDIT,
  PRODUCT_ROLES,
} from "@/lib/product/portfolio";
import { MOCK_PRODUCT_IDS, mockProducts } from "@/lib/mock-data";
import {
  buildTarotAiContext,
  resolveDrawsFromSlots,
  shuffleDeck,
} from "@/lib/tarot/engine/draw";
import { buildPaidCrossGenerationKey } from "@/lib/ai/paid-cross-reading";

const chart = fortuneEngine.calculate({
  gender: "female",
  calendarType: "solar",
  birthDate: "1990-05-15",
  birthTime: "10:30",
  birthTimeUnknown: false,
  lunarLeapMonth: false,
  timezone: "Asia/Seoul",
  countryCode: "KR",
});
const fortuneCtx = buildFortuneAiContext(chart);
const v2 = buildInterpretationContextV2(fortuneCtx, chart);

function tarotFor(
  category: string,
  question: string | null
): ReturnType<typeof buildTarotAiContext> {
  const draws = resolveDrawsFromSlots(shuffleDeck(), [0, 1, 2]);
  return buildTarotAiContext({
    questionCategory: category,
    questionText: question,
    draws,
  });
}

describe("PHASE P2.4 product lock + paid tarot", () => {
  it("locks ACTIVE catalog names and server-side prices", () => {
    const bySlug = Object.fromEntries(mockProducts.map((p) => [p.slug, p]));
    expect(bySlug["2026-money"]?.name).toBe(LOCKED_PRODUCT_NAMES.money);
    expect(bySlug["2026-career"]?.name).toBe(LOCKED_PRODUCT_NAMES.career);
    expect(bySlug["2026-love"]?.name).toBe(LOCKED_PRODUCT_NAMES.love);
    expect(bySlug["2026-total"]?.name).toBe(LOCKED_PRODUCT_NAMES.total);
    expect(bySlug["saju-tarot-deep"]?.name).toBe(LOCKED_PRODUCT_NAMES.tarot_paid);

    expect(bySlug["2026-money"]?.salePrice).toBe(6900);
    expect(bySlug["2026-career"]?.salePrice).toBe(6900);
    expect(bySlug["2026-love"]?.salePrice).toBe(6900);
    expect(bySlug["2026-total"]?.salePrice).toBe(12900);
    expect(bySlug["saju-tarot-deep"]?.salePrice).toBe(4900);
    expect(bySlug["saju-tarot-deep"]?.productType).toBe("tarot_paid");
    expect(bySlug["saju-tarot-deep"]?.id).toBe(MOCK_PRODUCT_IDS.paidTarot);

    for (const row of CURRENT_ACTIVE_PRODUCT_AUDIT) {
      expect(row.name).not.toMatch(/재물운 집중분석|직장·이직운|^연애운$|종합 사주 리포트/);
    }
    expect(PRODUCT_ROLES.tarot.currentName).toBe(LOCKED_PRODUCT_NAMES.tarot_free);
    expect(PRODUCT_ROLES.tarot_paid.currentStatus).toBe("ACTIVE");
    expect(PRODUCT_ROLES.additional.currentStatus).toBe("DESIGN_ONLY");
  });

  it("keeps historical product_name_snapshot conceptual safety (id/slug unchanged)", () => {
    const money = mockProducts.find((p) => p.slug === "2026-money")!;
    expect(money.id).toBe(MOCK_PRODUCT_IDS.money);
    // Rename is display-only; FK id/slug must not change.
    expect(money.slug).toBe("2026-money");
    const historicalSnapshot = "재물운 집중분석";
    expect(historicalSnapshot).not.toBe(money.name);
  });

  it("builds PaidCrossReadingV1 with required depth fields", () => {
    const categories = [
      ["career", "회사 옮길까?"],
      ["money", "큰 지출을 지금 해도 될까?"],
      ["love", "이 사람과 더 깊어져도 될까?"],
      ["relationships", "이 사람과 거리를 어떻게 둘까?"],
      ["advice", "지금 결정을 미뤄도 될까?"],
    ] as const;

    for (const [category, question] of categories) {
      const tarot = tarotFor(category, question);
      const paid = buildMockPaidCrossReading(fortuneCtx, v2, tarot);
      const parsed = paidCrossReadingStrictSchema.parse(paid);
      expect(parsed.reportKind).toBe("paid_tarot");
      expect(parsed.crossConnections.length).toBeGreaterThanOrEqual(3);
      expect(parsed.actionOptions.length).toBeGreaterThanOrEqual(3);
      expect(parsed.shareableInsight.length).toBeGreaterThanOrEqual(3);
      expect(parsed.hiddenTension.collision.length).toBeGreaterThan(20);
      expect(parsed.questionSummary.structured).not.toMatch(/올해\s*이직운|몇\s*월/);
      validatePaidCrossReadingSemantics(parsed, tarot);
    }
  });

  it("separates free vs paid tarot (blind depth + low overlap)", () => {
    const tarot = tarotFor("career", "회사 옮길까?");
    const free = buildMockCrossReading(fortuneCtx, tarot);
    const paid = buildMockPaidCrossReading(fortuneCtx, v2, tarot);

    expect(free).not.toHaveProperty("hiddenTension");
    expect(paid.hiddenTension).toBeTruthy();
    expect(paid.crossConnections.length).toBeGreaterThanOrEqual(3);
    expect(paid.choicePerspective.checkBeforeDecide.length).toBeGreaterThanOrEqual(2);

    const freeLen =
      free.crossInsight.body.length +
      free.cards.reduce((n, c) => n + c.interpretation.length, 0);
    const paidLen =
      paid.threeCardStory.length +
      paid.crossConnections.reduce((n, c) => n + c.connection.length, 0) +
      paid.hiddenTension.collision.length +
      paid.cardInterpretations.reduce((n, c) => n + c.body.length, 0);
    expect(paidLen).toBeGreaterThan(freeLen * 1.4);

    const overlap = estimateFreePaidTarotOverlap(free, paid);
    expect(overlap).toBeLessThanOrEqual(0.25);
  });

  it("differentiates Career Focus vs Paid Career Tarot", () => {
    const careerFocus = buildMockPaidResult(fortuneCtx, "나의 일 사용설명서", {
      productSlug: "2026-career",
    });
    const tarot = tarotFor("career", "회사 옮길까?");
    const paidTarot = buildMockPaidCrossReading(fortuneCtx, v2, tarot);

    const focusBlob = JSON.stringify(careerFocus);
    expect(focusBlob).toMatch(/일|업무|조직|능력/);
    expect(paidTarot.questionSummary.structured).toMatch(/남을지|선택/);
    expect(paidTarot.cards).toHaveLength(3);
    expect(
      paidTarot.crossConnections.every(
        (c) => c.sajuSignal.length >= 8 && c.tarotSignal.length >= 8
      )
    ).toBe(true);
    // Focus answers "who am I at work"; Paid answers collision of pattern × current cards.
    expect(paidTarot.hiddenTension.innateWay.length).toBeGreaterThan(8);
    expect(paidTarot.hiddenTension.cardPressure.length).toBeGreaterThan(8);
    expect(paidTarot.threeCardStory).toMatch(/세 카드/);
  });

  it("dedupes paid tarot generation key per order", () => {
    const a = buildPaidCrossGenerationKey({
      calculationHash: chart.engine.calculationHash,
      orderId: "order-1",
      questionFingerprint: "career|회사 옮길까?",
      provider: "mock",
      model: "mock",
    });
    const b = buildPaidCrossGenerationKey({
      calculationHash: chart.engine.calculationHash,
      orderId: "order-1",
      questionFingerprint: "career|회사 옮길까?",
      provider: "mock",
      model: "mock",
    });
    const c = buildPaidCrossGenerationKey({
      calculationHash: chart.engine.calculationHash,
      orderId: "order-2",
      questionFingerprint: "career|회사 옮길까?",
      provider: "mock",
      model: "mock",
    });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it("rejects unknown cards in paid fidelity check", () => {
    const tarot = tarotFor("advice", "지금 어떻게 할까?");
    const paid = buildMockPaidCrossReading(fortuneCtx, v2, tarot);
    const bad = {
      ...paid,
      cards: paid.cards.map((c, i) =>
        i === 0 ? { ...c, cardId: "not-a-real-card" } : c
      ),
    };
    expect(() => validatePaidCrossReadingSemantics(bad, tarot)).toThrow(
      /PAID_TAROT_CARD_FIDELITY/
    );
  });
});
