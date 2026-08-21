import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin } from "@/lib/security/same-origin";
import { getGuestSessionId } from "@/lib/guest/cookie";
import { FreeFlowError } from "@/lib/services/free-flow-errors";
import {
  selectTarotCards,
  generateTarotCrossReading,
  getTarotReadingForOwner,
  submitTarotFeedback,
} from "@/lib/services/create-tarot-reading";

export const dynamic = "force-dynamic";

const selectSchema = z.object({
  action: z.literal("select"),
  // Presentation deck is 12–18 slots; never accept arbitrary full-deck indices.
  slotIndices: z.tuple([
    z.number().int().min(0).max(17),
    z.number().int().min(0).max(17),
    z.number().int().min(0).max(17),
  ]),
});

const generateSchema = z.object({
  action: z.literal("generate"),
});

const feedbackSchema = z.object({
  action: z.literal("feedback"),
  score: z.number().int().min(1).max(5),
  label: z.string().min(1).max(40),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const guestSessionId = await getGuestSessionId();
  if (!guestSessionId) {
    return NextResponse.json(
      { code: "FORBIDDEN", message: "접근 권한이 없습니다." },
      { status: 403 }
    );
  }
  try {
    const { reading, draws } = await getTarotReadingForOwner({
      guestSessionId,
      readingId: id,
    });
    return NextResponse.json({
      id: reading.id,
      status: reading.generation_status,
      questionCategory: reading.question_category,
      questionText: reading.question_text,
      freeResultId: reading.free_result_id,
      presentationSlotCount: reading.presentation_slots.length,
      draws:
        reading.generation_status === "PENDING"
          ? []
          : draws.map((d) => ({
              position: d.position,
              positionIndex: d.position_index,
              cardId: d.card_id,
              slug: d.card_slug,
              orientation: d.orientation,
            })),
      result:
        reading.generation_status === "COMPLETED" ? reading.result_json : null,
      feedbackScore: reading.feedback_score,
      feedbackLabel: reading.feedback_label,
    });
  } catch (error) {
    if (error instanceof FreeFlowError) {
      return NextResponse.json(
        { code: error.code, message: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { code: "UNKNOWN", message: "조회에 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    assertSameOrigin(request);
  } catch {
    return NextResponse.json(
      { code: "FORBIDDEN", message: "잘못된 요청입니다." },
      { status: 403 }
    );
  }

  const { id } = await context.params;
  const guestSessionId = await getGuestSessionId();
  if (!guestSessionId) {
    return NextResponse.json(
      { code: "FORBIDDEN", message: "접근 권한이 없습니다." },
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

  try {
    const asSelect = selectSchema.safeParse(json);
    if (asSelect.success) {
      const result = await selectTarotCards({
        guestSessionId,
        readingId: id,
        slotIndices: asSelect.data.slotIndices,
      });
      return NextResponse.json(result);
    }

    const asGen = generateSchema.safeParse(json);
    if (asGen.success) {
      const result = await generateTarotCrossReading({
        guestSessionId,
        readingId: id,
      });
      return NextResponse.json(result);
    }

    const asFb = feedbackSchema.safeParse(json);
    if (asFb.success) {
      const result = await submitTarotFeedback({
        guestSessionId,
        readingId: id,
        score: asFb.data.score,
        label: asFb.data.label,
      });
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: "요청을 확인해 주세요." },
      { status: 400 }
    );
  } catch (error) {
    if (error instanceof FreeFlowError) {
      return NextResponse.json(
        { code: error.code, message: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { code: "UNKNOWN", message: "처리에 실패했습니다." },
      { status: 500 }
    );
  }
}
