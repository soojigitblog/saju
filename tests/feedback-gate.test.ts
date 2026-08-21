import { beforeEach, describe, expect, it } from "vitest";
import {
  createFreeFortune,
  resetMockFreeFlowState,
} from "@/lib/services/create-free-fortune";
import {
  startTarotReading,
  selectTarotCards,
  generateTarotCrossReading,
  submitTarotFeedback,
} from "@/lib/services/create-tarot-reading";
import { submitFeedback } from "@/lib/services/submit-feedback";
import { getFeedbackByGuestTarget } from "@/lib/repositories/feedbacks";
import { getTarotReadingById } from "@/lib/repositories/tarot-readings";
import { mockStore } from "@/lib/mock-store";
import { createGuestSessionId } from "@/lib/guest/session";
import { FreeFlowError } from "@/lib/services/free-flow-errors";

const sampleInput = {
  nickname: "피드백",
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

const TAG_FIT = "꽤 맞는 편이에요";
const TAG_CHILL = "소름 돋게 맞았어요";
const TAG_MIXED = "반반이에요";
const LABEL_SURPRISE = "정확해서 놀랐어요";
const LABEL_SOME = "어느 정도 맞아요";

describe("PHASE T1.2 feedback gate", () => {
  beforeEach(() => {
    resetMockFreeFlowState();
    process.env.AI_PROVIDER = "mock";
    process.env.FREE_TAROT_LIMIT = "5";
  });

  it("creates and updates fortune feedback without duplicate rows", async () => {
    const guest = createGuestSessionId();
    const created = await createFreeFortune({
      raw: sampleInput,
      guestSessionId: guest,
    });

    await submitFeedback({
      guestSessionId: guest,
      targetType: "FORTUNE",
      targetId: created.freeResultId,
      rating: 4,
      tags: [TAG_FIT],
    });

    expect(mockStore.feedbacks.size).toBe(1);
    const first = await getFeedbackByGuestTarget({
      guestSessionId: guest,
      targetType: "FORTUNE",
      targetId: created.freeResultId,
    });
    expect(first?.rating).toBe(4);
    expect(first?.tags).toEqual([TAG_FIT]);

    await submitFeedback({
      guestSessionId: guest,
      targetType: "FORTUNE",
      targetId: created.freeResultId,
      rating: 5,
      tags: [TAG_CHILL, TAG_FIT],
    });

    expect(mockStore.feedbacks.size).toBe(1);
    const second = await getFeedbackByGuestTarget({
      guestSessionId: guest,
      targetType: "FORTUNE",
      targetId: created.freeResultId,
    });
    expect(second?.id).toBe(first?.id);
    expect(second?.rating).toBe(5);
    expect(second?.tags).toEqual([TAG_CHILL, TAG_FIT]);
  });

  it("rejects invalid fortune rating and tags", async () => {
    const guest = createGuestSessionId();
    const created = await createFreeFortune({
      raw: sampleInput,
      guestSessionId: guest,
    });

    await expect(
      submitFeedback({
        guestSessionId: guest,
        targetType: "FORTUNE",
        targetId: created.freeResultId,
        rating: 6,
        tags: [TAG_FIT],
      })
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });

    await expect(
      submitFeedback({
        guestSessionId: guest,
        targetType: "FORTUNE",
        targetId: created.freeResultId,
        rating: 3,
        tags: ["없는태그"],
      })
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("denies other guest fortune/tarot/cross feedback", async () => {
    const owner = createGuestSessionId();
    const other = createGuestSessionId();
    const created = await createFreeFortune({
      raw: sampleInput,
      guestSessionId: owner,
    });
    const started = await startTarotReading({
      guestSessionId: owner,
      freeResultId: created.freeResultId,
      questionCategory: "advice",
    });
    await selectTarotCards({
      guestSessionId: owner,
      readingId: started.readingId,
      slotIndices: [0, 1, 2],
    });
    await generateTarotCrossReading({
      guestSessionId: owner,
      readingId: started.readingId,
    });

    await expect(
      submitFeedback({
        guestSessionId: other,
        targetType: "FORTUNE",
        targetId: created.freeResultId,
        rating: 4,
        tags: [TAG_MIXED],
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    await expect(
      submitFeedback({
        guestSessionId: other,
        targetType: "TAROT",
        targetId: started.readingId,
        rating: 4,
        tags: [LABEL_SOME],
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    await expect(
      submitFeedback({
        guestSessionId: other,
        targetType: "CROSS_READING",
        targetId: started.readingId,
        rating: 4,
        tags: [],
        moreFunThanSajuAlone: "YES",
        mostResonant: "CROSS",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("stores tarot feedback on reading and feedbacks table", async () => {
    const guest = createGuestSessionId();
    const created = await createFreeFortune({
      raw: sampleInput,
      guestSessionId: guest,
    });
    const started = await startTarotReading({
      guestSessionId: guest,
      freeResultId: created.freeResultId,
      questionCategory: "career",
    });
    await selectTarotCards({
      guestSessionId: guest,
      readingId: started.readingId,
      slotIndices: [0, 2, 4],
    });
    await generateTarotCrossReading({
      guestSessionId: guest,
      readingId: started.readingId,
    });

    await submitTarotFeedback({
      guestSessionId: guest,
      readingId: started.readingId,
      score: 5,
      label: LABEL_SURPRISE,
    });

    const reading = await getTarotReadingById(started.readingId);
    expect(reading?.feedback_score).toBe(5);
    expect(reading?.feedback_label).toBe(LABEL_SURPRISE);

    const row = await getFeedbackByGuestTarget({
      guestSessionId: guest,
      targetType: "TAROT",
      targetId: started.readingId,
    });
    expect(row?.rating).toBe(5);
    expect(row?.tags).toEqual([LABEL_SURPRISE]);
  });

  it("stores cross reading feedback fields", async () => {
    const guest = createGuestSessionId();
    const created = await createFreeFortune({
      raw: sampleInput,
      guestSessionId: guest,
    });
    const started = await startTarotReading({
      guestSessionId: guest,
      freeResultId: created.freeResultId,
      questionCategory: "love",
    });
    await selectTarotCards({
      guestSessionId: guest,
      readingId: started.readingId,
      slotIndices: [1, 3, 5],
    });
    await generateTarotCrossReading({
      guestSessionId: guest,
      readingId: started.readingId,
    });

    await submitFeedback({
      guestSessionId: guest,
      targetType: "CROSS_READING",
      targetId: started.readingId,
      rating: 4,
      tags: [],
      moreFunThanSajuAlone: "NO",
      mostResonant: "SAJU",
    });

    const updated = await getFeedbackByGuestTarget({
      guestSessionId: guest,
      targetType: "CROSS_READING",
      targetId: started.readingId,
    });
    expect(updated?.more_fun_than_saju_alone).toBe("NO");
    expect(updated?.most_resonant).toBe("SAJU");
  });

  it("rejects cross feedback without required choices", async () => {
    const guest = createGuestSessionId();
    const created = await createFreeFortune({
      raw: sampleInput,
      guestSessionId: guest,
    });
    const started = await startTarotReading({
      guestSessionId: guest,
      freeResultId: created.freeResultId,
      questionCategory: "money",
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

    await expect(
      submitFeedback({
        guestSessionId: guest,
        targetType: "CROSS_READING",
        targetId: started.readingId,
        rating: 3,
        tags: [TAG_MIXED],
      })
    ).rejects.toBeInstanceOf(FreeFlowError);
  });

  it("friend flow: fortune → tarot → cross feedbacks", async () => {
    const guest = createGuestSessionId();
    const created = await createFreeFortune({
      raw: { ...sampleInput, nickname: "친구테스트" },
      guestSessionId: guest,
    });

    await submitFeedback({
      guestSessionId: guest,
      targetType: "FORTUNE",
      targetId: created.freeResultId,
      rating: 4,
      tags: [TAG_FIT, TAG_MIXED],
    });

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

    await submitFeedback({
      guestSessionId: guest,
      targetType: "TAROT",
      targetId: started.readingId,
      rating: 5,
      tags: [LABEL_SURPRISE],
    });

    await submitFeedback({
      guestSessionId: guest,
      targetType: "CROSS_READING",
      targetId: started.readingId,
      rating: 5,
      tags: [],
      moreFunThanSajuAlone: "YES",
      mostResonant: "CROSS",
    });

    const fortune = await getFeedbackByGuestTarget({
      guestSessionId: guest,
      targetType: "FORTUNE",
      targetId: created.freeResultId,
    });
    const tarot = await getFeedbackByGuestTarget({
      guestSessionId: guest,
      targetType: "TAROT",
      targetId: started.readingId,
    });
    const cross = await getFeedbackByGuestTarget({
      guestSessionId: guest,
      targetType: "CROSS_READING",
      targetId: started.readingId,
    });

    expect(fortune?.rating).toBe(4);
    expect(tarot?.tags[0]).toBe(LABEL_SURPRISE);
    expect(cross?.more_fun_than_saju_alone).toBe("YES");
  });
});
