import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildDepositCheckRequestedMessage,
  maskDepositorNameForAlert,
  notifyDepositCheckRequested,
} from "@/lib/notifications";
import {
  createFreeFortune,
  resetMockFreeFlowState,
} from "@/lib/services/create-free-fortune";
import { createOrderForGuest } from "@/lib/services/create-order";
import { createGuestSessionId } from "@/lib/guest/session";
import { MOCK_PRODUCT_IDS } from "@/lib/mock-data";
import { getOrderById } from "@/lib/repositories/orders";
import { POST as depositAck } from "@/app/api/orders/[id]/deposit-ack/route";

const sampleInput = {
  nickname: "알림테스트",
  gender: "female" as const,
  calendarType: "solar" as const,
  birthDate: "1991-04-04",
  birthTime: "11:00",
  birthTimeUnknown: false,
  lunarLeapMonth: false,
  birthPlace: "서울",
  maritalStatus: "unmarried" as const,
  hasChildren: null,
  timezone: "Asia/Seoul" as const,
};

describe("telegram deposit alert helpers", () => {
  it("masks depositor names", () => {
    expect(maskDepositorNameForAlert("김수지")).toBe("김**");
    expect(maskDepositorNameForAlert("A")).toBe("A**");
    expect(maskDepositorNameForAlert(null)).toBe("—");
  });

  it("builds privacy-safe message without birth/chart secrets", () => {
    const payload = buildDepositCheckRequestedMessage({
      orderNo: "ORD-TEST-1",
      productName: "2026년 종합운세",
      amount: 12900,
      depositorName: "김수지",
      requestedAt: "2026-08-24T00:00:00.000Z",
    });
    expect(payload.title).toContain("입금확인 요청");
    expect(payload.body).toContain("ORD-TEST-1");
    expect(payload.body).toContain("김**");
    expect(payload.body).not.toContain("김수지");
    expect(payload.body).not.toContain("1991");
    expect(payload.body).not.toContain("guest");
    expect(JSON.stringify(payload)).not.toContain("TELEGRAM");
  });
});

describe("deposit-ack telegram dedupe", () => {
  beforeEach(() => {
    resetMockFreeFlowState();
    process.env.AI_PROVIDER = "mock";
    process.env.BANK_PROVIDER = "mock";
    process.env.BANK_TRANSFER_ACCOUNT_NUMBER = "123-456789-01234";
    process.env.BANK_TRANSFER_ACCOUNT_HOLDER = "운의결";
    process.env.NODE_ENV = "test";
    process.env.TELEGRAM_BOT_TOKEN = "test-token";
    process.env.TELEGRAM_ADMIN_CHAT_ID = "12345";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("api.telegram.org")) {
          return new Response(JSON.stringify({ ok: true }), { status: 200 });
        }
        return new Response("not found", { status: 404 });
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_ADMIN_CHAT_ID;
  });

  async function seedOrder(depositor: string) {
    const guest = createGuestSessionId();
    const free = await createFreeFortune({
      raw: { ...sampleInput, nickname: depositor },
      guestSessionId: guest,
    });
    const created = await createOrderForGuest({
      guestSessionId: guest,
      productId: MOCK_PRODUCT_IDS.total,
      sourceResultId: free.freeResultId,
      depositorName: depositor,
      paymentMethod: "BANK_TRANSFER",
    });
    return { guest, orderId: created.order.id, orderNo: created.order.orderNo };
  }

  function ackRequest(orderId: string) {
    return new Request(`http://localhost/api/orders/${orderId}/deposit-ack`, {
      method: "POST",
      headers: {
        origin: "http://localhost",
        host: "localhost",
      },
    });
  }

  it("sends Telegram once then blocks duplicate", async () => {
    const { guest, orderId } = await seedOrder("박민수");

    vi.spyOn(
      await import("@/lib/guest/cookie"),
      "getGuestSessionId"
    ).mockResolvedValue(guest);

    const first = await depositAck(ackRequest(orderId), {
      params: Promise.resolve({ id: orderId }),
    });
    const firstJson = (await first.json()) as {
      alreadyRequested?: boolean;
      notificationSent?: boolean;
      message?: string;
    };
    expect(first.status).toBe(200);
    expect(firstJson.alreadyRequested).toBeFalsy();

    const telegramCalls = (fetch as unknown as ReturnType<typeof vi.fn>).mock
      .calls;
    const sent = telegramCalls.filter((c) =>
      String(c[0]).includes("api.telegram.org")
    );
    expect(sent.length).toBe(1);

    const body = JSON.parse(String((sent[0][1] as RequestInit).body)) as {
      text: string;
    };
    expect(body.text).toContain("박**");
    expect(body.text).not.toContain("박민수");

    const second = await depositAck(ackRequest(orderId), {
      params: Promise.resolve({ id: orderId }),
    });
    const secondJson = (await second.json()) as {
      alreadyRequested?: boolean;
      message?: string;
    };
    expect(secondJson.alreadyRequested).toBe(true);
    expect(secondJson.message).toContain("이미 입금 확인 요청");

    const sentAfter = (
      fetch as unknown as ReturnType<typeof vi.fn>
    ).mock.calls.filter((c) => String(c[0]).includes("api.telegram.org"));
    expect(sentAfter.length).toBe(1);

    const order = await getOrderById(orderId);
    expect(order?.payment_check_requested_at).toBeTruthy();
  });

  it("keeps deposit request when Telegram fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("fail", { status: 500 }))
    );

    const { guest, orderId } = await seedOrder("이하나");
    vi.spyOn(
      await import("@/lib/guest/cookie"),
      "getGuestSessionId"
    ).mockResolvedValue(guest);

    const res = await depositAck(ackRequest(orderId), {
      params: Promise.resolve({ id: orderId }),
    });
    expect(res.status).toBe(200);
    const order = await getOrderById(orderId);
    expect(order?.payment_check_requested_at).toBeTruthy();
  });

  it("denies other guest", async () => {
    const { orderId } = await seedOrder("최테스트");
    vi.spyOn(
      await import("@/lib/guest/cookie"),
      "getGuestSessionId"
    ).mockResolvedValue(createGuestSessionId());

    const res = await depositAck(ackRequest(orderId), {
      params: Promise.resolve({ id: orderId }),
    });
    expect(res.status).toBe(403);
  });

  it("notifyDepositCheckRequested skips when unset", async () => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_ADMIN_CHAT_ID;
    const result = await notifyDepositCheckRequested({
      orderNo: "ORD-X",
      productName: "테스트",
      amount: 1000,
      depositorName: "홍길동",
      requestedAt: new Date().toISOString(),
    });
    expect(result.skipped).toBe(true);
    expect(result.sent).toBe(0);
  });
});
