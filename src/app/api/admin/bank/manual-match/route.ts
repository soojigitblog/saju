import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin } from "@/lib/security/same-origin";
import { assertAdminRequest } from "@/lib/admin/manual-auth";
import { writeAdminAudit } from "@/lib/repositories/admin-audit";
import { listBankTransactionsForAdmin } from "@/lib/repositories/bank-transactions";
import { fulfillBankMatch } from "@/lib/services/bank-match-fulfill";
import { FreeFlowError } from "@/lib/services/free-flow-errors";
import { getOrderById } from "@/lib/repositories/orders";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  bankTransactionId: z.string().uuid(),
  orderId: z.string().uuid(),
  reason: z.string().min(2).max(200),
});

/**
 * Admin manual match. Requires Supabase Auth ADMIN (legacy token in test only).
 * Re-validates amount + PENDING; never PAID without a bank transaction row.
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
    const txs = await listBankTransactionsForAdmin(200);
    const tx = txs.find((t) => t.id === parsed.data.bankTransactionId);
    if (!tx) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: "입금 내역을 찾을 수 없습니다." },
        { status: 404 }
      );
    }
    if (tx.match_status === "MATCHED") {
      return NextResponse.json({
        ok: true,
        already: true,
        orderId: tx.matched_order_id,
      });
    }

    const order = await getOrderById(parsed.data.orderId);
    if (!order || order.status !== "PENDING") {
      return NextResponse.json(
        { code: "ORDER_NOT_PAYABLE", message: "결제 대기 주문이 아닙니다." },
        { status: 400 }
      );
    }
    if (order.amount !== tx.amount) {
      return NextResponse.json(
        {
          code: "PAYMENT_AMOUNT_MISMATCH",
          message: "입금액과 주문 금액이 다릅니다.",
        },
        { status: 400 }
      );
    }

    const result = await fulfillBankMatch({
      bankTxId: tx.id,
      fingerprint: tx.fingerprint,
      orderId: order.id,
      amount: tx.amount,
      manual: { by: "admin", reason: parsed.data.reason },
    });

    await writeAdminAudit({
      adminUserId: adminAuth.user?.id ?? null,
      action: "BANK_CONFIRM",
      targetType: "order",
      targetId: order.id,
      meta: { bankTransactionId: tx.id, via: adminAuth.via, manualMatch: true },
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
      { code: "INTERNAL", message: "수동 확인에 실패했습니다." },
      { status: 500 }
    );
  }
}
