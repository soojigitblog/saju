import { z } from "zod";

const scoreSchema = z.number().int().min(1).max(5);

const insightBasisSchema = z.array(z.string().min(1).max(40)).min(1).max(5);

/**
 * Free fortune structured output — Interpretation V2.
 * Additive signature fields for 운의결 voice; Fortune Engine unchanged.
 */
export const freeFortuneResultSchema = z.object({
  /** Short report title (not the main hook). */
  headline: z.string().min(1).max(30),
  /** 운의결 한 줄 — primary personalization hook. */
  hookLine: z.string().min(18).max(48),
  summary: z.string().min(80).max(400),
  keywords: z.array(z.string().min(1)).min(1).max(8),
  scores: z.object({
    overall: scoreSchema,
    money: scoreSchema,
    career: scoreSchema,
    love: scoreSchema,
  }),
  /** 겉으로 보이는 나 / 실제 나 */
  outerVsInner: z.object({
    outer: z.string().min(20).max(100),
    inner: z.string().min(20).max(100),
    insightBasis: insightBasisSchema,
  }),
  /** 당신이 잘 모르는 당신의 모습 */
  hiddenSelf: z.object({
    title: z.string().min(1),
    body: z.string().min(40).max(180),
    insightBasis: insightBasisSchema,
  }),
  personality: z.object({
    title: z.string().min(1),
    summary: z.string().min(60).max(320),
  }),
  /** 타고난 강점 — concrete behavior patterns */
  strengths: z.array(z.string().min(12).max(80)).min(2).max(4),
  /** 주의해야 할 패턴 — same trait when overdone */
  cautionPatterns: z.array(z.string().min(12).max(80)).min(2).max(4),
  /** 스트레스가 쌓일 때의 모습 */
  stressPattern: z.string().min(40).max(160),
  currentFlow: z.object({
    title: z.string().min(1),
    summary: z.string().min(60).max(320),
  }),
  previews: z
    .array(
      z.object({
        category: z.enum(["money", "career", "love", "relationships", "timing"]),
        preview: z.string().min(40).max(180),
        locked: z.boolean(),
      })
    )
    .min(3)
    .max(5),
  /** 운의결 한마디 — signature closing */
  signatureClosing: z.string().min(40).max(180),
  evidence: z.array(z.string().min(1)).min(1).max(20),
  disclaimer: z.string().min(1),
});

export type FreeFortuneResult = z.infer<typeof freeFortuneResultSchema>;

export const freeFortuneResultStrictSchema = freeFortuneResultSchema;
