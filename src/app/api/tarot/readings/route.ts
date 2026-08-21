import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin } from "@/lib/security/same-origin";
import { ensureGuestSessionId } from "@/lib/guest/cookie";
import { FreeFlowError } from "@/lib/services/free-flow-errors";
import { startTarotReading } from "@/lib/services/create-tarot-reading";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  freeResultId: z.string().uuid(),
  questionCategory: z.enum([
    "money",
    "career",
    "love",
    "relationships",
    "advice",
    "custom",
  ]),
  questionText: z.string().max(200).optional().nullable(),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
  } catch {
    return NextResponse.json(
      { code: "FORBIDDEN", message: "잘못된 요청입니다." },
      { status: 403 }
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      { code: "INVALID_JSON", message: "잘못된 요청입니다." },
      { status: 400 }
    );
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: "입력을 확인해 주세요." },
      { status: 400 }
    );
  }

  try {
    const guestSessionId = await ensureGuestSessionId();
    const result = await startTarotReading({
      guestSessionId,
      freeResultId: parsed.data.freeResultId,
      questionCategory: parsed.data.questionCategory,
      questionText: parsed.data.questionText,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof FreeFlowError) {
      return NextResponse.json(
        { code: error.code, message: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { code: "UNKNOWN", message: "리딩을 시작할 수 없습니다." },
      { status: 500 }
    );
  }
}
