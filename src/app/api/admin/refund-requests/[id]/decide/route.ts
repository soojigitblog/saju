import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin } from "@/lib/security/same-origin";
import { assertAdminRequest } from "@/lib/admin/manual-auth";
import { writeAdminAudit } from "@/lib/repositories/admin-audit";
import { updateOrder } from "@/lib/repositories/orders";
import {
  decideRefundRequest,
  getRefundRequestById,
} from "@/lib/repositories/refund-requests";
import { FreeFlowError } from "@/lib/services/free-flow-errors";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  adminNote: z.string().trim().max(500).optional().nullable(),
});

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Admin approves/rejects a customer refund request.
 * Approval only marks the order REFUNDED for bookkeeping — the actual money
 * transfer (Toss cancel / bank transfer) is still done manually by the admin.
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    assertSameOrigin(request);
  } catch {
    return NextResponse.json(
      { code: "FORBIDDEN", message: "잘못된 요청입니다." },
      { status: 403 }
    );
  }

  let adminAuth: Awaited<ReturnType<typeof assertAdminRequest>>;
  try {
    adminAuth = await assertAdminRequest(request);
  } catch (error) {
    if (error instanceof FreeFlowError) {
      return NextResponse.json(
        { code: error.code, message: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { code: "FORBIDDEN", message: "관리자만 가능합니다." },
      { status: 403 }
    );
  }

  const { id } = await context.params;

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
      { code: "INVALID_BODY", message: "요청 값이 올바르지 않습니다." },
      { status: 400 }
    );
  }

  const existing = await getRefundRequestById(id);
  if (!existing) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "요청을 찾을 수 없습니다." },
      { status: 404 }
    );
  }
  if (existing.status !== "PENDING") {
    return NextResponse.json(
      { code: "ALREADY_DECIDED", message: "이미 처리된 요청입니다." },
      { status: 409 }
    );
  }

  const updated = await decideRefundRequest({
    id,
    status: parsed.data.decision,
    adminNote: parsed.data.adminNote ?? null,
    decidedBy: adminAuth.user?.id ?? null,
  });

  if (parsed.data.decision === "APPROVED") {
    await updateOrder(existing.order_id, {
      status: "REFUNDED",
      refunded_at: new Date().toISOString(),
    });
  }

  await writeAdminAudit({
    adminUserId: adminAuth.user?.id ?? null,
    action: "REFUND_DECISION",
    targetType: "refund_request",
    targetId: id,
    meta: { decision: parsed.data.decision, orderId: existing.order_id, via: adminAuth.via },
  });

  return NextResponse.json({ ok: true, refundRequest: updated });
}
