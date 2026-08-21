import { z } from "zod";

const insightBasisSchema = z.array(z.string().min(1).max(40)).min(1).max(6);

export const crossReadingResultSchema = z.object({
  fortunePattern: z.object({
    title: z.string().min(1).max(40),
    summary: z.string().min(40).max(280),
    insightBasis: insightBasisSchema,
  }),
  cards: z
    .array(
      z.object({
        position: z.enum(["CURRENT", "BLOCK", "DIRECTION"]),
        positionIndex: z.union([z.literal(1), z.literal(2), z.literal(3)]),
        cardId: z.string().min(1),
        nameKo: z.string().min(1),
        orientation: z.enum(["UPRIGHT", "REVERSED"]),
        interpretation: z.string().min(40).max(220),
      })
    )
    .length(3),
  crossInsight: z.object({
    headline: z.string().min(12).max(80),
    body: z.string().min(80).max(400),
    fortuneBasis: insightBasisSchema,
    tarotBasis: z.array(z.string().min(1).max(60)).min(1).max(5),
  }),
  closingMessage: z.string().min(20).max(160),
  evidence: z.object({
    fortune: z.array(z.string().min(1)).min(1).max(12),
    tarot: z.array(z.string().min(1)).min(1).max(6),
  }),
  disclaimer: z.string().min(1),
});

export type CrossReadingResult = z.infer<typeof crossReadingResultSchema>;
export const crossReadingResultStrictSchema = crossReadingResultSchema;
