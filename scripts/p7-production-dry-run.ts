/**
 * P7 production dry-run — admin confirm without real bank transfer.
 * Requires running app + admin auth env. No Paid Gemini calls.
 *
 * PRODUCTION_ORIGIN=http://localhost:3847 \
 * P7_ADMIN_EMAIL=... P7_ADMIN_PASSWORD=... \
 * npx tsx scripts/p7-production-dry-run.ts
 */
import { chromium } from "playwright";
import { randomUUID } from "crypto";

const origin = (process.env.PRODUCTION_ORIGIN ?? "").replace(/\/$/, "");
const adminEmail = process.env.P7_ADMIN_EMAIL ?? "";
const adminPassword = process.env.P7_ADMIN_PASSWORD ?? "";

async function main() {
  if (!origin) throw new Error("PRODUCTION_ORIGIN required");
  if (!adminEmail || !adminPassword) {
    throw new Error("P7_ADMIN_EMAIL and P7_ADMIN_PASSWORD required");
  }

  const guest = randomUUID();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Create QA dry-run order via API (needs valid product + free result — skip if env provides)
  const orderId = process.env.P7_DRY_RUN_ORDER_ID;
  if (!orderId) {
    console.log("P7_DRY_RUN_ORDER_ID not set — skip order creation");
    console.log("Create order manually with depositor QA- prefix, then re-run.");
    await browser.close();
    process.exit(0);
  }

  await page.goto(`${origin}/admin/login`, { waitUntil: "networkidle" });
  await page.fill("#admin-email", adminEmail);
  await page.fill("#admin-password", adminPassword);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/admin/**", { timeout: 20000 });

  const confirm1 = await page.evaluate(async (id) => {
    const res = await fetch("/api/admin/bank/confirm-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ orderId: id }),
    });
    return { status: res.status, json: await res.json() };
  }, orderId);

  const confirm2 = await page.evaluate(async (id) => {
    const res = await fetch("/api/admin/bank/confirm-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ orderId: id }),
    });
    return { status: res.status, json: await res.json() };
  }, orderId);

  console.log(`admin_confirm_1=${confirm1.status} already=${!!confirm1.json?.already}`);
  console.log(`admin_confirm_2=${confirm2.status} already=${!!confirm2.json?.already}`);
  console.log(`duplicate_telegram_expected=0`);

  const guestPage = await browser.newPage();
  await guestPage.context().addCookies([
    {
      name: "fortune_guest_session",
      value: guest,
      domain: new URL(origin).hostname,
      path: "/",
    },
  ]);

  await browser.close();

  const ok =
    confirm1.status === 200 &&
    confirm2.status === 200 &&
    confirm2.json?.already === true;

  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(2);
});
