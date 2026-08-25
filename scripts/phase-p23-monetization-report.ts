/**
 * PHASE P2.3 — Monetization integrity report (no DB/price apply, no PDF).
 */
import { fortuneEngine } from "../src/lib/fortune-engine";
import { buildFortuneAiContext } from "../src/lib/ai/context";
import { buildInterpretationContextV2 } from "../src/lib/ai/interpretation-context-v2";
import {
  PRODUCT_ROLES,
  productLadderText,
  auditPriceLadder,
  getLaunchRecommendation,
} from "../src/lib/product/portfolio";
import {
  recommendPrimaryProduct,
  twoWayTieUxRecommendation,
} from "../src/lib/product/recommendation";
import {
  LOCKED_PRODUCT_NAMES,
  FAMILY_NAMING_VERDICT,
  TAROT_TIER_SPLIT,
  RECOMMENDED_PRICES,
  buildPurchaseJourneys,
  REVENUE_LADDER_TEXT,
  LAUNCH_SET,
  FINAL_BUSINESS_ROLES,
  UPSELL_TIMING,
  SHARE_LOOP,
  focusVsTotalPriceExplain,
  evaluateMonetizationGate,
} from "../src/lib/product/monetization-p23";

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
const primary = recommendPrimaryProduct(v2);
const gate = evaluateMonetizationGate({
  arbitraryMoneyBiasRemoved: primary.arbitraryMoneyBiasRemoved,
});

console.log(
  JSON.stringify(
    {
      ladder: productLadderText(),
      revenueLadder: REVENUE_LADDER_TEXT,
      lockedNames: LOCKED_PRODUCT_NAMES,
      familyNaming: FAMILY_NAMING_VERDICT,
      tarotSplit: TAROT_TIER_SPLIT.map((t) => ({
        id: t.id,
        name: t.name,
        priceRole: t.priceRole,
      })),
      pricing: RECOMMENDED_PRICES,
      priceAudit: auditPriceLadder(),
      focusVsTotal: focusVsTotalPriceExplain(),
      recommendation: {
        tieBreak: primary.tieBreak,
        needsUserIntent: primary.needsUserIntent,
        primary: primary.primary?.productId ?? null,
        twoWayUx: twoWayTieUxRecommendation(),
        arbitraryMoneyBiasRemoved: primary.arbitraryMoneyBiasRemoved,
      },
      launch: LAUNCH_SET,
      businessRoles: FINAL_BUSINESS_ROLES,
      launchRec: getLaunchRecommendation(),
      journeys: buildPurchaseJourneys(),
      upsellTiming: UPSELL_TIMING,
      shareLoop: SHARE_LOOP,
      rolesSnapshot: {
        free: PRODUCT_ROLES.free.recommendedName,
        money: PRODUCT_ROLES.money.recommendedName,
        career: PRODUCT_ROLES.career.recommendedName,
        love: PRODUCT_ROLES.love.recommendedName,
        total: PRODUCT_ROLES.total.recommendedName,
        tarot: PRODUCT_ROLES.tarot.recommendedName,
        tarot_paid: PRODUCT_ROLES.tarot_paid.recommendedName,
        additional: PRODUCT_ROLES.additional.recommendedName,
      },
      gate,
    },
    null,
    2
  )
);
