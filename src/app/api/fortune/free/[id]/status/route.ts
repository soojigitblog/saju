import { NextResponse } from "next/server";
import { getGuestSessionId } from "@/lib/guest/cookie";
import { getFreeResultStatusForOwner } from "@/lib/services/get-free-result";
import { FreeFlowError } from "@/lib/services/free-flow-errors";

export const dynamic = "force-dynamic";

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
    const status = await getFreeResultStatusForOwner({
      freeResultId: id,
      guestSessionId,
    });
    return NextResponse.json(status);
  } catch (error) {
    if (error instanceof FreeFlowError) {
      return NextResponse.json(
        { code: error.code, message: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { code: "UNKNOWN", message: "상태를 확인할 수 없습니다." },
      { status: 500 }
    );
  }
}
