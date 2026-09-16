import { NextResponse } from "next/server";
import { z } from "zod";
import { restoreOrderByAccessToken } from "@/lib/services/restore-order-access";
import { FreeFlowError } from "@/lib/services/free-flow-errors";
import { assertSameOrigin } from "@/lib/security/same-origin";
import { assertPaymentMutationRateLimit } from "@/lib/payments/rate-limit";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  accessToken: z.string().min(16).max(128),
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

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      { code: "INVALID_JSON", message: "잘못된 요청입니다." },
      { status: 400 }
    );
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { code: "INVALID_BODY", message: "결과 보관 코드를 확인해 주세요." },
      { status: 400 }
    );
  }

  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const rateKey = forwarded || request.headers.get("x-real-ip") || "unknown";
  try {
    assertPaymentMutationRateLimit({
      bucket: "access_restore",
      guestSessionId: rateKey,
    });
  } catch (error) {
    if (error instanceof Error && (error as Error & { code?: string }).code === "RATE_LIMITED") {
      return NextResponse.json(
        { code: "RATE_LIMITED", message: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
        { status: 429 }
      );
    }
    throw error;
  }

  try {
    const result = await restoreOrderByAccessToken(parsed.data.accessToken);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof FreeFlowError) {
      return NextResponse.json(
        { code: error.code, message: error.message },
        { status: error.status }
      );
    }
    console.error("[orders/restore] failed", { requestId: crypto.randomUUID() });
    return NextResponse.json(
      { code: "INTERNAL", message: "복원에 실패했습니다." },
      { status: 500 }
    );
  }
}
