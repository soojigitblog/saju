/**
 * One-off REAL OPERATION smoke — local only. Does not print secrets.
 */
import crypto from "crypto";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const serviceKey =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "";
const origin = process.env.SMOKE_ORIGIN || "http://localhost:3847";
const orderId =
  process.env.SMOKE_ORDER_ID || "9b74f6c9-626a-4220-98bd-619ccafd4e9e";
const email = "ops-admin@unyegyeol.local";

async function main() {
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Supabase env missing");
  }

  const password = "SmokeLocalOnly_A1";
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const { data: listed } = await admin.auth.admin.listUsers({ perPage: 200 });
  const user = listed?.users?.find((u) => u.email === email);
  if (!user) throw new Error("admin user missing — run admin setup first");

  await admin.auth.admin.updateUserById(user.id, {
    password,
    email_confirm: true,
  });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`${origin}/admin/login`, { waitUntil: "networkidle" });
  await page.fill("#admin-email", email);
  await page.fill("#admin-password", password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/admin/dashboard", { timeout: 20000 });
  console.log("browser_admin_login=ok");

  const denyGuest = await fetch(`${origin}/admin/dashboard`, {
    redirect: "manual",
  });
  console.log(`guest_dashboard_status=${denyGuest.status}`);

  await page.goto(`${origin}/admin/bank-deposits`, { waitUntil: "networkidle" });
  const body = (await page.textContent("body")) ?? "";
  const hasOrder =
    body.includes("ORD-20260824-97BD8785") ||
    body.includes("입금확인 요청");
  console.log(`admin_pending_queue=${hasOrder ? "visible" : "missing"}`);

  const confirmRes = await page.evaluate(async (orderId) => {
    const res = await fetch("/api/admin/bank/confirm-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ orderId }),
    });
    const json = await res.json().catch(() => ({}));
    return { status: res.status, json };
  }, orderId);
  console.log(
    `confirm1_status=${confirmRes.status} already=${!!confirmRes.json?.already} code=${confirmRes.json?.code ?? ""}`
  );

  let lastAlready = !!confirmRes.json?.already;
  for (let i = 0; i < 4; i++) {
    const dup = await page.evaluate(async (orderId) => {
      const res = await fetch("/api/admin/bank/confirm-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ orderId }),
      });
      const json = await res.json().catch(() => ({}));
      return { status: res.status, already: !!json.already };
    }, orderId);
    if (i === 3) {
      console.log(`confirm5_status=${dup.status} already=${dup.already}`);
      lastAlready = dup.already;
    }
  }
  console.log(`duplicate_blocked=${lastAlready}`);

  await browser.close();

  // Poll order/report up to 90s (Gemini may be slow)
  let orderStatus = "PENDING";
  let reportStatus = "none";
  for (let t = 0; t < 18; t++) {
    const { data: order } = await admin
      .from("orders")
      .select("status,paid_at")
      .eq("id", orderId)
      .single();
    orderStatus = order?.status ?? orderStatus;
    const { data: report } = await admin
      .from("reports")
      .select("generation_status")
      .eq("order_id", orderId)
      .maybeSingle();
    reportStatus = report?.generation_status ?? reportStatus;
    if (orderStatus === "COMPLETED" || orderStatus === "FAILED") break;
    if (orderStatus === "PAID" || orderStatus === "GENERATING") {
      await new Promise((r) => setTimeout(r, 5000));
      continue;
    }
    break;
  }

  const { count: payCount } = await admin
    .from("payments")
    .select("id", { count: "exact", head: true })
    .eq("order_id", orderId);
  const { count: repCount } = await admin
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("order_id", orderId);
  const { count: aiCount } = await admin
    .from("ai_generations")
    .select("id", { count: "exact", head: true })
    .eq("order_id", orderId);
  const { data: audits } = await admin
    .from("admin_audit_logs")
    .select("admin_user_id,action,target_id,created_at")
    .eq("target_id", orderId)
    .order("created_at", { ascending: false })
    .limit(3);

  console.log(`order_status=${orderStatus}`);
  console.log(`report_status=${reportStatus}`);
  console.log(`payments=${payCount ?? 0}`);
  console.log(`reports=${repCount ?? 0}`);
  console.log(`ai_generations=${aiCount ?? 0}`);
  console.log(`audit_logs=${audits?.length ?? 0}`);
  if (audits?.[0]) {
    console.log(
      `audit_sample action=${audits[0].action} has_admin=${!!audits[0].admin_user_id}`
    );
  }

  const { data: orderRow } = await admin
    .from("orders")
    .select("guest_session_id")
    .eq("id", orderId)
    .single();
  const guest = orderRow?.guest_session_id;
  if (guest) {
    const statusRes = await fetch(`${origin}/api/orders/${orderId}/status`, {
      headers: { Cookie: `fortune_guest_session=${guest}` },
    });
    console.log(`guest_status_http=${statusRes.status}`);
    if (statusRes.ok) {
      const st = (await statusRes.json()) as { status?: string };
      console.log(`guest_order_status=${st.status ?? "unknown"}`);
    }
    const otherGuest = crypto.randomUUID();
    const deny = await fetch(`${origin}/api/orders/${orderId}/status`, {
      headers: { Cookie: `fortune_guest_session=${otherGuest}` },
    });
    console.log(`other_guest_status=${deny.status}`);
  }
}

main().catch((e) => {
  console.error("smoke_fail", e instanceof Error ? e.message : e);
  process.exit(1);
});
