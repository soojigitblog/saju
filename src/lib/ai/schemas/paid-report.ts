import { z } from "zod";

export const paidSectionKeySchema = z.enum([
  "personality",
  "overall",
  "money",
  "career",
  "love",
  "relationships",
  "timing",
  "advice",
]);

export const paidSectionSchema = z.object({
  key: paidSectionKeySchema,
  title: z.string().min(1),
  summary: z.string().min(1),
  detail: z.string().min(1),
  evidence: z.array(z.string().min(1)).min(1).max(15),
  cautions: z.array(z.string().min(1)).max(8),
});

/** Per-month outlook for year-total products (2026/2027 comprehensive). */
export const paidMonthlyOutlookSchema = z.object({
  month: z.number().int().min(1).max(12),
  title: z.string().min(1).max(40),
  summary: z.string().min(1).max(120),
  detail: z.string().min(1).max(600),
  focus: z.array(z.string().min(1).max(20)).max(4).optional(),
});

/** Single source of truth for paid structured output (Zod ↔ OpenAI). */
export const paidFortuneReportSchema = z.object({
  title: z.string().min(1),
  executiveSummary: z.string().min(1),
  keywords: z.array(z.string().min(1)).min(1).max(10),
  sections: z.array(paidSectionSchema).min(5).max(8),
  /** Required for *-total year products; optional for focused products. */
  monthlyOutlook: z.array(paidMonthlyOutlookSchema).length(12).optional(),
  actionGuide: z.array(z.string().min(1)).min(2).max(8),
  evidence: z.array(z.string().min(1)).min(1).max(20),
  disclaimer: z.string().min(1),
});

export type PaidFortuneReport = z.infer<typeof paidFortuneReportSchema>;
export type PaidSectionKey = z.infer<typeof paidSectionKeySchema>;
export type PaidMonthlyOutlook = z.infer<typeof paidMonthlyOutlookSchema>;

export const paidFortuneReportStrictSchema = paidFortuneReportSchema;

export const REQUIRED_PAID_SECTION_KEYS: PaidSectionKey[] = [
  "personality",
  "overall",
  "money",
  "career",
  "love",
  "advice",
];

export function isYearTotalProductSlug(slug: string | undefined | null): boolean {
  if (!slug) return false;
  return /-(total)$/i.test(slug);
}
