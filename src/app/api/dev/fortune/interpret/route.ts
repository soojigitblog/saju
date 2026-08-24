import { notFound } from "next/navigation";
import { NextResponse } from "next/server";
import { fortuneEngine } from "@/lib/fortune-engine";
import { AiEngineError } from "@/lib/ai/errors";
import {
  createFortuneInterpreter,
  generateFreeInterpretation,
  generatePaidInterpretation,
} from "@/lib/ai/interpreters/free-interpreter";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  resultType: z.enum(["free", "paid"]),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  birthTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  birthTimeUnknown: z.boolean().optional(),
  gender: z.enum(["male", "female"]).default("female"),
  calendarType: z.enum(["solar", "lunar"]).default("solar"),
  nickname: z.string().max(40).optional(),
  productSlug: z.string().default("2026-total"),
  forceMock: z.boolean().optional(),
});

/**
 * Dev-only AI interpretation smoke endpoint.
 * Production: 404.
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      { code: "INVALID_JSON", message: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: "Invalid request body" },
      { status: 400 }
    );
  }

  const input = parsed.data;
  const chart = fortuneEngine.calculate({
    gender: input.gender,
    calendarType: input.calendarType,
    birthDate: input.birthDate,
    birthTime: input.birthTimeUnknown ? null : input.birthTime ?? "12:00",
    birthTimeUnknown: input.birthTimeUnknown ?? !input.birthTime,
    timezone: "Asia/Seoul",
    countryCode: "KR",
  });

  const promptVersion = {
    promptDefinitionId: "11111111-1111-1111-1111-111111111101",
    promptVersionId: "22222222-2222-2222-2222-222222222201",
    promptVersionNumber: 1,
    productInstruction: "종합 사주 리포트 콘텐츠를 작성하십시오.",
  };

  const interpreter = createFortuneInterpreter(
    input.forceMock ? "mock" : "auto"
  );

  try {
    if (input.resultType === "free") {
      const result = await generateFreeInterpretation(chart, promptVersion, {
        interpreter,
        presentation: { nickname: input.nickname },
        product: { slug: input.productSlug, name: "종합 사주 리포트" },
      });
      return NextResponse.json({
        ok: true,
        meta: {
          generationKey: result.meta.generationKey,
          model: result.meta.model,
          usage: result.meta.usage,
          providerRequestId: result.meta.providerRequestId,
        },
        result,
      });
    }

    const result = await generatePaidInterpretation(
      chart,
      { slug: input.productSlug, name: "종합 사주 리포트", targetLengthChars: 4000 },
      promptVersion,
      {
        interpreter,
        presentation: { nickname: input.nickname },
      }
    );
    return NextResponse.json({
      ok: true,
      meta: {
        generationKey: result.meta.generationKey,
        model: result.meta.model,
        usage: result.meta.usage,
        providerRequestId: result.meta.providerRequestId,
      },
      result,
    });
  } catch (error) {
    if (error instanceof AiEngineError) {
      return NextResponse.json(
        {
          code: error.code,
          message: error.message,
          providerRequestId: error.providerRequestId,
        },
        { status: 502 }
      );
    }
    return NextResponse.json(
      { code: "UNKNOWN", message: "Interpretation failed" },
      { status: 500 }
    );
  }
}
