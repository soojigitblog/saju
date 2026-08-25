import { USER_FACING_DISCLAIMER } from "@/lib/ai/disclaimer";
import type { InterpretationContextV2 } from "@/lib/ai/interpretation-context-v2";
import type { PaidCrossReading } from "@/lib/ai/schemas/paid-cross-reading";
import type { FortuneAiContext } from "@/lib/ai/types";
import type { TarotAiContext } from "@/lib/tarot/engine/draw";

const POSITION_LABEL: Record<string, string> = {
  CURRENT: "현재 상황",
  BLOCK: "놓치고 있는 부분",
  DIRECTION: "필요한 방향",
};

function domainFromCategory(
  category: string
): PaidCrossReading["sajuBaseline"]["domain"] {
  if (category === "money") return "money";
  if (category === "career") return "career";
  if (category === "love") return "love";
  if (category === "relationships") return "relationships";
  if (category === "advice") return "advice";
  return "custom";
}

function structureQuestion(
  category: string,
  question: string | null
): { original: string; structured: string; axes: string[] } {
  const original =
    question?.trim() ||
    (category === "career"
      ? "지금 직장/선택을 어떻게 볼까?"
      : category === "money"
        ? "지금 돈 관련 선택을 어떻게 볼까?"
        : category === "love"
          ? "지금 관계를 어떻게 볼까?"
          : "지금 이 고민을 어떻게 볼까?");

  if (category === "career") {
    return {
      original,
      structured:
        "이직 시기를 맞히는 질문이 아니라, 현재 자리에 남을지·새 선택을 검토할지에 대한 판단 축을 정리하는 질문으로 읽습니다.",
      axes: ["남을 때의 조건", "옮길 때 확인할 것", "결정 회피 vs 안전 확인"],
    };
  }
  if (category === "money") {
    return {
      original,
      structured:
        "언제 돈이 들어올지가 아니라, 지금 지출·투자·분담 판단에서 어떤 기준을 먼저 세울지 보는 질문으로 읽습니다.",
      axes: ["큰 금액 기준", "작은 반복 누수", "사람과 돈의 경계"],
    };
  }
  if (category === "love") {
    return {
      original,
      structured:
        "인연 시기가 아니라, 지금 관계가 깊어지는 속도·거리·확신을 어떻게 볼지 정리하는 질문으로 읽습니다.",
      axes: ["확신 전 속도", "표현 방식", "갈등 후 거리"],
    };
  }
  return {
    original,
    structured:
      "미래 확정이 아니라, 지금 선택지에서 무엇을 확인하고 어떤 패턴을 조심할지 보는 질문으로 읽습니다.",
    axes: ["확인해야 할 사실", "미루는 이유", "작은 다음 행동"],
  };
}

/**
 * Paid deep mock — must feel clearly deeper than free cross reading.
 */
export function buildMockPaidCrossReading(
  fortuneCtx: FortuneAiContext,
  v2: InterpretationContextV2,
  tarotCtx: TarotAiContext
): PaidCrossReading {
  const dm = `${fortuneCtx.dayMaster.stem}${fortuneCtx.dayMaster.hangul}`;
  const q = structureQuestion(tarotCtx.questionCategory, tarotCtx.question);
  const domain = domainFromCategory(tarotCtx.questionCategory);
  const domainSignal =
    v2.domainSignals.find((d) =>
      domain === "career"
        ? d.domain === "work"
        : domain === "money"
          ? d.domain === "money"
          : domain === "love"
            ? d.domain === "love"
            : d.domain === "cross"
    ) ?? v2.domainSignals.find((d) => d.domain === "cross")!;

  const cards = tarotCtx.spread.map((s) => ({
    position: s.position,
    positionIndex: s.positionIndex,
    positionLabel: POSITION_LABEL[s.position] ?? s.position,
    cardId: s.cardId,
    nameKo: s.nameKo,
    orientation: s.orientation,
    canonicalMeaning: s.canonicalMeaning,
  }));

  const cardInterpretations = tarotCtx.spread.map((s) => ({
    position: s.position,
    body:
      `${s.nameKo}(${s.orientation === "UPRIGHT" ? "정" : "역"})은 ` +
      `${s.canonicalMeaning} ` +
      `이번 질문에서는 ${POSITION_LABEL[s.position]}으로, ` +
      `${dm}의 확인·기준 패턴과 맞물려 읽히는 장면입니다.`,
  }));

  const c0 = tarotCtx.spread[0]!;
  const c1 = tarotCtx.spread[1]!;
  const c2 = tarotCtx.spread[2]!;

  return {
    reportKind: "paid_tarot",
    interpretationVersion: "p24-v1",
    title: "사주×타로 심층 교차리딩",
    questionSummary: {
      original: q.original,
      structured: q.structured,
      decisionAxes: q.axes,
    },
    sajuBaseline: {
      summary:
        `${domainSignal.keyQuestion} ` +
        domainSignal.signalSummary.join(" ") +
        ` 일간 ${dm}과 관련 축을 기준으로, 평소 판단 리듬을 먼저 고정합니다.`,
      relevantAxes: domainSignal.evidenceAxisIds.slice(0, 6),
      domain,
    },
    cards,
    cardInterpretations,
    threeCardStory:
      `세 카드가 같이 말하는 것은 ‘정답을 더 모으라’가 아니라, ` +
      `${c0.nameKo}에서 보이는 현재 분위기, ${c1.nameKo}에서 드러나는 사각, ` +
      `${c2.nameKo}가 가리키는 방향을 한 줄로 묶으면 ` +
      `평소처럼 확인만 늘리기보다 확인의 종료 조건을 정하라는 쪽에 가깝습니다.`,
    crossConnections: [
      {
        id: "cc1",
        sajuSignal: domainSignal.signalSummary[0] ?? "기준이 보일 때 힘이 붙는 구조",
        tarotSignal: `${c0.nameKo} · ${c0.orientation === "UPRIGHT" ? "정" : "역"} — ${c0.canonicalMeaning.slice(0, 60)}`,
        connection:
          `사주에서는 확인·정리가 강점인데, 현재 카드는 그 확인이 이미 충분한데도 실행이 미뤄질 수 있음을 보여줍니다.`,
        practicalMeaning:
          "더 알아보는 것이 안전인지, 결정을 미루는 습관인지 한 문장으로 구분해 보세요.",
      },
      {
        id: "cc2",
        sajuSignal: v2.tensions[0]?.howItShows ?? "겉 조율과 속 확정의 시간차",
        tarotSignal: `${c1.nameKo} — ${POSITION_LABEL.BLOCK}`,
        connection:
          `평소 자리에서는 듣는 듯 보이지만 속 결론이 먼저인 패턴과, 카드가 가리키는 ‘놓친 부분’이 겹칩니다. ` +
          `상대/조직이 이미 답이라고 느끼는 신호를 늦게 볼 수 있습니다.`,
        practicalMeaning:
          "결정 전에 ‘내가 아직 안 물은 한 가지’를 적고, 그 답만 듣고 종료하세요.",
      },
      {
        id: "cc3",
        sajuSignal: v2.strengthShadowPairs[0]?.strength ?? "끝까지 확인하는 힘",
        tarotSignal: `${c2.nameKo} — ${POSITION_LABEL.DIRECTION}`,
        connection:
          `강점인 확인이 과하면 위임·결정이 늦어지는 그림자와, 방향 카드가 요구하는 ‘선 긋기’가 충돌할 수 있습니다.`,
        practicalMeaning:
          "최종 확인 포인트 2개만 남기고, 나머지는 이번 주 안에 위임하거나 보류 종료하세요.",
      },
    ],
    hiddenTension: {
      innateWay: "충분히 확인한 뒤 움직이려는 타고난 리듬",
      cardPressure: "지금은 경계·선택지를 정리하는 압력이 카드에 먼저 나타남",
      collision:
        "더 알아보는 행동이 안전을 키우는 게 아니라, 이미 기울어진 결정을 미루는 형태로 굳을 수 있습니다.",
      riskIfIgnored:
        "정보가 늘수록 마음이 편해지기보다 피로만 쌓이고, 주변에는 ‘결정을 안 하는 사람’으로 읽힐 수 있습니다.",
    },
    choicePerspective: {
      optionA:
        "현재를 유지한다면: 완료 조건·역할·보상(또는 관계 기준)이 말로 정리되는지 먼저 확인하는 편이 맞습니다.",
      optionB:
        "새로운 쪽을 본다면: 설렘보다 ‘내가 강한 구조인지’를 3가지 기준으로 점검한 뒤 움직이는 편이 맞습니다.",
      checkBeforeDecide: [
        "지금 부족한 정보가 결정에 꼭 필요한가, 아니면 미루기용인가",
        "상대/조직에 한 문장으로 물을 수 있는 핵심 질문은 무엇인가",
        "이번 주 안에 끝낼 확인의 종료 시각을 정했는가",
      ],
    },
    riskPattern:
      "지금 특히 혼동하기 쉬운 지점은 ‘신중함’과 ‘회피’를 같은 말로 부르는 것입니다. 확인 개수를 제한하세요.",
    actionOptions: [
      "결정축 2~3개를 메모하고, 그 밖의 정보는 이번 라운드에서 제외하기",
      "핵심 관계자/상황에 확인 질문 1개를 48시간 안에 던지기",
      "카드가 가리킨 ‘놓친 부분’을 기준으로 위임·경계·보류 중 하나를 선택하기",
      "7일 후 같은 질문으로 돌아보지 않고, 그때는 실행 여부만 점검하기",
    ],
    whatToWatch:
      "확인이 늘수록 안심이 아니라 피로가 커지는지 — 그 순간이 회피로 넘어가는 신호일 수 있습니다.",
    closingInsight:
      "사주까지 같이 보면, 막히는 이유는 정보가 없어서가 아니라 평소 방식(확인)과 지금 카드의 압력(정리·실행)이 겹쳐서입니다.",
    evidence: {
      fortune: [
        `dayMaster=${fortuneCtx.dayMaster.stem}`,
        ...domainSignal.evidenceAxisIds.slice(0, 4),
      ],
      tarot: tarotCtx.spread.map((s) => s.cardId),
    },
    shareableInsight: [
      "더 알아보는 게 안전인지, 결정을 미루는 건지 한 문장으로 갈라야 한다.",
      "평소의 신중함이 지금은 회피로 굳을 수 있다.",
      "세 카드가 같이 말하는 건 ‘정답 더 모으기’가 아니라 ‘확인의 끝’이다.",
      closingShare(domain ?? "custom"),
    ],
    possibleNextQuestions: [
      domain === "career"
        ? "내가 일을 떠맡는 패턴을 일 사용설명서에서 더 깊게 보면?"
        : domain === "love"
          ? "관계가 깊어질 때 말을 아끼는 부분을 연애 사용설명서에서 더 보면?"
          : domain === "money"
            ? "돈에서 사람과의 경계를 돈 사용설명서에서 더 보면?"
            : "이 패턴이 전체 삶에서 어떻게 연결되는지 사주 사용설명서에서 보면?",
      "같은 고민의 한 장면만 더 깊게 한 가지 더 묻기로 보면?",
    ],
    disclaimer: USER_FACING_DISCLAIMER,
  };
}

function closingShare(domain: string): string {
  if (domain === "career") return "이직운이 아니라, 지금 구조가 설명되는지부터다.";
  if (domain === "love") return "인연 시기가 아니라, 깊어질수록 달라지는 나다.";
  if (domain === "money") return "돈 운이 아니라, 판단이 흔들리는 크기부터다.";
  return "답이 없는 게 아니라, 실행 기준이 없는 쪽에 가깝다.";
}
