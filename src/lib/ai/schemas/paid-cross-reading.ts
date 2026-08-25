import { z } from "zod";

const shortLine = z.string().min(1).max(200);
const midLine = z.string().min(1).max(320);
const longLine = z.string().min(1).max(500);

export const paidCrossConnectionSchema = z.object({
  id: z.string().min(1).max(40),
  sajuSignal: midLine,
  tarotSignal: midLine,
  connection: longLine,
  practicalMeaning: midLine,
});

export const paidCrossReadingSchema = z.object({
  reportKind: z.literal("paid_tarot"),
  interpretationVersion: z.string().min(1).max(24).default("p24-v1"),
  title: z.string().min(1).max(80),
  questionSummary: z.object({
    original: z.string().min(1).max(280),
    structured: z.string().min(1).max(280),
    decisionAxes: z.array(z.string().min(1).max(80)).min(1).max(4),
  }),
  sajuBaseline: z.object({
    summary: longLine,
    relevantAxes: z.array(z.string().min(1).max(40)).min(1).max(8),
    domain: z
      .enum(["money", "career", "love", "relationships", "advice", "custom"])
      .optional(),
  }),
  cards: z
    .array(
      z.object({
        position: z.enum(["CURRENT", "BLOCK", "DIRECTION"]),
        positionIndex: z.union([z.literal(1), z.literal(2), z.literal(3)]),
        positionLabel: z.string().min(1).max(40),
        cardId: z.string().min(1),
        nameKo: z.string().min(1).max(40),
        orientation: z.enum(["UPRIGHT", "REVERSED"]),
        canonicalMeaning: z.string().min(1).max(220),
      })
    )
    .length(3),
  cardInterpretations: z
    .array(
      z.object({
        position: z.enum(["CURRENT", "BLOCK", "DIRECTION"]),
        body: longLine,
      })
    )
    .length(3),
  threeCardStory: longLine,
  crossConnections: z.array(paidCrossConnectionSchema).min(3).max(6),
  hiddenTension: z.object({
    innateWay: midLine,
    cardPressure: midLine,
    collision: longLine,
    riskIfIgnored: midLine,
  }),
  choicePerspective: z.object({
    optionA: midLine,
    optionB: midLine,
    checkBeforeDecide: z.array(shortLine).min(2).max(5),
  }),
  riskPattern: midLine,
  actionOptions: z.array(shortLine).min(3).max(6),
  whatToWatch: midLine,
  closingInsight: midLine,
  evidence: z.object({
    fortune: z.array(z.string().min(1).max(60)).min(1).max(12),
    tarot: z.array(z.string().min(1).max(60)).min(1).max(6),
  }),
  shareableInsight: z.array(z.string().min(1).max(140)).min(3).max(6),
  possibleNextQuestions: z.array(z.string().min(1).max(180)).min(2).max(6),
  disclaimer: z.string().min(1),
});

export type PaidCrossReading = z.infer<typeof paidCrossReadingSchema>;
export const paidCrossReadingStrictSchema = paidCrossReadingSchema;
