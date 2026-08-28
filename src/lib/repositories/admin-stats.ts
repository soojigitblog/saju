import "server-only";

import { getDataMode } from "@/lib/repositories/data-mode";
import { createAdminClient } from "@/lib/supabase/admin";
import { mockStore } from "@/lib/mock-store";
import { getUsdToKrwRate } from "@/lib/ai/config";
import { isPaidReportOperationalFailure } from "@/lib/services/paid-report-failure-policy";
import { isQaDryRunDepositor } from "@/lib/ops/qa-dry-run-order";
import type { OrderStatus } from "@/types";

function seoulDayBounds(now = new Date()): { startIso: string; endIso: string } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const day = fmt.format(now); // YYYY-MM-DD
  // Approximate: treat Seoul calendar day as UTC+9 window
  const startIso = new Date(`${day}T00:00:00+09:00`).toISOString();
  const endIso = new Date(`${day}T23:59:59.999+09:00`).toISOString();
  return { startIso, endIso };
}

export type AdminTodayStats = {
  visitors: number;
  freeFortune: number;
  tarotReadings: number;
  productViews: number;
  orders: number;
  pendingDeposits: number;
  paymentCheckRequested: number;
  paid: number;
  revenue: number;
  aiFailures: number;
  reportFailures: number;
  paidAiCostUsd: number;
  paidAiCostKrw: number;
  paidEstimatedMargin: number;
  funnel: { label: string; value: number }[];
};

async function countEvents(
  eventName: string,
  startIso: string,
  endIso: string
): Promise<number> {
  if (getDataMode() === "mock") return 0;
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("analytics_events")
    .select("id", { count: "exact", head: true })
    .eq("event_name", eventName)
    .gte("created_at", startIso)
    .lte("created_at", endIso);
  if (error) throw error;
  return count ?? 0;
}

async function countOrdersToday(
  startIso: string,
  endIso: string,
  status?: OrderStatus
): Promise<number> {
  if (getDataMode() === "mock") {
    return [...mockStore.orders.values()].filter((o) => {
      if (o.created_at < startIso || o.created_at > endIso) return false;
      if (status && o.status !== status) return false;
      return true;
    }).length;
  }
  const admin = createAdminClient();
  let q = admin
    .from("orders")
    .select("id", { count: "exact", head: true })
    .gte("created_at", startIso)
    .lte("created_at", endIso);
  if (status) q = q.eq("status", status);
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}

export async function getAdminTodayStats(): Promise<AdminTodayStats> {
  const { startIso, endIso } = seoulDayBounds();

  if (getDataMode() === "mock") {
    const orders = [...mockStore.orders.values()];
    const pending = orders.filter((o) => o.status === "PENDING");
    const paidToday = orders.filter(
      (o) =>
        o.paid_at &&
        o.paid_at >= startIso &&
        o.paid_at <= endIso &&
        ["PAID", "GENERATING", "COMPLETED", "FAILED"].includes(o.status) &&
        !isQaDryRunDepositor(o.depositor_name)
    );
    return {
      visitors: 0,
      freeFortune: 0,
      tarotReadings: 0,
      productViews: 0,
      orders: orders.filter(
        (o) => o.created_at >= startIso && o.created_at <= endIso
      ).length,
      pendingDeposits: pending.length,
      paymentCheckRequested: pending.filter((o) => o.payment_check_requested_at)
        .length,
      paid: paidToday.length,
      revenue: paidToday.reduce((s, o) => s + o.amount, 0),
      aiFailures: 0,
      reportFailures: [...mockStore.reports.values()].filter((r) => {
        const o = mockStore.orders.get(r.order_id);
        return (
          r.generation_status === "FAILED" &&
          Boolean(o?.paid_at) &&
          isPaidReportOperationalFailure(r.error_code, r.generation_status)
        );
      }).length,
      paidAiCostUsd: 0,
      paidAiCostKrw: 0,
      paidEstimatedMargin: paidToday.reduce((s, o) => s + o.amount, 0),
      funnel: [
        { label: "Landing", value: 0 },
        { label: "Fortune Start", value: 0 },
        { label: "Fortune Complete", value: 0 },
        { label: "Tarot Start", value: 0 },
        { label: "Tarot Complete", value: 0 },
        { label: "Product View", value: 0 },
        { label: "Order", value: 0 },
        { label: "Paid", value: paidToday.length },
      ],
    };
  }

  const admin = createAdminClient();

  const [
    visitors,
    freeFortune,
    tarotStart,
    tarotComplete,
    productViews,
    fortuneStart,
    fortuneComplete,
    checkoutStart,
    paymentSuccess,
  ] = await Promise.all([
    countEvents("landing_view", startIso, endIso),
    countEvents("fortune_form_complete", startIso, endIso),
    countEvents("tarot_cards_started", startIso, endIso),
    countEvents("tarot_reading_generated", startIso, endIso),
    countEvents("product_view", startIso, endIso),
    countEvents("fortune_start", startIso, endIso),
    countEvents("fortune_form_complete", startIso, endIso),
    countEvents("checkout_start", startIso, endIso),
    countEvents("payment_success", startIso, endIso),
  ]);

  const { count: pendingDeposits } = await admin
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("status", "PENDING")
    .eq("payment_method", "BANK_TRANSFER");

  const { count: paymentCheckRequested } = await admin
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("status", "PENDING")
    .eq("payment_method", "BANK_TRANSFER")
    .not("payment_check_requested_at", "is", null);

  const { data: paidRows } = await admin
    .from("orders")
    .select("amount, status, paid_at, depositor_name")
    .not("paid_at", "is", null)
    .gte("paid_at", startIso)
    .lte("paid_at", endIso);

  const paidList = (paidRows ?? []).filter(
    (o) => !isQaDryRunDepositor(o.depositor_name)
  );
  const revenue = paidList.reduce((s, o) => s + (o.amount ?? 0), 0);

  const { count: aiFailures } = await admin
    .from("ai_generations")
    .select("id", { count: "exact", head: true })
    .eq("status", "FAILED")
    .gte("created_at", startIso)
    .lte("created_at", endIso);

  const { data: failedReportRows } = await admin
    .from("reports")
    .select("id, error_code, generation_status, orders!inner(paid_at)")
    .eq("generation_status", "FAILED")
    .not("orders.paid_at", "is", null);

  const reportFailures = (failedReportRows ?? []).filter((r) =>
    isPaidReportOperationalFailure(r.error_code, r.generation_status)
  ).length;

  const { data: paidAiRows } = await admin
    .from("ai_generations")
    .select("estimated_ai_cost_usd")
    .eq("result_type", "paid")
    .eq("status", "COMPLETED")
    .gte("completed_at", startIso)
    .lte("completed_at", endIso);

  const paidAiCostUsd = (paidAiRows ?? []).reduce(
    (s, r) => s + Number(r.estimated_ai_cost_usd ?? 0),
    0
  );
  const paidAiCostKrw = paidAiCostUsd * getUsdToKrwRate();
  const paidEstimatedMargin = revenue - paidAiCostKrw;

  const ordersToday = await countOrdersToday(startIso, endIso);

  return {
    visitors,
    freeFortune,
    tarotReadings: tarotComplete,
    productViews,
    orders: ordersToday,
    pendingDeposits: pendingDeposits ?? 0,
    paymentCheckRequested: paymentCheckRequested ?? 0,
    paid: paidList.length,
    revenue,
    aiFailures: aiFailures ?? 0,
    reportFailures,
    paidAiCostUsd,
    paidAiCostKrw,
    paidEstimatedMargin,
    funnel: [
      { label: "Landing", value: visitors },
      { label: "Fortune Start", value: fortuneStart },
      { label: "Fortune Complete", value: fortuneComplete },
      { label: "Tarot Start", value: tarotStart },
      { label: "Tarot Complete", value: tarotComplete },
      { label: "Product View", value: productViews },
      { label: "Order", value: checkoutStart },
      { label: "Paid", value: paymentSuccess },
    ],
  };
}

export async function getAnalyticsFunnelCounts(opts?: {
  todayOnly?: boolean;
}): Promise<{ label: string; value: number }[]> {
  const bounds = opts?.todayOnly ? seoulDayBounds() : null;
  const startIso = bounds?.startIso ?? "1970-01-01T00:00:00.000Z";
  const endIso = bounds?.endIso ?? new Date().toISOString();

  const names: { label: string; event: string }[] = [
    { label: "Landing", event: "landing_view" },
    { label: "Fortune Start", event: "fortune_start" },
    { label: "Fortune Complete", event: "fortune_form_complete" },
    { label: "Tarot Start", event: "tarot_cards_started" },
    { label: "Tarot Complete", event: "tarot_reading_generated" },
    { label: "Product View", event: "product_view" },
    { label: "Order", event: "checkout_start" },
    { label: "Paid", event: "payment_success" },
  ];

  const values = await Promise.all(
    names.map(async (n) => ({
      label: n.label,
      value: await countEvents(n.event, startIso, endIso),
    }))
  );
  return values;
}
