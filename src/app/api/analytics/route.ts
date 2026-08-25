import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import {
  trackEvent,
  upsertAnalyticsSession,
  type AnalyticsEventName,
} from "@/lib/repositories/analytics";
import { assertSameOrigin } from "@/lib/security/same-origin";

export const dynamic = "force-dynamic";

const ANALYTICS_COOKIE = "fortune_analytics_session";
const ATTRIBUTION_COOKIE = "fortune_attribution";
const MAX_BODY = 4_096;

const ALLOWED_EVENTS = new Set<AnalyticsEventName>([
  "landing_view",
  "fortune_start",
  "fortune_form_complete",
  "free_result_view",
  "product_view",
  "tarot_entry_view",
  "tarot_question_selected",
  "tarot_cards_started",
  "tarot_card_selected",
  "tarot_draw_completed",
  "tarot_reading_generated",
  "tarot_reading_failed",
  "fortune_feedback_submitted",
  "tarot_feedback_submitted",
  "cross_feedback_submitted",
  "checkout_start",
  "payment_request",
  "payment_success",
  "payment_fail",
  "paid_report_start",
  "paid_report_completed",
  "paid_tarot_view",
  "paid_tarot_click",
  "paid_tarot_checkout_start",
  "paid_tarot_payment_complete",
  "paid_tarot_generation_complete",
]);

const bodySchema = z.object({
  eventName: z.string().min(1).max(64),
  path: z.string().max(200).optional(),
  productId: z.string().uuid().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  utm: z
    .object({
      utm_source: z.string().max(100).optional(),
      utm_medium: z.string().max(100).optional(),
      utm_campaign: z.string().max(100).optional(),
      utm_content: z.string().max(100).optional(),
      utm_term: z.string().max(100).optional(),
    })
    .optional(),
  referrer: z.string().max(500).optional().nullable(),
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

  let rawText: string;
  try {
    rawText = await request.text();
  } catch {
    return NextResponse.json({ ok: true });
  }
  if (rawText.length > MAX_BODY) {
    return NextResponse.json(
      { code: "PAYLOAD_TOO_LARGE", message: "요청이 너무 큽니다." },
      { status: 413 }
    );
  }

  let json: unknown;
  try {
    json = JSON.parse(rawText);
  } catch {
    return NextResponse.json(
      { code: "INVALID_JSON", message: "잘못된 요청입니다." },
      { status: 400 }
    );
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: "잘못된 이벤트입니다." },
      { status: 400 }
    );
  }

  if (!ALLOWED_EVENTS.has(parsed.data.eventName as AnalyticsEventName)) {
    return NextResponse.json(
      { code: "EVENT_DENIED", message: "허용되지 않은 이벤트입니다." },
      { status: 400 }
    );
  }

  try {
    const jar = await cookies();
    let sessionId = jar.get(ANALYTICS_COOKIE)?.value;
    if (!sessionId) {
      sessionId = randomUUID();
      jar.set(ANALYTICS_COOKIE, sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 180,
      });
    }

    // First-touch attribution cookie (30 days)
    let attribution = jar.get(ATTRIBUTION_COOKIE)?.value;
    if (!attribution && parsed.data.utm) {
      attribution = JSON.stringify({
        ...parsed.data.utm,
        capturedAt: new Date().toISOString(),
      });
      jar.set(ATTRIBUTION_COOKIE, attribution, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    let utm = parsed.data.utm;
    if (!utm && attribution) {
      try {
        utm = JSON.parse(attribution) as typeof utm;
      } catch {
        utm = undefined;
      }
    }

    await upsertAnalyticsSession({
      sessionId,
      utmSource: utm?.utm_source,
      utmMedium: utm?.utm_medium,
      utmCampaign: utm?.utm_campaign,
      utmContent: utm?.utm_content,
      utmTerm: utm?.utm_term,
      referrer: parsed.data.referrer ?? null,
      landingPath: parsed.data.path ?? null,
    });

    await trackEvent({
      sessionId,
      eventName: parsed.data.eventName as AnalyticsEventName,
      productId: parsed.data.productId ?? null,
      metadata: {
        path: parsed.data.path,
        ...(parsed.data.metadata ?? {}),
      },
    });
  } catch {
    // Analytics must never break user flow
  }

  return NextResponse.json({ ok: true });
}
