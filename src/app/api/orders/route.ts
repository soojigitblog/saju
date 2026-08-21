import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { getGuestSessionId } from "@/lib/guest/cookie";
import { createOrderForGuest } from "@/lib/services/create-order";
import { FreeFlowError } from "@/lib/services/free-flow-errors";
import { assertSameOrigin } from "@/lib/security/same-origin";

export const dynamic = "force-dynamic";

const MAX_BODY = 4_096;

const uuidLike = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

const bodySchema = z.object({
  productId: uuidLike,
  sourceResultId: uuidLike,
  depositorName: z.string().min(2).max(40),
  paymentMethod: z.enum(["BANK_TRANSFER", "TOSS"]).optional(),
  // Ignored — never trust client prices
  amount: z.number().optional(),
  price: z.number().optional(),
  salePrice: z.number().optional(),
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

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { code: "INVALID_BODY", message: "요청 값이 올바르지 않습니다." },
      { status: 400 }
    );
  }

  try {
    const guestSessionId = await getGuestSessionId();
    if (!guestSessionId) {
      return NextResponse.json(
        {
          code: "NO_SESSION",
          message: "세션이 없습니다. 사주 결과에서 다시 들어와 주세요.",
        },
        { status: 401 }
      );
    }

    const jar = await cookies();
    const analyticsId =
      jar.get("fortune_analytics_session")?.value ?? guestSessionId;

    const result = await createOrderForGuest({
      guestSessionId,
      productId: parsed.data.productId,
      sourceResultId: parsed.data.sourceResultId,
      depositorName: parsed.data.depositorName,
      paymentMethod: parsed.data.paymentMethod ?? "BANK_TRANSFER",
      analyticsSessionId: analyticsId,
    });

    return NextResponse.json({
      orderId: result.order.id,
      orderNo: result.order.orderNo,
      amount: result.order.amount,
      waitUrl: result.waitUrl,
      checkoutUrl: result.waitUrl,
      reused: result.reused,
      bankAccount: result.bankAccount,
    });
  } catch (error) {
    if (error instanceof FreeFlowError) {
      return NextResponse.json(
        { code: error.code, message: error.message },
        { status: error.status }
      );
    }
    if (
      error instanceof Error &&
      (error as Error & { code?: string }).code === "RATE_LIMITED"
    ) {
      return NextResponse.json(
        {
          code: "RATE_LIMITED",
          message: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
        },
        { status: 429 }
      );
    }
    console.error("[orders] create failed", { requestId: crypto.randomUUID() });
    return NextResponse.json(
      { code: "INTERNAL", message: "주문 생성 중 문제가 발생했습니다." },
      { status: 500 }
    );
  }
}
