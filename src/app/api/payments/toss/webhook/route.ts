import { NextResponse } from "next/server";
import { z } from "zod";
import { confirmTossPaymentFromWebhook } from "@/lib/services/confirm-payment";

export const dynamic = "force-dynamic";

const webhookSchema = z.object({
  eventType: z.string().optional(),
  data: z
    .object({
      paymentKey: z.string().min(8).max(200).optional(),
      orderId: z.string().min(6).max(64).optional(),
      status: z.string().optional(),
      totalAmount: z.number().int().nonnegative().optional(),
    })
    .optional(),
});

/**
 * Register this endpoint in Toss Payments as PAYMENT_STATUS_CHANGED.
 * The incoming JSON is only a delivery hint: the service re-confirms the
 * payment against Toss using its server-only secret before fulfillment.
 */
export async function POST(request: Request) {
  const raw = await request.json().catch(() => null);
  const parsed = webhookSchema.safeParse(raw);
  const payment = parsed.success ? parsed.data.data : null;
  if (
    !parsed.success ||
    parsed.data.eventType !== "PAYMENT_STATUS_CHANGED" ||
    payment?.status !== "DONE" ||
    !payment.paymentKey ||
    !payment.orderId ||
    typeof payment.totalAmount !== "number"
  ) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  try {
    await confirmTossPaymentFromWebhook({
      orderNo: payment.orderId,
      paymentKey: payment.paymentKey,
      amount: payment.totalAmount,
    });
    return NextResponse.json({ ok: true });
  } catch {
    // Toss retries non-2xx webhook deliveries. Do not leak order state.
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
