import "server-only";

import { getDataMode } from "@/lib/repositories/data-mode";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json, TablesInsert } from "@/types/database.types";

/**
 * Analytics writes must go through a future /api/analytics Route Handler
 * that validates payloads, then calls these helpers (secret client).
 * Direct anon INSERT policies were removed to prevent spam/cost abuse.
 */

export type AnalyticsEventName =
  | "landing_view"
  | "fortune_start"
  | "fortune_form_complete"
  | "free_result_view"
  | "product_view"
  | "checkout_start"
  | "payment_success"
  | "payment_fail"
  | "report_generated"
  | "report_view"
  | "pdf_download"
  | "tarot_entry_view"
  | "tarot_question_selected"
  | "tarot_cards_started"
  | "tarot_card_selected"
  | "tarot_draw_completed"
  | "tarot_reading_generated"
  | "tarot_reading_failed"
  | "fortune_feedback_submitted"
  | "tarot_feedback_submitted"
  | "cross_feedback_submitted"
  | "payment_request"
  | "paid_report_start"
  | "paid_report_completed"
  | (string & {});

export async function upsertAnalyticsSession(input: {
  sessionId: string;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
  referrer?: string | null;
  landingPath?: string | null;
}) {
  if (getDataMode() === "mock") {
    return { session_id: input.sessionId };
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: existing } = await admin
    .from("analytics_sessions")
    .select("id, session_id")
    .eq("session_id", input.sessionId)
    .maybeSingle();

  if (existing) {
    await admin
      .from("analytics_sessions")
      .update({ last_seen_at: now })
      .eq("session_id", input.sessionId);
    return existing;
  }

  const row: TablesInsert<"analytics_sessions"> = {
    session_id: input.sessionId,
    utm_source: input.utmSource ?? null,
    utm_medium: input.utmMedium ?? null,
    utm_campaign: input.utmCampaign ?? null,
    utm_content: input.utmContent ?? null,
    utm_term: input.utmTerm ?? null,
    referrer: input.referrer ?? null,
    landing_path: input.landingPath ?? null,
    first_seen_at: now,
    last_seen_at: now,
  };

  const { data, error } = await admin
    .from("analytics_sessions")
    .insert(row)
    .select("id, session_id")
    .single();

  if (error) throw error;
  return data;
}

export async function trackEvent(input: {
  sessionId: string;
  eventName: AnalyticsEventName;
  userId?: string | null;
  productId?: string | null;
  orderId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  if (getDataMode() === "mock") {
    return;
  }

  await upsertAnalyticsSession({ sessionId: input.sessionId });

  const admin = createAdminClient();
  const row: TablesInsert<"analytics_events"> = {
    session_id: input.sessionId,
    event_name: input.eventName,
    user_id: input.userId ?? null,
    product_id: input.productId ?? null,
    order_id: input.orderId ?? null,
    metadata: (input.metadata ?? {}) as Json,
  };

  const { error } = await admin.from("analytics_events").insert(row);
  if (error) throw error;
}
