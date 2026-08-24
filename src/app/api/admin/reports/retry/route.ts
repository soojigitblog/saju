import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin } from "@/lib/security/same-origin";
import { assertAdminRequest } from "@/lib/admin/manual-auth";
import { writeAdminAudit } from "@/lib/repositories/admin-audit";
import { adminRetryPaidReportGeneration } from "@/lib/services/paid-report-job";
import { FreeFlowError } from "@/lib/services/free-flow-errors";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  orderId: z.string().uuid(),
});

/**
 * Admin-only AI retry after paid deposit. Never creates duplicate payment.
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

  try {
    const result = await adminRetryPaidReportGeneration({
      orderId: parsed.data.orderId,
    });

    await writeAdminAudit({
      adminUserId: adminAuth.user?.id ?? null,
      action: "REPORT_RETRY",
      targetType: "order",
      targetId: parsed.data.orderId,
      meta: { via: adminAuth.via },
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    if (error instanceof FreeFlowError) {
      return NextResponse.json(
        { code: error.code, message: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { code: "INTERNAL", message: "리포트 재생성에 실패했습니다." },
      { status: 500 }
    );
  }
}
