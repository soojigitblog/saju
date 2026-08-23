/**
 * Seed one BANK_TRANSFER order for live E2E (depositor 정수지).
 * Persists into .dev/mock-store.json shared with next + bank:poll.
 */
import fs from "node:fs";
import path from "node:path";
import { createFreeFortune } from "../src/lib/services/create-free-fortune";
import { createOrderForGuest } from "../src/lib/services/create-order";
import { createGuestSessionId } from "../src/lib/guest/session";
import { MOCK_PRODUCT_IDS } from "../src/lib/mock-data";

function loadEnvLocal() {
  const p = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!(k in process.env)) process.env[k] = v;
  }
}

loadEnvLocal();
process.env.NODE_ENV = "development";

const depositor = process.argv[2]?.trim() || "정수지";

async function main() {
  process.env.AI_PROVIDER = process.env.AI_PROVIDER || "mock";

  const guest = createGuestSessionId();
  const free = await createFreeFortune({
    raw: {
      nickname: depositor,
      gender: "female",
      calendarType: "solar",
      birthDate: "1990-05-15",
      birthTime: "10:00",
      birthTimeUnknown: false,
      lunarLeapMonth: false,
      birthPlace: "서울",
      maritalStatus: "unmarried",
      hasChildren: null,
      timezone: "Asia/Seoul",
    },
    guestSessionId: guest,
  });

  const created = await createOrderForGuest({
    guestSessionId: guest,
    productId: MOCK_PRODUCT_IDS.total,
    sourceResultId: free.freeResultId,
    depositorName: depositor,
    paymentMethod: "BANK_TRANSFER",
  });

  console.log(
    JSON.stringify(
      {
        guestSessionId: guest,
        orderId: created.order.id,
        orderNo: created.order.orderNo,
        amount: created.order.amount,
        depositorName: depositor,
        waitUrl: `http://localhost:3847${created.waitUrl}`,
        setCookieHint: `document.cookie="fortune_guest_session=${guest}; path=/"; location.href="${created.waitUrl}";`,
      },
      null,
      2
    )
  );
}

void main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
