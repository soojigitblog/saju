import { NextResponse } from "next/server";
import { ensureGuestSessionId } from "@/lib/guest/cookie";
import { createFreeFortune } from "@/lib/services/create-free-fortune";
import { FreeFlowError, hashIp } from "@/lib/services/free-flow-errors";
import { assertSameOrigin } from "@/lib/security/same-origin";
import { trackEvent } from "@/lib/repositories/analytics";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const MAX_BODY = 8_192;

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
  } catch {
    return NextResponse.json(
      { code: "FORBIDDEN", message: "잘못된 요청입니다." },
      { status: 403 }
    );
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > MAX_BODY) {
    return NextResponse.json(
      { code: "PAYLOAD_TOO_LARGE", message: "요청이 너무 큽니다." },
      { status: 413 }
    );
  }

  let raw: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY) {
      return NextResponse.json(
        { code: "PAYLOAD_TOO_LARGE", message: "요청이 너무 큽니다." },
        { status: 413 }
      );
    }
    raw = JSON.parse(text);
  } catch {
    return NextResponse.json(
      { code: "INVALID_JSON", message: "잘못된 요청입니다." },
      { status: 400 }
    );
  }

  try {
    const guestSessionId = await ensureGuestSessionId();
    const forwarded = request.headers.get("x-forwarded-for");
    const ipHint = forwarded?.split(",")[0]?.trim() ?? null;
    const result = await createFreeFortune({
      raw,
      guestSessionId,
      ipHash: hashIp(ipHint),
    });

    try {
      const jar = await cookies();
      const analyticsId =
        jar.get("fortune_analytics_session")?.value ?? guestSessionId;
      await trackEvent({
        sessionId: analyticsId,
        eventName: "fortune_form_complete",
        metadata: { freeResultId: result.freeResultId, status: result.status },
      });
    } catch {
      /* analytics best-effort */
    }

    return NextResponse.json({
      freeResultId: result.freeResultId,
      status: result.status,
    });
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
        message: "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      },
      { status: 500 }
    );
  }
}
