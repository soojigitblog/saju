import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin } from "@/lib/security/same-origin";
import { getGuestSessionId } from "@/lib/guest/cookie";
import { FreeFlowError } from "@/lib/services/free-flow-errors";
import { AiEngineError } from "@/lib/ai/errors";
import { generatePaidReportPreviewForOwner } from "@/lib/services/preview-paid-report";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const uuidLike = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

const bodySchema = z.object({
  freeResultId: uuidLike,
  productSlug: z.string().max(80).optional().nullable(),
});

/**
 * Owner/QA only. Not linked from public UI.
 * Requires ALLOW_PAID_PREVIEW=1.
 */
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

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: "입력을 확인해 주세요." },
      { status: 400 }
    );
  }

  try {
    const preview = await generatePaidReportPreviewForOwner({
      guestSessionId,
      freeResultId: parsed.data.freeResultId,
      productSlug: parsed.data.productSlug,
    });
    return NextResponse.json(preview);
  } catch (error) {
    if (error instanceof FreeFlowError) {
      return NextResponse.json(
        { code: error.code, message: error.message },
        { status: error.status }
      );
    }
    if (error instanceof AiEngineError) {
      return NextResponse.json(
        {
          code: error.code,
          message: "유료 리포트 미리보기 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.",
        },
        { status: 502 }
      );
    }
    return NextResponse.json(
      { code: "UNKNOWN", message: "미리보기를 생성할 수 없습니다." },
      { status: 500 }
    );
  }
}
