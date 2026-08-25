import { describe, expect, it } from "vitest";
import { fortuneEngine } from "@/lib/fortune-engine";
import { buildFortuneAiContext } from "@/lib/ai/context";
import { buildInterpretationContextV2 } from "@/lib/ai/interpretation-context-v2";
import { buildMockPaidResult } from "@/lib/ai/interpreters/mock-content";
import {
  PRODUCT_ROLES,
  auditPriceLadder,
  getLaunchRecommendation,
  hasConflictInMatrix,
} from "@/lib/product/portfolio";
import {
  recommendPrimaryProduct,
  recommendNextBestProducts,
  twoWayTieUxRecommendation,
} from "@/lib/product/recommendation";
import {
  LOCKED_PRODUCT_NAMES,
  FAMILY_NAMING_VERDICT,
  TAROT_TIER_SPLIT,
  RECOMMENDED_PRICES,
  buildPurchaseJourneys,
  LAUNCH_SET,
  FINAL_BUSINESS_ROLES,
  evaluateMonetizationGate,
} from "@/lib/product/monetization-p23";

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
const ctx = buildFortuneAiContext(chart);
const v2 = buildInterpretationContextV2(ctx, chart);

describe("PHASE P2.3 monetization integrity", () => {
  it("splits free tarot and paid tarot roles", () => {
    expect(TAROT_TIER_SPLIT).toHaveLength(2);
    expect(PRODUCT_ROLES.tarot.currentStatus).toBe("FREE_FLOW");
    expect(PRODUCT_ROLES.tarot_paid.currentStatus).toBe("ACTIVE");
    expect(PRODUCT_ROLES.tarot.recommendedName).toBe(LOCKED_PRODUCT_NAMES.tarot_free);
    expect(PRODUCT_ROLES.tarot_paid.recommendedName).toBe(
      LOCKED_PRODUCT_NAMES.tarot_paid
    );
    expect(getLaunchRecommendation().bestRepurchaseProduct).toBe("tarot_paid");
  });

  it("locks family naming and additional question name", () => {
    expect(FAMILY_NAMING_VERDICT.decision).toBe("KEEP");
    expect(LOCKED_PRODUCT_NAMES.money).toBe("나의 돈 사용설명서");
    expect(LOCKED_PRODUCT_NAMES.additional).toBe("한 가지 더 묻기");
    expect(PRODUCT_ROLES.additional.recommendedName).toBe("한 가지 더 묻기");
  });

  it("removes arbitrary Money bias on two-way ties", () => {
    const rec = recommendPrimaryProduct(v2);
    expect(rec.arbitraryMoneyBiasRemoved).toBe(true);
    if (rec.tieBreak === "two_way_intent") {
      expect(rec.needsUserIntent).toBe(true);
      expect(rec.primary).toBeNull();
      expect(rec.intentOptions.length).toBe(4);
    }
    expect(twoWayTieUxRecommendation().preferred).toBe("user_intent");
  });

  it("honors user intent when provided", () => {
    const rec = recommendPrimaryProduct(v2, { userIntent: "career" });
    expect(rec.primary?.productId).toBe("career");
    expect(rec.primary?.source).toBe("user_intent");
    expect(rec.needsUserIntent).toBe(false);
  });

  it("routes second paid to tarot_paid after focus purchase", () => {
    const love = buildMockPaidResult(ctx, "나의 연애 사용설명서", {
      productSlug: "2026-love",
      chart,
    });
    const next = recommendNextBestProducts({
      purchased: ["love"],
      possibleNextQuestions: love.possibleNextQuestions,
    });
    expect(next.next.some((x) => x.productId === "tarot_paid")).toBe(true);
    expect(next.next.every((x) => x.productId !== "love")).toBe(true);
  });

  it("recommends prices without wiring checkout", () => {
    expect(RECOMMENDED_PRICES.tarot_paid.recommended).toBe(4900);
    expect(RECOMMENDED_PRICES.additional.recommended).toBe(2900);
    expect(RECOMMENDED_PRICES.money.recommended).toBe(6900);
    const ladder = auditPriceLadder();
    expect(ladder.tarotPaidRecommended).toBe(4900);
    expect(ladder.additionalRecommended).toBe(2900);
    expect(ladder.verdict).toBe("PASS");
  });

  it("computes journey economics under recommended prices", () => {
    const journeys = buildPurchaseJourneys();
    expect(journeys.find((j) => j.id === "A")?.totalKrw).toBe(6900);
    expect(journeys.find((j) => j.id === "B")?.totalKrw).toBe(13800);
    expect(journeys.find((j) => j.id === "C")?.totalKrw).toBe(11800);
    expect(journeys.find((j) => j.id === "D")?.totalKrw).toBe(17800);
    expect(journeys.find((j) => j.id === "E")?.totalKrw).toBe(21600);
  });

  it("keeps day1 launch set lean and monetization gate ready", () => {
    expect(LAUNCH_SET.day1).toContain("tarot_paid");
    expect(LAUNCH_SET.later).toContain("additional");
    expect(FINAL_BUSINESS_ROLES.bestRepeat).toBe("tarot_paid");
    expect(hasConflictInMatrix()).toBe(false);
    const gate = evaluateMonetizationGate({ arbitraryMoneyBiasRemoved: true });
    expect(gate.ready).toBe(true);
    expect(gate.freeTarotDoesNotBlockRevenue).toBe(true);
  });
});
