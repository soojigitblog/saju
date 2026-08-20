import type { Tables } from "@/types/database.types";

export type ProductStatus = "DRAFT" | "ACTIVE" | "INACTIVE" | "ARCHIVED";
export type OrderStatus =
  | "PENDING"
  | "PAID"
  | "GENERATING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED";
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
  keywords: string[];
  chapters: {
    number: string;
    title: string;
    body: string;
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
};

export type DbProduct = Tables<"products">;
export type DbProfile = Tables<"profiles">;
export type DbOrder = Tables<"orders">;
export type DbReport = Tables<"reports">;
