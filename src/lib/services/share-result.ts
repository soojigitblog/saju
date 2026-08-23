import "server-only";

import { toFreeResultPublicDTO } from "@/lib/dto/free-result-public";
import type {
  FreeResultShareSnapshot,
  PublicShareDTO,
  ShareSnapshot,
  TarotShareSnapshot,
} from "@/lib/dto/share-public";
import { getFreeResultById } from "@/lib/repositories/free-results";
import { getProfileById } from "@/lib/repositories/profiles";
import {
  getActiveShareForResource,
  getSharedResultByToken,
} from "@/lib/repositories/shared-results";
import { getTarotReadingById } from "@/lib/repositories/tarot-readings";
import { createShareToken, isValidShareToken } from "@/lib/share/share-token";
import { getFreeResultPageForOwner } from "@/lib/services/get-free-result";
import { FreeFlowError } from "@/lib/services/free-flow-errors";
import type { FreeInterpretationOutput } from "@/lib/ai/types";

const POSITION_LABEL: Record<string, string> = {
  CURRENT: "현재 상황",
  BLOCK: "걸림돌",
  DIRECTION: "필요한 방향",
};

export async function createShareLink(input: {
  guestSessionId: string;
  resourceType: "FREE_RESULT" | "TAROT_READING";
  resourceId: string;
}): Promise<{ shareToken: string; shareUrl: string }> {
  const existing = await getActiveShareForResource({
    resourceType: input.resourceType,
    resourceId: input.resourceId,
  });
  if (existing) {
    return {
      shareToken: existing.share_token,
      shareUrl: `/share/${existing.share_token}`,
    };
  }

  const snapshot = await buildShareSnapshotForOwner(input);
  const { createSharedResult } = await import("@/lib/repositories/shared-results");
  const shareToken = createShareToken();
  await createSharedResult({
    shareToken,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    snapshot: snapshot.snapshot,
    displayNickname: snapshot.displayNickname,
    displayBirthYearLabel: snapshot.displayBirthYearLabel,
  });

  return { shareToken, shareUrl: `/share/${shareToken}` };
}

export async function getPublicShareByToken(
  shareToken: string
): Promise<PublicShareDTO> {
  if (!isValidShareToken(shareToken)) {
    throw new FreeFlowError("NOT_FOUND", "공유 링크를 찾을 수 없습니다.", 404);
  }

  const row = await getSharedResultByToken(shareToken);
  if (!row || row.revoked_at) {
    throw new FreeFlowError("NOT_FOUND", "공유 링크를 찾을 수 없습니다.", 404);
  }
  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    throw new FreeFlowError("NOT_FOUND", "공유 링크가 만료되었습니다.", 404);
  }

  return {
    shareToken: row.share_token,
    sharedAt: row.created_at,
    snapshot: row.snapshot_json,
  };
}

async function buildShareSnapshotForOwner(input: {
  guestSessionId: string;
  resourceType: "FREE_RESULT" | "TAROT_READING";
  resourceId: string;
}): Promise<{
  snapshot: ShareSnapshot;
  displayNickname: string;
  displayBirthYearLabel: string | null;
}> {
  if (input.resourceType === "FREE_RESULT") {
    const page = await getFreeResultPageForOwner({
      freeResultId: input.resourceId,
      guestSessionId: input.guestSessionId,
    });
    const { id, ...resultWithoutId } = page.result;
    void id;
    const snapshot: FreeResultShareSnapshot = {
      type: "FREE_RESULT",
      profile: {
        nickname: page.result.nickname,
        birthYearLabel: page.result.birthYearLabel,
      },
      result: resultWithoutId,
    };
    return {
      snapshot,
      displayNickname: page.result.nickname,
      displayBirthYearLabel: page.result.birthYearLabel,
    };
  }

  const reading = await getTarotReadingById(input.resourceId);
  if (!reading || reading.guest_session_id !== input.guestSessionId) {
    throw new FreeFlowError("FORBIDDEN", "접근 권한이 없습니다.", 403);
  }
  if (reading.generation_status !== "COMPLETED" || !reading.result_json) {
    throw new FreeFlowError("NOT_READY", "아직 공유할 결과가 준비되지 않았습니다.", 409);
  }

  const result = reading.result_json as {
    fortunePattern: TarotShareSnapshot["fortunePattern"];
    cards: Array<{
      position: string;
      nameKo: string;
      orientation: string;
      interpretation: string;
    }>;
    crossInsight: TarotShareSnapshot["crossInsight"];
    closingMessage: string;
    disclaimer: string;
  };

  let nickname = "운의결";
  let birthYearLabel: string | null = null;
  if (reading.free_result_id) {
    const freeRow = await getFreeResultById(reading.free_result_id);
    if (freeRow) {
      const profile = await getProfileById(freeRow.profile_id);
      if (profile) {
        nickname = profile.nickname;
        const birthYear = Number(String(profile.birth_date).slice(0, 4));
        birthYearLabel = Number.isFinite(birthYear) ? `${birthYear}년생` : null;
      }
    }
  }

  const snapshot: TarotShareSnapshot = {
    type: "TAROT_READING",
    profile: { nickname, birthYearLabel },
    questionCategory: reading.question_category,
    cards: result.cards.map((c) => ({
      position: c.position,
      positionLabel: POSITION_LABEL[c.position] ?? c.position,
      nameKo: c.nameKo,
      orientation: c.orientation,
      interpretation: c.interpretation,
    })),
    fortunePattern: result.fortunePattern,
    crossInsight: result.crossInsight,
    closingMessage: result.closingMessage,
    disclaimer: result.disclaimer,
  };

  return { snapshot, displayNickname: nickname, displayBirthYearLabel: birthYearLabel };
}

/** @internal test helper — build snapshot from interpretation */
export function buildFreeResultShareSnapshot(input: {
  nickname: string;
  birthYear: number | null;
  result: FreeInterpretationOutput;
}): FreeResultShareSnapshot {
  const dto = toFreeResultPublicDTO({
    id: "00000000-0000-0000-0000-000000000000",
    nickname: input.nickname,
    birthYear: input.birthYear,
    result: input.result,
  });
  const { id, ...resultWithoutId } = dto;
  void id;
  return {
    type: "FREE_RESULT",
    profile: {
      nickname: input.nickname,
      birthYearLabel: dto.birthYearLabel,
    },
    result: resultWithoutId,
  };
}
