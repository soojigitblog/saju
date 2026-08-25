export {
  PRODUCT_ROLES,
  PRODUCT_CONFLICT_MATRIX,
  CURRENT_ACTIVE_PRODUCT_AUDIT,
  CURRENT_INACTIVE_PRODUCT_AUDIT,
  PORTFOLIO_KPI_DEFINITIONS,
  auditPriceLadder,
  getLaunchRecommendation,
  productLadderText,
  hasConflictInMatrix,
  type PortfolioProductId,
  type ProductRole,
  type ConflictLevel,
  type LaunchRecommendation,
  type PriceLadderAudit,
  type PortfolioKpiDefinition,
} from "@/lib/product/portfolio";

export {
  recommendPrimaryProduct,
  recommendNextBestProducts,
  alreadyPurchasedLabel,
  computeFocusScores,
  twoWayTieUxRecommendation,
  type ProductRecommendation,
  type PrimaryRecommendationResult,
  type NextBestResult,
  type PaidFocusId,
  type TieBreakMode,
  type FocusScore,
} from "@/lib/product/recommendation";

export {
  buildInsightShareCard,
  sanitizeInsightLine,
  assertInsightCardPrivacy,
  type InsightShareCardV1,
} from "@/lib/product/share-insight-card";

export {
  ADDITIONAL_QUESTION_SCOPE,
  ADDITIONAL_QUESTION_PRICE_GUIDANCE,
  validateAdditionalQuestion,
  buildAdditionalQuestionPromptSkeleton,
  type AdditionalQuestionInput,
  type AdditionalQuestionScope,
} from "@/lib/product/additional-question";

export {
  LOCKED_PRODUCT_NAMES,
  NAME_ALTERNATIVES,
  FAMILY_NAMING_VERDICT,
  TAROT_TIER_SPLIT,
  RECOMMENDED_PRICES,
  buildPurchaseJourneys,
  REVENUE_LADDER_TEXT,
  LAUNCH_SET,
  FINAL_BUSINESS_ROLES,
  UPSELL_TIMING,
  SHARE_LOOP,
  USER_INTENT_OPTIONS,
  focusVsTotalPriceExplain,
  evaluateMonetizationGate,
  type TarotTierDesign,
  type PurchaseJourney,
  type MonetizationGateCheck,
} from "@/lib/product/monetization-p23";
