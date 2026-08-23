import { beforeEach, describe, expect, it } from "vitest";
import {
  bankConnectionMessage,
  bankConnectionUserMessage,
  resolveBankConnectionLabel,
} from "@/lib/bank/connection-status";
import { detectHanaAuthStateFromContent } from "@/lib/bank/hana/playwright/auth-detect";
import { getMockHanaBankProvider } from "@/lib/bank/mock-provider";
import { mockStore } from "@/lib/mock-store";
import { runBankPollCycle } from "@/lib/services/bank-poller";
import { resetMockFreeFlowState } from "@/lib/services/create-free-fortune";

describe("bank connection status", () => {
  it("maps SESSION_EXPIRED status and admin message", () => {
    expect(
      resolveBankConnectionLabel(
        {
          status: "SESSION_EXPIRED",
          last_success_at: null,
          last_error_safe: "HANA_SESSION_EXPIRED",
        },
        true
      )
    ).toBe("SESSION_EXPIRED");
    expect(bankConnectionMessage("SESSION_EXPIRED")).toBe(
      "하나은행 세션 재로그인 필요"
    );
  });

  it("maps legacy ERROR + HANA_SESSION_EXPIRED", () => {
    expect(
      resolveBankConnectionLabel(
        {
          status: "ERROR",
          last_success_at: null,
          last_error_safe: "HANA_SESSION_EXPIRED",
        },
        true
      )
    ).toBe("SESSION_EXPIRED");
  });

  it("user message for session disconnect", () => {
    expect(bankConnectionUserMessage("SESSION_EXPIRED")).toContain(
      "입금 확인 시스템 연결이 잠시 끊겼습니다"
    );
    expect(bankConnectionUserMessage("CONNECTED")).toBeNull();
  });

  it("maps recent success to CONNECTED", () => {
    expect(
      resolveBankConnectionLabel(
        {
          status: "IDLE",
          last_success_at: new Date().toISOString(),
          last_error_safe: null,
        },
        true
      )
    ).toBe("CONNECTED");
  });

  it("returns NOT_CONFIGURED when automation off", () => {
    expect(resolveBankConnectionLabel(null, false)).toBe("NOT_CONFIGURED");
  });
});

describe("hana auth detect", () => {
  it("detects login page as SESSION_EXPIRED (not empty txs)", () => {
    expect(
      detectHanaAuthStateFromContent({
        url: "https://banking.kebhana.com/common/login/index.do",
        title: "하나은행 개인뱅킹 로그인[pbk1-01002]",
        bodyText: "아이디 비밀번호 로그인 하나인증서",
      })
    ).toBe("SESSION_EXPIRED");
  });

  it("detects transaction page as LOGGED_IN", () => {
    expect(
      detectHanaAuthStateFromContent({
        url: "https://banking.kebhana.com/inquiry/account/wpdep406_72i_03_n_r.do",
        title: "거래내역조회",
        bodyText: "조회기간 거래일시 입금 출금 잔액",
      })
    ).toBe("LOGGED_IN");
  });

  it("does not treat long non-banking page as logged in", () => {
    expect(
      detectHanaAuthStateFromContent({
        url: "https://banking.kebhana.com/",
        title: "하나은행",
        bodyText: "a".repeat(500),
      })
    ).toBe("UNKNOWN");
  });
});

describe("bank poller session expired", () => {
  beforeEach(() => {
    resetMockFreeFlowState();
    process.env.BANK_PROVIDER = "mock";
    process.env.AI_PROVIDER = "mock";
    getMockHanaBankProvider().clear();
  });

  it("sets SESSION_EXPIRED health and does not report ok fetched=0", async () => {
    getMockHanaBankProvider().failNextWith("HANA_SESSION_EXPIRED");
    const first = await runBankPollCycle();
    expect(first.ok).toBe(false);
    expect(first.errorSafe).toBe("HANA_SESSION_EXPIRED");
    expect(first.quiet).toBeFalsy();
    expect(mockStore.bankPollerHealth?.status).toBe("SESSION_EXPIRED");

    getMockHanaBankProvider().failNextWith("HANA_SESSION_EXPIRED");
    const second = await runBankPollCycle();
    expect(second.ok).toBe(false);
    expect(second.quiet).toBe(true);
    expect(mockStore.bankPollerHealth?.status).toBe("SESSION_EXPIRED");
  });

  it("recovers to CONNECTED after successful fetch", async () => {
    getMockHanaBankProvider().failNextWith("HANA_SESSION_EXPIRED");
    await runBankPollCycle();
    expect(mockStore.bankPollerHealth?.status).toBe("SESSION_EXPIRED");

    getMockHanaBankProvider().clear();
    const recovered = await runBankPollCycle();
    expect(recovered.ok).toBe(true);
    expect(recovered.recovered).toBe(true);
    expect(recovered.fetched).toBe(0);
    expect(mockStore.bankPollerHealth?.status).toBe("IDLE");
    expect(mockStore.bankPollerHealth?.last_error_safe).toBeNull();
    expect(
      resolveBankConnectionLabel(mockStore.bankPollerHealth, true)
    ).toBe("CONNECTED");
  });
});
