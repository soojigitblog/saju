import type { Tables } from "@/types/database.types";

export type ProductStatus = "DRAFT" | "ACTIVE" | "INACTIVE" | "ARCHIVED";
export type OrderStatus =
  | "PENDING"
  | "PAID"
  | "GENERATING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED"
  | "EXPIRED";
export type GenerationStatus = "PENDING" | "GENERATING" | "COMPLETED" | "FAILED";
export type PromptStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";
export type UserRole = "USER" | "ADMIN";

export type Product = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  regularPrice: number;
  salePrice: number;
  thumbnailUrl: string;
  freeRatio: number;
  promptName: string;
  templateId: string;
  status: ProductStatus;
  sortOrder: number;
  productType?: string;
  promptVersionId?: string | null;
};

export type FortuneScoreKey = "overall" | "money" | "career" | "love";

export type FortuneSection = {
  key: string;
  title: string;
  summary: string;
  detail: string;
  locked?: boolean;
};

export type FreeResult = {
  id: string;
  nickname: string;
  headline: string;
  summary: string;
  scores: Record<FortuneScoreKey, number>;
  keywords: string[];
  sections: FortuneSection[];
  recommendedProductSlug: string;
};

export type PaidReport = {
  id: string;
  orderNo: string;
  nickname: string;
  productName: string;
  headline: string;
  summary: string;
  signatureStatement?: string;
  freeBridge?: string;
  profileDashboard?: { label: string; value: string }[];
  profileScales?: {
    label: string;
    level: "low" | "mid" | "high";
    leftLabel: string;
    rightLabel: string;
    note: string;
  }[];
  fiveElementsSnapshot?: {
    key: "wood" | "fire" | "earth" | "metal" | "water";
    label: string;
    count: number;
  }[];
  keywords: string[];
  blueprint?: {
    dayMasterTerm: string;
    dayMasterPlain: string;
    fiveElementsNote: string;
    tenGodsNote: string;
    structurePlain: string;
    lifePlain: string;
  };
  chapters: {
    number: string;
    title: string;
    question?: string;
    coreInsight?: string;
    body: string;
    behaviorScenes?: string[];
    strengthSide?: string;
    riskSide?: string;
    triggerSituation?: string;
    practicalMeaning?: string;
    actionAdvice?: string[];
    evidenceExplanation?: string[];
    takeaway?: string;
    whyReading?: string;
    evidence?: string[];
    cautions?: string[];
    pullQuote?: string;
    narrativeBridge?: string;
    paradoxNote?: string;
    includeWhyBox?: boolean;
  }[];
  contradictions?: {
    poleA: string;
    poleB: string;
    howItShows: string;
    upside: string;
    downside: string;
    whenStronger: string;
    result?: string;
  }[];
  strengthShadows?: {
    strength: string;
    overuse: string;
    problem: string;
    balancePoint?: string;
  }[];
  lifeScenes?: string[];
  scopeNotes?: string;
  actionItems?: {
    domain: string;
    when?: string;
    what: string;
    why: string;
    how: string;
  }[];
  actionGuide?: string[];
  finalSummary?: {
    strengths: string[];
    cautions: string[];
    changeHabits?: string[];
    keepHabits?: string[];
    closingLine: string;
  };
  monthlyOutlook?: {
    month: number;
    title: string;
    summary: string;
    detail: string;
    focus?: string[];
  }[];
};

export type AdminDashboardStats = {
  visitors: number;
  freeFortune: number;
  payments: number;
  revenue: number;
  conversionRate: number;
  funnel: { label: string; value: number }[];
  productPerformance: { name: string; purchases: number; revenue: number }[];
};

export type FortuneFormValues = {
  nickname: string;
  gender: "male" | "female" | "";
  birthYear: string;
  birthMonth: string;
  birthDay: string;
  calendarType: "solar" | "lunar";
  lunarLeapMonth: boolean;
  birthTimeKnown: boolean;
  birthTime: string;
  birthPlace: string;
  maritalStatus: "unmarried" | "married" | "prefer_not" | "";
  hasChildren: "yes" | "no" | "prefer_not" | "";
};

export type DbProduct = Tables<"products">;
export type DbProfile = Tables<"profiles">;
export type DbOrder = Tables<"orders">;
export type DbReport = Tables<"reports">;
