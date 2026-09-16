import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin } from "@/lib/security/same-origin";
import { getGuestSessionId } from "@/lib/guest/cookie";
import { getOrderById } from "@/lib/repositories/orders";
import {
  getPendingRefundRequestForOrder,
  insertRefundRequest,
} from "@/lib/repositories/refund-requests";
import { assertRefundRequestRateLimit } from "@/lib/refund-requests/rate-limit";

export const dynamic = "force-dynamic";

const MAX_SCREENSHOT_CHARS = 2_800_000; // ~2MB raw image, base64-encoded

const bodySchema = z.object({
  orderId: z.string().uuid(),
  reason: z.string().trim().min(5).max(1000),
  screenshotDataUrl: z
    .string()
    .trim()
    .max(MAX_SCREENSHOT_CHARS)
    .refine((v) => v.startsWith("data:image/"), {
      message: "이미지 파일만 첨부할 수 있습니다.",
    })
    .optional()
    .nullable(),
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

  const guestSessionId = await getGuestSessionId();
  if (!guestSessionId) {
    return NextResponse.json(
      { code: "NO_SESSION", message: "세션이 없습니다." },
      { status: 401 }
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
      { code: "VALIDATION_ERROR", message: "입력을 확인해 주세요." },
      { status: 400 }
    );
  }

  try {
    assertRefundRequestRateLimit(guestSessionId);
  } catch {
    return NextResponse.json(
      { code: "RATE_LIMITED", message: "잠시 후 다시 시도해 주세요." },
      { status: 429 }
    );
  }

  const order = await getOrderById(parsed.data.orderId);
  if (!order || order.guest_session_id !== guestSessionId) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "주문을 찾을 수 없습니다." },
      { status: 404 }
    );
  }
  if (!order.paid_at) {
    return NextResponse.json(
      { code: "NOT_PAID", message: "결제가 완료된 주문만 환불 신청할 수 있습니다." },
      { status: 400 }
    );
  }

  const existingPending = await getPendingRefundRequestForOrder(order.id);
  if (existingPending) {
    return NextResponse.json({ ok: true, id: existingPending.id, already: true });
  }

  const row = await insertRefundRequest({
    order_id: order.id,
    guest_session_id: guestSessionId,
    user_id: order.user_id ?? null,
    reason: parsed.data.reason,
    screenshot_data_url: parsed.data.screenshotDataUrl ?? null,
  });

  return NextResponse.json({ ok: true, id: row.id });
}
