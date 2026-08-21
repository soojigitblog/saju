import { z } from "zod";
import { birthInputSchema } from "@/lib/fortune-engine/validation/birth-input-schema";

export const freeFortuneRequestSchema = z
  .object({
    nickname: z.string().trim().min(1).max(20),
    gender: z.enum(["male", "female"]),
    calendarType: z.enum(["solar", "lunar"]),
    birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    birthTime: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
    birthTimeUnknown: z.boolean(),
    lunarLeapMonth: z.boolean().optional().default(false),
    birthPlace: z.string().trim().min(1).max(40),
    timezone: z.literal("Asia/Seoul").default("Asia/Seoul"),
    maritalStatus: z.enum(["unmarried", "married", "prefer_not"]),
    /** Required when maritalStatus=married; otherwise ignored. */
    hasChildren: z.enum(["yes", "no", "prefer_not"]).nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.maritalStatus === "married") {
      if (!value.hasChildren) {
        ctx.addIssue({
          code: "custom",
          message: "기혼이시면 자녀 유무를 선택해 주세요.",
          path: ["hasChildren"],
        });
      }
    }

    const birth = birthInputSchema.safeParse({
      gender: value.gender,
      calendarType: value.calendarType,
      birthDate: value.birthDate,
      birthTime: value.birthTimeUnknown ? null : value.birthTime,
      birthTimeUnknown: value.birthTimeUnknown,
      lunarLeapMonth: value.lunarLeapMonth,
      timezone: value.timezone,
      countryCode: "KR",
    });
    if (!birth.success) {
      for (const issue of birth.error.issues) {
        ctx.addIssue({
          code: "custom",
          message: issue.message,
          path: issue.path,
        });
      }
    }
  });

export type FreeFortuneRequest = z.infer<typeof freeFortuneRequestSchema>;

/** Canonical string for profile reuse (same guest + same birth facts). */
export function buildCanonicalBirthKey(input: FreeFortuneRequest): string {
  return [
    input.gender,
    input.calendarType,
    input.birthDate,
    input.birthTimeUnknown ? "unknown" : input.birthTime ?? "",
    input.lunarLeapMonth ? "leap" : "plain",
    input.timezone,
    input.birthPlace,
  ].join("|");
}

/** Included in AI generation key so life-context changes regenerate. */
export function buildLifeContextKey(input: {
  maritalStatus: FreeFortuneRequest["maritalStatus"];
  hasChildren?: FreeFortuneRequest["hasChildren"];
}): string {
  const children =
    input.maritalStatus === "married" ? input.hasChildren ?? "unset" : "na";
  return `life:${input.maritalStatus}:${children}`;
}
