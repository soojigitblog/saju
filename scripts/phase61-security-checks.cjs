/**
 * PHASE 6.1 security checks — uses known local free_result ownership.
 * Fill FREE_ID / GUEST from latest COMPLETED row if needed.
 */
const BASE = process.env.PHASE61_BASE || "http://127.0.0.1:3847";
const fs = require("fs");
const path = require("path");

// From local Supabase (COMPLETED). Override via env if stale.
const FREE_ID =
  process.env.PHASE61_FREE_ID || "b5566bdb-ae11-4199-9a03-b3701c65987d";
const GUEST_A =
  process.env.PHASE61_GUEST || "833599ed-0cde-439e-bf9d-36d4a89de4a4";
const PRODUCT_ID = "33333333-3333-3333-3333-333333333301";

function mergeCookies(existing, res) {
  const map = new Map();
  for (const part of (existing || "")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)) {
    const i = part.indexOf("=");
    if (i > 0) map.set(part.slice(0, i), part);
  }
  for (const line of res.headers.getSetCookie?.() ?? []) {
    const pair = line.split(";")[0];
    const i = pair.indexOf("=");
    if (i > 0) map.set(pair.slice(0, i), pair);
  }
  return [...map.values()].join("; ");
}

async function req(pathName, { method = "GET", body, cookie = "" } = {}) {
  const origin = new URL(BASE).origin;
  const res = await fetch(`${BASE}${pathName}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      Origin: origin,
      "Sec-Fetch-Site": "same-origin",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* ignore */
  }
  return { status: res.status, json, cookie: mergeCookies(cookie, res), text };
}

async function main() {
  const report = {
    freeFortune: "REUSED_EXISTING",
    orderCreate: "FAIL",
    orderAmount: null,
    orderId: null,
    orderNo: null,
    fakeSuccess: "FAIL",
    amountMismatch: "FAIL",
    otherGuest: "FAIL",
    checkoutOtherDenied: "FAIL",
    providerMode: null,
    fakeCode: null,
  };

  const cookieA = `fortune_guest_session=${GUEST_A}`;
  const orderRes = await req("/api/orders", {
    method: "POST",
    cookie: cookieA,
    body: { productId: PRODUCT_ID, sourceResultId: FREE_ID, amount: 100 },
  });
  if (orderRes.status !== 200 || !orderRes.json?.orderId) {
    console.log(JSON.stringify({ ...report, error: "order create failed", orderRes }, null, 2));
    process.exit(1);
  }
  report.orderCreate = "PASS";
  report.orderId = orderRes.json.orderId;
  report.orderNo = orderRes.json.orderNo;
  report.orderAmount = orderRes.json.amount;
  if (report.orderAmount !== 12900) {
    console.log(JSON.stringify({ ...report, error: "price not 12900" }, null, 2));
    process.exit(1);
  }

  const checkoutPage = await fetch(`${BASE}/checkout/${report.orderId}`, {
    headers: { Cookie: cookieA },
  });
  const html = await checkoutPage.text();
  report.providerMode = html.includes("테스트 결제 (Mock)") ? "mock" : "toss-ui";
  if (report.providerMode === "mock") {
    console.log(JSON.stringify({ ...report, error: "Mock UI" }, null, 2));
    process.exit(1);
  }

  const fake = await req("/api/payments/toss/confirm", {
    method: "POST",
    cookie: cookieA,
    body: {
      paymentKey: "invalid_fake_payment_key_phase61",
      orderId: report.orderNo,
      amount: 12900,
    },
  });
  report.fakeCode = fake.json?.code ?? null;
  if (fake.status >= 400 && fake.json?.code) {
    report.fakeSuccess = "DENIED";
  }

  const mismatch = await req("/api/payments/toss/confirm", {
    method: "POST",
    cookie: cookieA,
    body: {
      paymentKey: "pk_any_key_for_amount_check_xxxx",
      orderId: report.orderNo,
      amount: 100,
    },
  });
  if (mismatch.json?.code === "PAYMENT_AMOUNT_MISMATCH") {
    report.amountMismatch = "DENIED";
  }

  const cookieB = `fortune_guest_session=${crypto.randomUUID()}`;
  const otherConfirm = await req("/api/payments/toss/confirm", {
    method: "POST",
    cookie: cookieB,
    body: {
      paymentKey: "pk_other_guest_phase61_xxxxx",
      orderId: report.orderNo,
      amount: 12900,
    },
  });
  if (otherConfirm.status === 403 || otherConfirm.json?.code === "FORBIDDEN") {
    report.otherGuest = "DENIED";
  }

  const otherCheckout = await fetch(`${BASE}/checkout/${report.orderId}`, {
    headers: { Cookie: cookieB },
  });
  const otherHtml = await otherCheckout.text();
  if (
    otherHtml.includes("접근할 수 없습니다") ||
    (otherHtml.includes("권한이") && !otherHtml.includes("12,900"))
  ) {
    report.checkoutOtherDenied = "DENIED";
  }

  fs.writeFileSync(
    path.join(__dirname, "phase61-order.json"),
    JSON.stringify(
      {
        orderId: report.orderId,
        orderNo: report.orderNo,
        amount: report.orderAmount,
        guestSessionId: GUEST_A,
        freeResultId: FREE_ID,
      },
      null,
      2
    )
  );

  console.log(JSON.stringify(report, null, 2));
  const ok =
    report.orderCreate === "PASS" &&
    report.orderAmount === 12900 &&
    report.fakeSuccess === "DENIED" &&
    report.amountMismatch === "DENIED" &&
    report.otherGuest === "DENIED" &&
    report.checkoutOtherDenied === "DENIED" &&
    report.providerMode === "toss-ui";
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(String(e));
  process.exit(1);
});
