import { NextResponse } from "next/server";
import { ensureGuestSessionId } from "@/lib/guest/cookie";
import { retryFailedFreeFortune } from "@/lib/services/create-free-fortune";
import { FreeFlowError, hashIp } from "@/lib/services/free-flow-errors";
import { assertSameOrigin } from "@/lib/security/same-origin";

export const dynamic = "force-dynamic";

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
  try {
    const guestSessionId = await ensureGuestSessionId();
    const forwarded = request.headers.get("x-forwarded-for");
    const result = await retryFailedFreeFortune({
      freeResultId: id,
      guestSessionId,
      ipHash: hashIp(forwarded?.split(",")[0]?.trim()),
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
      {
        code: "UNKNOWN",
        message: "다시 시도하지 못했습니다. 잠시 후 시도해 주세요.",
      },
      { status: 500 }
    );
  }
}
