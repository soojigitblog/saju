import { NextResponse } from "next/server";
import { Webhook } from "@portone/server-sdk";
import { confirmPaymentForOwner } from "@/lib/services/confirm-payment";
import { getOrderByOrderNo } from "@/lib/repositories/orders";

export const dynamic = "force-dynamic";
/** Raw body + SDK signature verification, then provider re-fetch through the normal confirm path. */
export async function POST(request: Request) {
  const secret = process.env.PORTONE_WEBHOOK_SECRET?.trim();
  if (!secret) return NextResponse.json({ ok: false }, { status: 503 });
  try {
    const raw = await request.text();
    const event = await Webhook.verify(secret, raw, Object.fromEntries(request.headers));
    if (Webhook.isUnrecognizedWebhook(event) || event.type !== "Transaction.Paid") return NextResponse.json({ ok: true, ignored: true });
    const paymentId = event.data.paymentId;
    const paymentOrderNo = String(event.data.paymentId).replace(/^po_/, "");
    const order = await getOrderByOrderNo(paymentOrderNo);
    if (!order?.guest_session_id) return NextResponse.json({ ok: true, ignored: true });
    await confirmPaymentForOwner({ guestSessionId: order.guest_session_id, orderIdParam: order.order_no, paymentKey: paymentId, callbackAmount: order.amount, analyticsSessionId: order.guest_session_id });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ ok: false }, { status: 500 }); }
}
