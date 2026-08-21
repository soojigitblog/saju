import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin } from "@/lib/security/same-origin";
import { getGuestSessionId } from "@/lib/guest/cookie";
import { FreeFlowError } from "@/lib/services/free-flow-errors";
import {
  getFeedbackForOwner,
  submitFeedback,
} from "@/lib/services/submit-feedback";
import { FEEDBACK_TARGET_TYPES } from "@/lib/feedback/constants";

export const dynamic = "force-dynamic";

const targetTypeSchema = z.enum(FEEDBACK_TARGET_TYPES);

const postSchema = z.object({
  targetType: targetTypeSchema,
  targetId: z.string().uuid(),
  rating: z.number().int().min(1).max(5).optional().nullable(),
  tags: z.array(z.string().min(1).max(40)).max(8).optional(),
  moreFunThanSajuAlone: z.enum(["YES", "NO"]).optional().nullable(),
  mostResonant: z
    .enum(["SAJU", "TAROT", "CROSS", "SIMILAR"])
    .optional()
    .nullable(),
});

export async function GET(request: Request) {
  const guestSessionId = await getGuestSessionId();
  if (!guestSessionId) {
    return NextResponse.json(
      { code: "FORBIDDEN", message: "접근 권한이 없습니다." },
      { status: 403 }
    );
  }

  const url = new URL(request.url);
  const targetTypeRaw = url.searchParams.get("targetType");
  const targetId = url.searchParams.get("targetId");
  const parsedType = targetTypeSchema.safeParse(targetTypeRaw);
  if (!parsedType.success || !targetId || !/^[0-9a-f-]{36}$/i.test(targetId)) {
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: "요청을 확인해 주세요." },
      { status: 400 }
    );
  }

  try {
    const feedback = await getFeedbackForOwner({
      guestSessionId,
      targetType: parsedType.data,
      targetId,
    });
    return NextResponse.json({ feedback });
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

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
  } catch {
    return NextResponse.json(
      { code: "FORBIDDEN", message: "잘못된 요청입니다." },
      { status: 403 }
    );
  }

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

  // Client must never send guest_session_id — strip if present.
  if (json && typeof json === "object" && "guestSessionId" in json) {
    const { guestSessionId: _ignored, ...rest } = json as Record<string, unknown>;
    json = rest;
  }

  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: "요청을 확인해 주세요." },
      { status: 400 }
    );
  }

  try {
    const result = await submitFeedback({
      guestSessionId,
      targetType: parsed.data.targetType,
      targetId: parsed.data.targetId,
      rating: parsed.data.rating,
      tags: parsed.data.tags,
      moreFunThanSajuAlone: parsed.data.moreFunThanSajuAlone,
      mostResonant: parsed.data.mostResonant,
    });
    return NextResponse.json({
      ok: true,
      feedback: result.feedback,
      analytics: result.analytics,
    });
  } catch (error) {
    if (error instanceof FreeFlowError) {
      return NextResponse.json(
        { code: error.code, message: error.message },
        { status: error.status }
      );
    }
    const hint = feedbackStorageHint(error);
    return NextResponse.json(
      {
        code: "UNKNOWN",
        message: hint ?? "처리에 실패했습니다.",
      },
      { status: 500 }
    );
  }
}

/** Brief message for known storage misconfig (e.g. migration 0010 missing). */
function feedbackStorageHint(error: unknown): string | null {
  const msg =
    error && typeof error === "object" && "message" in error
      ? String((error as { message: unknown }).message)
      : error instanceof Error
        ? error.message
        : String(error ?? "");
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code: unknown }).code)
      : "";
  if (
    code === "42P01" ||
    /relation ["']?feedbacks["']? does not exist/i.test(msg) ||
    /Could not find the table ['"]public\.feedbacks['"]/i.test(msg)
  ) {
    return "피드백 저장소가 준비되지 않았습니다. DB 마이그레이션(0010)을 적용해 주세요.";
  }
  return null;
}
