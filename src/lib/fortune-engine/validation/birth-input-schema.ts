import { z } from "zod";
import { FORTUNE_RELEASE_MANIFEST } from "../release-manifest";

const { min, max } = FORTUNE_RELEASE_MANIFEST.supportYear;

export const birthInputSchema = z
  .object({
    gender: z.enum(["male", "female"]),
    calendarType: z.enum(["solar", "lunar"]),
    birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    birthTime: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
    birthTimeUnknown: z.boolean(),
    lunarLeapMonth: z.boolean().optional(),
    timezone: z.literal("Asia/Seoul").default("Asia/Seoul"),
    countryCode: z.string().default("KR"),
    location: z
      .object({
        latitude: z.number().optional(),
        longitude: z.number().optional(),
      })
      .optional(),
  })
  .superRefine((value, ctx) => {
    const year = Number(value.birthDate.slice(0, 4));
    if (year < min || year > max) {
      ctx.addIssue({
        code: "custom",
        message: `Supported years: ${min}–${max}`,
        path: ["birthDate"],
      });
    }
    if (value.birthTimeUnknown && value.birthTime !== null) {
      ctx.addIssue({
        code: "custom",
        message: "birthTime must be null when unknown",
        path: ["birthTime"],
      });
    }
    if (!value.birthTimeUnknown && value.birthTime === null) {
      ctx.addIssue({
        code: "custom",
        message: "birthTime required when known",
        path: ["birthTime"],
      });
    }
    if (value.calendarType === "solar" && value.lunarLeapMonth) {
      ctx.addIssue({
        code: "custom",
        message: "lunarLeapMonth only for lunar",
        path: ["lunarLeapMonth"],
      });
    }
  });

export type BirthInputDto = z.infer<typeof birthInputSchema>;
