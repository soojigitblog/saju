import { USER_FACING_DISCLAIMER } from "@/lib/ai/disclaimer";
import type { FortuneAiContext } from "@/lib/ai/types";
import type { CrossReadingResult } from "@/lib/ai/schemas/cross-reading";
import type { TarotAiContext } from "@/lib/tarot/engine/draw";

export function buildMockCrossReading(
  fortuneCtx: FortuneAiContext,
  tarotCtx: TarotAiContext
): CrossReadingResult {
  const dm = fortuneCtx.dayMaster;
  const cards = tarotCtx.spread.map((s) => ({
    position: s.position,
    positionIndex: s.positionIndex,
    cardId: s.cardId,
    nameKo: s.nameKo,
    orientation: s.orientation,
    interpretation:
      `${s.nameKo}(${s.orientation === "UPRIGHT" ? "정방향" : "역방향"})은 ` +
      `${s.canonicalMeaning} ` +
      `지금 질문과 연결하면, ${positionHint(s.position)}으로 읽어볼 수 있습니다.`,
  }));

  return {
    fortunePattern: {
      title: "이미 답을 세워두고 확인을 구하는 편",
      summary:
        `${dm.stem}(${dm.hangul}) 일간을 중심으로 보면, 겉으로는 고민이 길어 보여도 ` +
        `속으로는 선택지를 꽤 일찍 좁혀 두는 경향이 있습니다. ` +
        `남을 맞추는 듯 보이면서도 마지막 기준은 스스로 붙잡는 편으로 읽힐 수 있습니다.`,
      insightBasis: [`${dm.stem} 일간`, `월주 ${fortuneCtx.tenGods.month.stem}`, "행동 패턴"],
    },
    cards,
    crossInsight: {
      headline: "답을 모르는 게 아니라, 실행해도 되는지 확인하고 싶은 상태",
      body:
        `사주에서 보이는 ‘먼저 정해두고 확인하는’ 패턴과, 지금 뽑힌 카드의 메시지가 겹칩니다. ` +
        `이번 고민은 정보가 부족해서라기보다, 이미 마음속에 있는 방향을 행동으로 옮길 기준을 세우는 일에 더 가까워 보입니다. ` +
        `카드가 가리키는 건 새로운 정답이 아니라, 지금 붙잡고 있는 기준을 다시 점검하라는 신호일 수 있습니다.`,
      fortuneBasis: [`${dm.stem} 일간`, `食傷·官 흐름 참고`],
      tarotBasis: tarotCtx.spread.map(
        (s) => `${s.nameEn} · ${s.orientation}`
      ),
    },
    closingMessage:
      "지금 필요한 건 더 많은 정보가 아니라, 이미 아는 답을 작은 행동으로 옮겨볼 기준일 수 있습니다.",
    evidence: {
      fortune: [
        `dayMaster=${dm.stem}`,
        "tenGods.month.stem",
        "fiveElements.earth",
      ],
      tarot: tarotCtx.spread.map((s) => s.cardId),
    },
    disclaimer: USER_FACING_DISCLAIMER,
  };
}

function positionHint(pos: string): string {
  if (pos === "CURRENT") return "현재 상황의 분위기";
  if (pos === "BLOCK") return "놓치기 쉬운 걸림돌";
  return "지금 필요한 방향";
}
