import { beforeEach, describe, expect, it } from "vitest";
import {
  createFreeFortune,
  resetMockFreeFlowState,
  retryFailedFreeFortune,
} from "@/lib/services/create-free-fortune";
import { getFreeResultPageForOwner } from "@/lib/services/get-free-result";
import {
  getFreeResultById,
  updateFreeResult,
} from "@/lib/repositories/free-results";
import { mockStore } from "@/lib/mock-store";
import { FreeFlowError } from "@/lib/services/free-flow-errors";
import { createGuestSessionId } from "@/lib/guest/session";

const sampleInput = {
  nickname: "테스트",
  gender: "female" as const,
  calendarType: "solar" as const,
  birthDate: "1990-05-15",
  birthTime: "10:30",
  birthTimeUnknown: false,
  lunarLeapMonth: false,
  birthPlace: "서울",
  maritalStatus: "unmarried" as const,
  hasChildren: null,
  timezone: "Asia/Seoul" as const,
};

describe("PHASE 5 free fortune E2E (mock)", () => {
  beforeEach(() => {
    resetMockFreeFlowState();
  });

  it("creates guest-owned completed free result with public DTO", async () => {
    const guest = createGuestSessionId();
    const created = await createFreeFortune({
      raw: sampleInput,
      guestSessionId: guest,
    });
    expect(created.status).toBe("COMPLETED");

    const page = await getFreeResultPageForOwner({
      freeResultId: created.freeResultId,
      guestSessionId: guest,
    });
    expect(page.result.nickname).toBe("테스트");
    expect(page.result.headline.length).toBeGreaterThan(0);
    expect(page.result.previews.every((p) => p.locked)).toBe(true);
    expect(page.products.length).toBeGreaterThan(0);
    const serialized = JSON.stringify(page.result);
    expect(serialized.includes("generationKey")).toBe(false);
    expect(serialized.includes("calculationHash")).toBe(false);
  });

  it("dedupes profile, chart, and generation on double submit", async () => {
    const guest = createGuestSessionId();
    const a = await createFreeFortune({ raw: sampleInput, guestSessionId: guest });
    const b = await createFreeFortune({ raw: sampleInput, guestSessionId: guest });
    expect(a.freeResultId).toBe(b.freeResultId);
    expect(mockStore.profiles.size).toBe(1);
    expect(mockStore.freeResults.size).toBe(1);
  });

  it("allows multiple profiles for same guest with different births", async () => {
    const guest = createGuestSessionId();
    await createFreeFortune({ raw: sampleInput, guestSessionId: guest });
    await createFreeFortune({
      raw: { ...sampleInput, birthDate: "1991-01-01", nickname: "가족" },
      guestSessionId: guest,
    });
    expect(mockStore.profiles.size).toBe(2);
  });

  it("denies other guest access", async () => {
    const owner = createGuestSessionId();
    const other = createGuestSessionId();
    const created = await createFreeFortune({
      raw: sampleInput,
      guestSessionId: owner,
    });
    await expect(
      getFreeResultPageForOwner({
        freeResultId: created.freeResultId,
        guestSessionId: other,
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("invalid birth year maps to user-friendly error", async () => {
    const guest = createGuestSessionId();
    await expect(
      createFreeFortune({
        raw: { ...sampleInput, birthDate: "1899-01-01" },
        guestSessionId: guest,
      })
    ).rejects.toBeInstanceOf(FreeFlowError);
  });

  it("retry increments attempt_count on failed row", async () => {
    const guest = createGuestSessionId();
    const created = await createFreeFortune({
      raw: sampleInput,
      guestSessionId: guest,
    });
    await updateFreeResult(created.freeResultId, {
      generation_status: "FAILED",
      error_code: "AI_GENERATION_FAILED",
      error_message: "결과 생성 중 문제가 발생했습니다.",
      attempt_count: 1,
    });
    const retried = await retryFailedFreeFortune({
      freeResultId: created.freeResultId,
      guestSessionId: guest,
    });
    expect(retried.status).toBe("COMPLETED");
    const row = await getFreeResultById(created.freeResultId);
    expect(row?.attempt_count).toBeGreaterThanOrEqual(2);
  });

  it("rate limit eventually blocks", async () => {
    const guest = createGuestSessionId();
    process.env.FREE_FORTUNE_LIMIT = "2";
    process.env.FREE_FORTUNE_WINDOW_SECONDS = "3600";
    try {
      await createFreeFortune({
        raw: { ...sampleInput, birthDate: "1990-05-15" },
        guestSessionId: guest,
      });
      await createFreeFortune({
        raw: { ...sampleInput, birthDate: "1990-06-15" },
        guestSessionId: guest,
      });
      await expect(
        createFreeFortune({
          raw: { ...sampleInput, birthDate: "1990-07-15" },
          guestSessionId: guest,
        })
      ).rejects.toMatchObject({ code: "RATE_LIMITED" });
    } finally {
      delete process.env.FREE_FORTUNE_LIMIT;
      delete process.env.FREE_FORTUNE_WINDOW_SECONDS;
    }
  });
});
