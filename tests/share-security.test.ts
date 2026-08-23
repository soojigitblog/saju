import { beforeEach, describe, expect, it } from "vitest";
import {
  createFreeFortune,
  resetMockFreeFlowState,
} from "@/lib/services/create-free-fortune";
import {
  startTarotReading,
  selectTarotCards,
  generateTarotCrossReading,
} from "@/lib/services/create-tarot-reading";
import {
  createShareLink,
  getPublicShareByToken,
} from "@/lib/services/share-result";
import { getFreeResultPageForOwner } from "@/lib/services/get-free-result";
import { createGuestSessionId } from "@/lib/guest/session";
import { FreeFlowError } from "@/lib/services/free-flow-errors";
import { isValidShareToken } from "@/lib/share/share-token";

const life = {
  maritalStatus: "unmarried" as const,
  hasChildren: null,
};

describe("share security (mock)", () => {
  beforeEach(() => {
    resetMockFreeFlowState();
    process.env.AI_PROVIDER = "mock";
  });

  async function seedFreeResult(guest: string, nickname: string, birthDate: string) {
    return createFreeFortune({
      raw: {
        nickname,
        gender: "female",
        calendarType: "solar",
        birthDate,
        birthTime: "10:30",
        birthTimeUnknown: false,
        lunarLeapMonth: false,
        birthPlace: "서울",
        ...life,
        timezone: "Asia/Seoul",
      },
      guestSessionId: guest,
    });
  }

  it("share token is random and not sequential", async () => {
    const guest = createGuestSessionId();
    const created = await seedFreeResult(guest, "A", "1990-01-01");
    const { shareToken } = await createShareLink({
      guestSessionId: guest,
      resourceType: "FREE_RESULT",
      resourceId: created.freeResultId,
    });
    expect(isValidShareToken(shareToken)).toBe(true);
    expect(shareToken).not.toMatch(/^\d+$/);
    expect(shareToken.length).toBeGreaterThanOrEqual(32);
  });

  it("User A shares Result A — public view exposes only that snapshot", async () => {
    const guestA = createGuestSessionId();
    const resultA = await seedFreeResult(guestA, "사용자A", "1990-01-01");
    const resultB = await seedFreeResult(guestA, "사용자A-2", "1991-02-02");

    const { shareToken } = await createShareLink({
      guestSessionId: guestA,
      resourceType: "FREE_RESULT",
      resourceId: resultA.freeResultId,
    });

    const publicView = await getPublicShareByToken(shareToken);
    expect(publicView.snapshot.type).toBe("FREE_RESULT");
    if (publicView.snapshot.type === "FREE_RESULT") {
      expect(publicView.snapshot.profile.nickname).toBe("사용자A");
      expect(publicView.snapshot.result.headline.length).toBeGreaterThan(0);
      // Must not expose internal IDs in snapshot
      expect(JSON.stringify(publicView.snapshot)).not.toContain(resultB.freeResultId);
      expect(JSON.stringify(publicView.snapshot)).not.toContain("guest_session");
      expect(JSON.stringify(publicView.snapshot)).not.toContain("userId");
      expect(JSON.stringify(publicView.snapshot)).not.toContain("email");
    }
  });

  it("invalid or tampered token returns NOT_FOUND", async () => {
    await expect(getPublicShareByToken("123")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(getPublicShareByToken("not-a-valid-token-at-all!!")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("other guest cannot create share for foreign result", async () => {
    const owner = createGuestSessionId();
    const other = createGuestSessionId();
    const created = await seedFreeResult(owner, "소유자", "1988-03-03");

    await expect(
      createShareLink({
        guestSessionId: other,
        resourceType: "FREE_RESULT",
        resourceId: created.freeResultId,
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("public share does not grant owner page access without cookie", async () => {
    const guest = createGuestSessionId();
    const created = await seedFreeResult(guest, "공유테스트", "1992-05-05");
    await createShareLink({
      guestSessionId: guest,
      resourceType: "FREE_RESULT",
      resourceId: created.freeResultId,
    });

    const stranger = createGuestSessionId();
    await expect(
      getFreeResultPageForOwner({
        freeResultId: created.freeResultId,
        guestSessionId: stranger,
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("tarot share exposes cross reading only", async () => {
    const guest = createGuestSessionId();
    const created = await seedFreeResult(guest, "타로공유", "1994-06-06");
    const started = await startTarotReading({
      guestSessionId: guest,
      freeResultId: created.freeResultId,
      questionCategory: "advice",
    });
    await selectTarotCards({
      guestSessionId: guest,
      readingId: started.readingId,
      slotIndices: [0, 1, 2],
    });
    await generateTarotCrossReading({
      guestSessionId: guest,
      readingId: started.readingId,
    });

    const { shareToken } = await createShareLink({
      guestSessionId: guest,
      resourceType: "TAROT_READING",
      resourceId: started.readingId,
    });

    const publicView = await getPublicShareByToken(shareToken);
    expect(publicView.snapshot.type).toBe("TAROT_READING");
    if (publicView.snapshot.type === "TAROT_READING") {
      expect(publicView.snapshot.cards).toHaveLength(3);
      expect(publicView.snapshot.crossInsight.headline.length).toBeGreaterThan(0);
      expect(JSON.stringify(publicView.snapshot)).not.toContain(started.readingId);
      expect(JSON.stringify(publicView.snapshot)).not.toContain(created.freeResultId);
    }
  });

  it("reuses active share link for same resource", async () => {
    const guest = createGuestSessionId();
    const created = await seedFreeResult(guest, "재사용", "1996-08-08");
    const first = await createShareLink({
      guestSessionId: guest,
      resourceType: "FREE_RESULT",
      resourceId: created.freeResultId,
    });
    const second = await createShareLink({
      guestSessionId: guest,
      resourceType: "FREE_RESULT",
      resourceId: created.freeResultId,
    });
    expect(second.shareToken).toBe(first.shareToken);
  });
});

describe("forbidden prediction patterns (semantic)", () => {
  it("blocks negative definitive phrases", async () => {
    const { FORBIDDEN_PREDICTION_PATTERNS } = await import(
      "@/lib/ai/validators/semantic-validator"
    );
    const samples = [
      "재물운에 한방은 없습니다.",
      "돈복이 없어요.",
      "사업운이 없습니다.",
      "재물운이 없습니다.",
    ];
    for (const text of samples) {
      expect(
        FORBIDDEN_PREDICTION_PATTERNS.some((re) => re.test(text)),
        `expected block: ${text}`
      ).toBe(true);
    }
  });
});
