import { STEMS, branchByHangul } from "@/lib/fortune-engine/constants";
import type {
  BranchInfo,
  ElementKey,
  FortuneChart,
  TenGodLabel,
} from "@/lib/fortune-engine/types";
import type { FortuneAiContext } from "@/lib/ai/types";

export type CapabilityStatus = "SUPPORTED" | "PARTIAL" | "NOT SUPPORTED";

export type EngineCapabilityAudit = {
  dayMaster: CapabilityStatus;
  fiveElements: CapabilityStatus;
  tenGods: CapabilityStatus;
  pillarTenGods: CapabilityStatus;
  yinYang: CapabilityStatus;
  hiddenStems: CapabilityStatus;
  stemInteractions: CapabilityStatus;
  branchInteractions: CapabilityStatus;
  elementRelations: CapabilityStatus;
  daeun: CapabilityStatus;
  saeun: CapabilityStatus;
};

export type EvidenceType =
  | "DAY_MASTER"
  | "YIN_YANG_PATTERN"
  | "ELEMENT_DOMINANCE"
  | "ELEMENT_SCARCITY"
  | "ELEMENT_RELATION"
  | "TEN_GOD_DISTRIBUTION"
  | "PILLAR_TEN_GOD"
  | "PILLAR_SYMBOL"
  | "HIDDEN_STEM_MAIN_QI"
  | "TIME_KNOWN";

export type EvidenceConfidence = "high" | "medium" | "low";

export type EvidenceRecord = {
  id: string;
  type: EvidenceType;
  axisId: string;
  sources: string[];
  description: string;
  confidence: EvidenceConfidence;
};

export type InsightCardV2 = {
  id: string;
  title: string;
  coreInterpretation: string;
  evidenceAxisIds: string[];
  evidenceIds: string[];
  behaviorPossibilities: string[];
  realLifeExamples: string[];
  counterPattern: string;
  triggerConditions: string[];
  strengthSide: string;
  shadowSide: string;
  practicalMeaning: string;
  actionOptions: string[];
  confidence: EvidenceConfidence;
  shareableLine?: string;
};

export type TensionV2 = {
  id: string;
  poleA: string;
  poleB: string;
  whyBothExist: string;
  howItShows: string;
  upside: string;
  downside: string;
  balance: string;
  evidenceAxisIds: string[];
  evidenceIds: string[];
};

export type StrengthShadowPairV2 = {
  id: string;
  strength: string;
  overuse: string;
  realLifeConsequence: string;
  balance: string;
  evidenceAxisIds: string[];
  evidenceIds: string[];
};

export type DomainSignalV2 = {
  domain: "free" | "money" | "work" | "love" | "total" | "cross";
  keyQuestion: string;
  evidenceAxisIds: string[];
  signalSummary: string[];
};

export type InterpretationContextV2 = {
  contextVersion: "v2";
  capability: EngineCapabilityAudit;
  identityAxes: Array<{ id: string; label: string; summary: string; evidenceIds: string[] }>;
  elementAxes: Array<{ id: string; label: string; summary: string; evidenceIds: string[] }>;
  tenGodAxes: Array<{ id: string; label: string; summary: string; evidenceIds: string[] }>;
  pillarAxes: Array<{ id: string; label: string; summary: string; evidenceIds: string[] }>;
  interactionAxes: Array<{ id: string; label: string; summary: string; evidenceIds: string[] }>;
  behaviorHypotheses: InsightCardV2[];
  tensions: TensionV2[];
  strengthShadowPairs: StrengthShadowPairV2[];
  domainSignals: DomainSignalV2[];
  evidenceRegistry: EvidenceRecord[];
};

const GENERATES: Record<ElementKey, ElementKey> = {
  wood: "fire",
  fire: "earth",
  earth: "metal",
  metal: "water",
  water: "wood",
};

const CONTROLS: Record<ElementKey, ElementKey> = {
  wood: "earth",
  earth: "water",
  water: "fire",
  fire: "metal",
  metal: "wood",
};

const ELEMENT_LABEL: Record<ElementKey, string> = {
  wood: "木",
  fire: "火",
  earth: "土",
  metal: "金",
  water: "水",
};

type TenGodFamily = "peer" | "output" | "wealth" | "officer" | "resource";

function tenGodFamily(label: TenGodLabel): TenGodFamily {
  if (label === "비견" || label === "겁재") return "peer";
  if (label === "식신" || label === "상관") return "output";
  if (label === "편재" || label === "정재") return "wealth";
  if (label === "편관" || label === "정관") return "officer";
  return "resource";
}

function buildMoneyHypothesis(input: {
  family: TenGodFamily;
  dominant: ElementKey;
  scarce: ElementKey;
  evidenceAxisIds: string[];
  evidenceIds: string[];
}): InsightCardV2 {
  const d = ELEMENT_LABEL[input.dominant];
  const s = ELEMENT_LABEL[input.scarce];
  const packs: Record<
    TenGodFamily,
    Pick<
      InsightCardV2,
      | "coreInterpretation"
      | "behaviorPossibilities"
      | "realLifeExamples"
      | "counterPattern"
      | "triggerConditions"
      | "strengthSide"
      | "shadowSide"
      | "practicalMeaning"
      | "actionOptions"
      | "shareableLine"
    >
  > = {
    officer: {
      coreInterpretation: `${d}이 우세한 배치에서는 허용 범위가 선 뒤에야 큰돈이 움직이고, ${s}이 빈 자리에서는 예외 지출이 장부에 늦게 붙을 수 있습니다.`,
      behaviorPossibilities: [
        "규칙·한도가 보이면 큰 결제는 오히려 빨리 끝낼 수 있습니다.",
        "예외로 열어 둔 소액은 ‘이번만’이 반복되며 합산이 늦어질 수 있습니다.",
      ],
      realLifeExamples: [
        "구독·자동이체처럼 한 번 허용한 항목은 한동안 다시 안 볼 수 있습니다.",
        "큰 구매 전에는 조건표를 만든 뒤에야 마음이 놓일 수 있습니다.",
      ],
      counterPattern: "이미 한도와 종료일이 박힌 항목은 큰돈보다 관리가 쉬워질 수 있습니다.",
      triggerConditions: ["규칙이 없는 큰 지출", "예외 허용", "정산 주기 공백"],
      strengthSide: "선이 보이면 큰 손실을 잘 막음",
      shadowSide: "예외 칸이 새는 지점이 됨",
      practicalMeaning: "절약 성향보다 ‘허용 예외를 어디에 두었는가’를 먼저 보는 편이 맞습니다.",
      actionOptions: ["예외 항목 3개만 허용", "월 1회 예외 합산"],
      shareableLine: `${d}이 많을수록 규칙은 지키는데, ${s}이 빈 예외 지출은 늦게 보일 수 있다.`,
    },
    wealth: {
      coreInterpretation: `${d} 기운이 앞서는 명식에서는 벌 구멍은 잘 보이지만, ${s}이 약한 자리에서는 쓰는 속도가 장면마다 갈라질 수 있습니다.`,
      behaviorPossibilities: [
        "수입은 ‘설명이 되는 대가’가 보이면 오래 힘을 쓰기 쉽습니다.",
        "지출은 기분·피로가 끼면 기준과 다른 속도로 나갈 수 있습니다.",
      ],
      realLifeExamples: [
        "성과급·보수는 따지면서, 편의 결제는 영수증을 나중에 볼 수 있습니다.",
        "부업 아이디어는 떠올려도 정산 구조가 흐리면 실행이 늦어질 수 있습니다.",
      ],
      counterPattern: "산출 기준이 고정된 수입은 생각보다 결정을 빨리 끝낼 수 있습니다.",
      triggerConditions: ["대가 설명 부재", "피로한 날의 소액", "수입·지출을 한 기준으로 묶음"],
      strengthSide: "벌 구조의 빈틈을 잘 봄",
      shadowSide: "쓰기 속도가 들쭉날쭉해짐",
      practicalMeaning: "돈 성향은 욕심이 아니라 벌기/쓰기의 종료 조건이 다른지로 읽어야 합니다.",
      actionOptions: ["수입 기준과 지출 한도를 분리", "피로 지출만 별도 표시"],
      shareableLine: `${d}이 강하면 벌 구멍은 보이는데, ${s}이 약하면 쓰는 속도가 먼저 흔들릴 수 있다.`,
    },
    resource: {
      coreInterpretation: `${d}이 두드러진 배치에서는 정보를 모은 뒤에야 돈이 움직이고, ${s}이 희소한 자리에서는 수집이 길어지는 동안 소액이 먼저 흘러갈 수 있습니다.`,
      behaviorPossibilities: [
        "비교·후기·조건 정리가 끝나기 전에는 큰돈을 보류하는 쪽에 가깝습니다.",
        "자료를 모으는 동안에도 작은 반복 결제는 예외처럼 지나갈 수 있습니다.",
      ],
      realLifeExamples: [
        "가전·보험처럼 정보가 많은 결정은 표로 정리한 뒤에야 결론이 날 수 있습니다.",
        "검색 탭이 열린 채로 배달·구독은 이미 빠져 있을 수 있습니다.",
      ],
      counterPattern: "선택지가 두세 개로 이미 줄여진 항목은 빠르게 끝낼 수 있습니다.",
      triggerConditions: ["선택지 과다", "후기 수집", "종료 기준 없음"],
      strengthSide: "성급한 큰 지출을 줄임",
      shadowSide: "수집 중에 소액이 샘",
      practicalMeaning: "신중함의 대가가 어디 구멍으로 나가는지 분리해 보는 편이 맞습니다.",
      actionOptions: ["비교 항목 3개 상한", "수집 중에도 소액 합산"],
      shareableLine: `${d}이 많으면 정보는 모으는데, ${s}이 빈 동안 소액이 먼저 흘러갈 수 있다.`,
    },
    output: {
      coreInterpretation: `${d}이 앞선 명식에서는 돈이 ‘쓰는 손길’로 먼저 움직이고, ${s}이 약한 자리에서는 남는 계산이 한 박자 늦게 붙을 수 있습니다.`,
      behaviorPossibilities: [
        "만들고 해결하는 과정에서는 비용이 도구처럼 빠르게 나갈 수 있습니다.",
        "정산·잔액 확인은 일이 끝난 뒤에야 몰아서 볼 수 있습니다.",
      ],
      realLifeExamples: [
        "프로젝트·선물·접대처럼 ‘지금 필요한 것’에는 손이 빨리 갈 수 있습니다.",
        "월말 잔액을 보고 나서야 이번 달 속도가 보이기도 합니다.",
      ],
      counterPattern: "쓰는 행위 자체에 한도를 붙여 두면 계산 지연이 줄 수 있습니다.",
      triggerConditions: ["즉시 해결해야 하는 지출", "창작·접대", "사후 정산"],
      strengthSide: "필요한 곳에 돈을 막히지 않게 씀",
      shadowSide: "남는 그림이 늦게 보임",
      practicalMeaning: "낭비가 아니라 ‘사용과 정산의 시간차’를 먼저 봐야 합니다.",
      actionOptions: ["쓰기 직후 한 줄 기록", "주 1회 잔액 스냅샷"],
      shareableLine: `${d}이 강하면 쓰는 손은 빠른데, ${s}이 약하면 남는 계산이 늦게 붙을 수 있다.`,
    },
    peer: {
      coreInterpretation: `${d}이 우세한 배치에서는 내 몫은 지키려 하지만, ${s}이 빈 자리에서는 공동 비용이 섞이면 판단 기준이 흔들릴 수 있습니다.`,
      behaviorPossibilities: [
        "혼자 쓰는 돈은 기준이 분명한데, 더치페이·가족 지출은 미뤄질 수 있습니다.",
        "공평함이 말로 정리되기 전에는 속으로만 계산이 돌아갈 수 있습니다.",
      ],
      realLifeExamples: [
        "개인 구독은 바로 끊으면서, 공동 공과금은 ‘나중에 정산’이 길어질 수 있습니다.",
        "선물을 줄 때는 후한데, 반복 분담이 되면 갑자기 선이 생길 수 있습니다.",
      ],
      counterPattern: "분담 문장이 먼저 있는 관계는 오히려 갈등이 적을 수 있습니다.",
      triggerConditions: ["공동비용", "말만 된 분담", "공평함 불명"],
      strengthSide: "내 흐름의 손실은 잘 지킴",
      shadowSide: "섞인 돈에서 기준이 늦어짐",
      practicalMeaning: "인색함보다 ‘누구 돈인지가 흐릴 때’를 핵심 장면으로 봐야 합니다.",
      actionOptions: ["공동비용 한 문장 선공유", "개인/공동 계좌 분리 기록"],
      shareableLine: `${d}이 많으면 내 몫은 지키는데, ${s}이 빈 공동 비용에서 판단이 흔들릴 수 있다.`,
    },
  };
  const pack = packs[input.family];
  return {
    id: "money-threshold",
    title: "돈에서 먼저 보는 기준",
    coreInterpretation: pack.coreInterpretation,
    evidenceAxisIds: input.evidenceAxisIds,
    evidenceIds: input.evidenceIds,
    behaviorPossibilities: pack.behaviorPossibilities,
    realLifeExamples: pack.realLifeExamples,
    counterPattern: pack.counterPattern,
    triggerConditions: pack.triggerConditions,
    strengthSide: pack.strengthSide,
    shadowSide: pack.shadowSide,
    practicalMeaning: pack.practicalMeaning,
    actionOptions: pack.actionOptions,
    confidence: "high",
    shareableLine: pack.shareableLine,
  };
}

function buildWorkHypothesis(input: {
  family: TenGodFamily;
  dominant: ElementKey;
  scarce: ElementKey;
  evidenceAxisIds: string[];
  evidenceIds: string[];
}): InsightCardV2 {
  const d = ELEMENT_LABEL[input.dominant];
  const s = ELEMENT_LABEL[input.scarce];
  const packs: Record<
    TenGodFamily,
    Pick<
      InsightCardV2,
      | "coreInterpretation"
      | "behaviorPossibilities"
      | "realLifeExamples"
      | "counterPattern"
      | "triggerConditions"
      | "strengthSide"
      | "shadowSide"
      | "practicalMeaning"
      | "actionOptions"
      | "shareableLine"
    >
  > = {
    officer: {
      coreInterpretation: `${d}이 강한 일 구조에서는 완료 조건과 검수 지점이 보여야 힘이 붙고, ${s}이 빈 자리에서는 기준 없는 수정이 반복될 때 급격히 지칩니다.`,
      behaviorPossibilities: [
        "범위가 정리된 과제에서 집중력이 붙을 수 있습니다.",
        "수정 이유가 흐릴수록 일 자체보다 과정 관리에 지칠 수 있습니다.",
      ],
      realLifeExamples: [
        "요구사항이 적힌 프로젝트 후반 점검에서 강점이 드러날 수 있습니다.",
        "‘느낌상 다시’가 반복되면 능력보다 피로가 먼저 보일 수 있습니다.",
      ],
      counterPattern: "목표가 선명하면 평소보다 과감하게 밀어붙일 수 있습니다.",
      triggerConditions: ["모호한 수정 요청", "책임 범위 불명확", "완료 기준 부재"],
      strengthSide: "완성도 관리",
      shadowSide: "위임 지연",
      practicalMeaning: "직업명보다 업무 구조와 검수 리듬이 더 중요합니다.",
      actionOptions: ["완료 조건 선확인", "위임 범위와 검수 포인트 분리"],
      shareableLine: `${d}이 강하면 기준이 보일 때 일하고, ${s}이 비면 수정 반복에 먼저 지친다.`,
    },
    output: {
      coreInterpretation: `${d}이 앞선 배치에서는 만드는 과정에서 에너지가 나고, ${s}이 약한 자리에서는 산출이 안 보이는 회의·조율에서 힘이 빠질 수 있습니다.`,
      behaviorPossibilities: [
        "초안을 빨리 만들고 다듬는 리듬에서 몰입이 붙을 수 있습니다.",
        "결과물이 없는 조율만 길어지면 의욕이 빠르게 식을 수 있습니다.",
      ],
      realLifeExamples: [
        "시안·프로토타입을 먼저 보여주는 일에서 평가가 좋아질 수 있습니다.",
        "결정만 미루는 회의가 반복되면 자리를 피하고 싶어질 수 있습니다.",
      ],
      counterPattern: "산출 주기가 짧은 팀에서는 오히려 조율도 잘 버틸 수 있습니다.",
      triggerConditions: ["무산출 회의", "아이디어만 쌓임", "마감 없는 브레인스토밍"],
      strengthSide: "만들어 내는 추진",
      shadowSide: "조율 구간에 에너지 누수",
      practicalMeaning: "성실함보다 ‘무엇이 남는 일인가’가 강점을 켜고 끕니다.",
      actionOptions: ["회의마다 산출물 1개", "초안 먼저 공유"],
      shareableLine: `${d}이 많으면 만드는 일에 살고, ${s}이 빈 조율만 남으면 급격히 꺼질 수 있다.`,
    },
    resource: {
      coreInterpretation: `${d}이 우세한 일에서는 배우고 정리한 뒤에야 실행이 안정되고, ${s}이 희소하면 학습 없이 밀어붙이는 환경에서 실수가 커 보일 수 있습니다.`,
      behaviorPossibilities: [
        "매뉴얼·사례를 확보한 뒤 속도가 붙을 수 있습니다.",
        "준비 시간을 안 주면 시작은 해도 품질 불안이 남을 수 있습니다.",
      ],
      realLifeExamples: [
        "신규 업무는 정리 노트를 만든 뒤에야 자신감이 생길 수 있습니다.",
        "즉흥 발표·현장 대응만 요구되면 실제 실력보다 더 흔들려 보일 수 있습니다.",
      ],
      counterPattern: "이미 체화된 반복 업무에서는 준비 없이 빠르게 움직일 수 있습니다.",
      triggerConditions: ["신규 영역", "자료 부재", "즉흥 대응 압박"],
      strengthSide: "학습이 쌓이는 일",
      shadowSide: "준비 부족 장면의 과소평가",
      practicalMeaning: "느린 게 아니라 실행 전에 지도를 그리는 타입으로 읽는 편이 맞습니다.",
      actionOptions: ["착수 전 한 페이지 지도", "신규 업무 온보딩 질문 3개"],
      shareableLine: `${d}이 강하면 정리 후 일하고, ${s}이 비면 즉흥 압박에서 실력이 가려질 수 있다.`,
    },
    wealth: {
      coreInterpretation: `${d}이 두드러진 일에서는 대가와 성과가 연결돼야 오래 가고, ${s}이 빈 자리에서는 역할만 늘고 보상이 흐릴 때 이직 고민이 커질 수 있습니다.`,
      behaviorPossibilities: [
        "성과가 숫자·산출로 남는 구조에서 꾸준함이 유지될 수 있습니다.",
        "하는 일은 늘고 인정·보상이 흐리면 성실한데도 불만이 쌓일 수 있습니다.",
      ],
      realLifeExamples: [
        "KPI가 보이는 프로젝트에서는 야근도 납득할 수 있습니다.",
        "잡무만 늘면 ‘내가 왜 여기 있지?’가 먼저 올라올 수 있습니다.",
      ],
      counterPattern: "보상은 낮아도 성장 축적이 보이면 버틸 수 있습니다.",
      triggerConditions: ["역할 팽창", "보상 불명", "성과 미측정"],
      strengthSide: "대가-성과 연결 민감도",
      shadowSide: "설명 안 되는 헌신에 급격히 식음",
      practicalMeaning: "욕심이라기보다 일의 교환 조건이 보여야 엔진이 켜집니다.",
      actionOptions: ["이번 분기 대가 한 문장", "역할 증가 시 보상 재확인"],
      shareableLine: `${d}이 강하면 대가 연결이 보여야 일하고, ${s}이 비면 역할만 늘 때 먼저 떠난다.`,
    },
    peer: {
      coreInterpretation: `${d}이 앞선 일에서는 내 몫이 분명해야 속도가 나고, ${s}이 약한 자리에서는 책임이 겹치면 혼자 다 쥐려다 과부하가 올 수 있습니다.`,
      behaviorPossibilities: [
        "역할이 나뉜 팀에서는 품질을 끝까지 맞출 수 있습니다.",
        "경계가 흐리면 위임을 미루고 검수까지 본인이 가져갈 수 있습니다.",
      ],
      realLifeExamples: [
        "공동 문서에서 담당자가 안 찍히면 결국 본인이 고치고 있을 수 있습니다.",
        "명확한 R&R 프로젝트에서는 갈등이 줄고 속도가 날 수 있습니다.",
      ],
      counterPattern: "신뢰하는 파트너와는 몫을 나눠도 품질 불안이 적을 수 있습니다.",
      triggerConditions: ["R&R 공백", "공동 책임", "최종 서명만 본인"],
      strengthSide: "내 몫의 완성도",
      shadowSide: "겹친 일을 혼자 회수",
      practicalMeaning: "협업 기피라기보다 경계가 안 그려질 때 과책임으로 흐릅니다.",
      actionOptions: ["담당자 이름 먼저 적기", "최종 검수만 남기기"],
      shareableLine: `${d}이 많으면 내 몫이 보여야 강하고, ${s}이 비면 겹친 책임을 혼자 끌어안을 수 있다.`,
    },
  };
  const pack = packs[input.family];
  return {
    id: "work-environment",
    title: "일에서 힘이 나는 방식",
    coreInterpretation: pack.coreInterpretation,
    evidenceAxisIds: input.evidenceAxisIds,
    evidenceIds: input.evidenceIds,
    behaviorPossibilities: pack.behaviorPossibilities,
    realLifeExamples: pack.realLifeExamples,
    counterPattern: pack.counterPattern,
    triggerConditions: pack.triggerConditions,
    strengthSide: pack.strengthSide,
    shadowSide: pack.shadowSide,
    practicalMeaning: pack.practicalMeaning,
    actionOptions: pack.actionOptions,
    confidence: "high",
    shareableLine: pack.shareableLine,
  };
}

function buildLoveHypothesis(input: {
  family: TenGodFamily;
  yinYang: "yang" | "yin";
  dominant: ElementKey;
  evidenceAxisIds: string[];
  evidenceIds: string[];
}): InsightCardV2 {
  const d = ELEMENT_LABEL[input.dominant];
  const pace = input.yinYang === "yang" ? "확신 후 속도가 갑자기 빨라질" : "확신이 서기 전 관찰이 길어질";
  const packs: Record<
    TenGodFamily,
    Pick<
      InsightCardV2,
      | "coreInterpretation"
      | "behaviorPossibilities"
      | "realLifeExamples"
      | "counterPattern"
      | "triggerConditions"
      | "strengthSide"
      | "shadowSide"
      | "practicalMeaning"
      | "actionOptions"
      | "shareableLine"
    >
  > = {
    officer: {
      coreInterpretation: `${d} 기운과 선 긋는 리듬이 겹치면, 처음에는 예의가 앞서고 ${pace} 수 있습니다. 경계가 흔들리면 다시 거리를 둡니다.`,
      behaviorPossibilities: [
        "관계의 이름을 정하기 전에는 속도를 스스로 조절할 수 있습니다.",
        "약속이 지켜지지 않으면 설명보다 거리가 먼저 생길 수 있습니다.",
      ],
      realLifeExamples: [
        "호감이 있어도 ‘우리’라는 말이 나오기 전에는 선을 유지할 수 있습니다.",
        "말과 행동이 어긋나면 감정 표현보다 연락 텀이 먼저 늘어날 수 있습니다.",
      ],
      counterPattern: "규칙과 신뢰가 이미 있는 관계에서는 속도가 생각보다 빠를 수 있습니다.",
      triggerConditions: ["관계 정의 이전", "약속 불이행", "공개 압박"],
      strengthSide: "관계의 선을 오래 지킴",
      shadowSide: "속 결론 공유 지연",
      practicalMeaning: "냉정이 아니라 이름이 붙기 전의 안전 확인으로 읽는 편이 맞습니다.",
      actionOptions: ["관계 기대 한 문장 공유", "거리 조절 이유를 하루 안에 말하기"],
      shareableLine: `${d}이 강하면 선이 보일 때 마음을 열고, 이름이 없으면 ${input.yinYang === "yang" ? "갑자기 빨라지거나" : "관찰이 길어지거나"} 한다.`,
    },
    output: {
      coreInterpretation: `${d}이 앞선 연애에서는 챙김과 표현이 행동으로 먼저 나가고, ${pace} 수 있습니다. 말이 안 통하면 설명이 아니라 이벤트가 늘 수 있습니다.`,
      behaviorPossibilities: [
        "좋아하면 실무적 도움·선물이 말보다 빠를 수 있습니다.",
        "감정이 복잡하면 대화를 미루고 먼저 무언가를 해주려 할 수 있습니다.",
      ],
      realLifeExamples: [
        "바쁠 때도 맛있는 걸 보내거나 일정을 맞춰 주는 식으로 마음이 보일 수 있습니다.",
        "갈등이 생기면 긴 대화보다 ‘일단 분위기 전환’을 시도할 수 있습니다.",
      ],
      counterPattern: "상대가 말로 확인받길 원하면 행동만으로는 오해가 남을 수 있습니다.",
      triggerConditions: ["표현 압박", "감정 대화", "오해 누적"],
      strengthSide: "실질적 챙김",
      shadowSide: "말로 풀 타이밍 놓침",
      practicalMeaning: "애정 없음이 아니라 표현 채널이 행동 쪽인 패턴입니다.",
      actionOptions: ["행동 뒤에 한 줄 이유", "주 1회 감정 확인 질문"],
      shareableLine: `${d}이 많으면 챙김은 빠른데, 말로 마음을 푸는 속도는 ${input.yinYang === "yin" ? "더 늦을" : "들쭉날쭉할"} 수 있다.`,
    },
    resource: {
      coreInterpretation: `${d}이 두드러진 관계에서는 상대를 이해한 뒤에야 마음이 열리고, ${pace} 수 있습니다. 정보가 부족하면 호감이 있어도 보류가 길어집니다.`,
      behaviorPossibilities: [
        "말보다 일관된 태도를 충분히 본 뒤에 확신이 생길 수 있습니다.",
        "상대의 과거·가치관이 안 보이면 가까워지는 속도를 스스로 늦출 수 있습니다.",
      ],
      realLifeExamples: [
        "몇 번 더 만나며 ‘이 사람이 평소에 어떤지’를 확인한 뒤에야 소개를 할 수 있습니다.",
        "갑작스러운 고백은 기쁨보다 부담으로 먼저 느껴질 수 있습니다.",
      ],
      counterPattern: "이미 오래 본 상대라면 갑작스러운 진전에도 안정적으로 반응할 수 있습니다.",
      triggerConditions: ["정보 공백", "급가속", "일관성 부족"],
      strengthSide: "진정성을 오래 봄",
      shadowSide: "관찰만 길어짐",
      practicalMeaning: "소극적이라기보다 확신을 위한 데이터 수집에 가깝습니다.",
      actionOptions: ["확인할 태도 3가지를 미리 적기", "관찰 기한 정하기"],
      shareableLine: `${d}이 강하면 이해한 뒤에 열리고, 확신이 없으면 관찰이 사랑처럼 보일 수 있다.`,
    },
    wealth: {
      coreInterpretation: `${d} 기운이 관계에 섞이면 현실 조건과 마음이 같이 저울질되고, ${pace} 수 있습니다. 생활이 안 그려지면 감정이 있어도 보류가 됩니다.`,
      behaviorPossibilities: [
        "호감과 별개로 생활 리듬·책임 나눔이 보이는지 먼저 볼 수 있습니다.",
        "로맨스만 있고 일상이 안 맞으면 스스로 속도를 줄일 수 있습니다.",
      ],
      realLifeExamples: [
        "데이트는 즐거운데 주중 연락·일정 조율이 안 되면 확신이 늦어질 수 있습니다.",
        "함께 사는 그림이 구체화되면 태도가 급격히 진지해질 수 있습니다.",
      ],
      counterPattern: "현실 조건이 이미 맞는 상대에게는 감정의 속도가 빨라질 수 있습니다.",
      triggerConditions: ["생활 그림 부재", "책임 불균형", "미래 대화 회피"],
      strengthSide: "관계를 생활로 번역",
      shadowSide: "조건 확인이 냉정으로 읽힘",
      practicalMeaning: "계산적이라기보다 마음이 일상이 될 수 있는지를 먼저 봅니다.",
      actionOptions: ["주중 리듬 한 가지 맞춰 보기", "기대하는 생활 한 문장"],
      shareableLine: `${d}이 많으면 마음이 있어도 생활이 안 그려지면 속도를 늦출 수 있다.`,
    },
    peer: {
      coreInterpretation: `${d}이 앞선 연애에서는 대등함이 핵심이라, 맞추기만 요구되면 마음이 식고 ${pace} 수 있습니다. 존중이 보이면 의외로 깊이 들어갑니다.`,
      behaviorPossibilities: [
        "지시·압박이 느껴지면 호감이 있어도 선을 다시 그을 수 있습니다.",
        "서로의 영역이 존중되면 챙김이 빠르게 늘어날 수 있습니다.",
      ],
      realLifeExamples: [
        "‘왜 연락이 늦냐’가 추궁이 되면 해명 대신 텀이 생길 수 있습니다.",
        "각자의 일정을 인정해 주면 먼저 시간을 내게 될 수 있습니다.",
      ],
      counterPattern: "리더십이 돌봄으로 느껴지는 상대에게는 의외로 기대고 싶어질 수 있습니다.",
      triggerConditions: ["일방적 요구", "비교", "영역 침범"],
      strengthSide: "대등한 관계 유지",
      shadowSide: "맞추라는 압력에 급냉각",
      practicalMeaning: "자존심 싸움보다 존중 여부가 개폐 스위치입니다.",
      actionOptions: ["서로 양보할 항목 나누기", "추궁 대신 요청 문장"],
      shareableLine: `${d}이 강하면 대등함이 보일 때 깊어지고, 맞추기만 강요되면 바로 식을 수 있다.`,
    },
  };
  const pack = packs[input.family];
  return {
    id: "love-distance",
    title: "가까워질수록 달라지는 태도",
    coreInterpretation: pack.coreInterpretation,
    evidenceAxisIds: input.evidenceAxisIds,
    evidenceIds: input.evidenceIds,
    behaviorPossibilities: pack.behaviorPossibilities,
    realLifeExamples: pack.realLifeExamples,
    counterPattern: pack.counterPattern,
    triggerConditions: pack.triggerConditions,
    strengthSide: pack.strengthSide,
    shadowSide: pack.shadowSide,
    practicalMeaning: pack.practicalMeaning,
    actionOptions: pack.actionOptions,
    confidence: "medium",
    shareableLine: pack.shareableLine,
  };
}

function countsFromTenGods(ctx: FortuneAiContext): Map<TenGodLabel, number> {
  const m = new Map<TenGodLabel, number>();
  const labels = [
    ctx.tenGods.year.stem,
    ctx.tenGods.year.branch,
    ctx.tenGods.month.stem,
    ctx.tenGods.month.branch,
    ctx.tenGods.day.stem,
    ctx.tenGods.day.branch,
    ctx.tenGods.hour?.stem,
    ctx.tenGods.hour?.branch,
  ].filter(Boolean) as TenGodLabel[];
  for (const label of labels) {
    m.set(label, (m.get(label) ?? 0) + 1);
  }
  return m;
}

function dominantAndScarce(fe: FortuneAiContext["fiveElements"]) {
  const rows = Object.entries(fe).map(([key, count]) => ({
    key: key as ElementKey,
    count,
  }));
  const dominant = [...rows].sort((a, b) => b.count - a.count)[0]!;
  const scarce = [...rows].sort((a, b) => a.count - b.count)[0]!;
  return { dominant, scarce, rows };
}

function branchMainStem(branchHangul: string): BranchInfo["mainStemIndex"] {
  return branchByHangul(branchHangul).mainStemIndex;
}

function addEvidence(
  bucket: EvidenceRecord[],
  record: Omit<EvidenceRecord, "confidence"> & { confidence?: EvidenceConfidence }
): string {
  bucket.push({
    ...record,
    confidence: record.confidence ?? "high",
  });
  return record.id;
}

export function getEngineCapabilityAudit(): EngineCapabilityAudit {
  return {
    dayMaster: "SUPPORTED",
    fiveElements: "SUPPORTED",
    tenGods: "SUPPORTED",
    pillarTenGods: "SUPPORTED",
    yinYang: "SUPPORTED",
    hiddenStems: "PARTIAL",
    stemInteractions: "NOT SUPPORTED",
    branchInteractions: "NOT SUPPORTED",
    elementRelations: "SUPPORTED",
    daeun: "NOT SUPPORTED",
    saeun: "NOT SUPPORTED",
  };
}

export function buildInterpretationContextV2(
  ctx: FortuneAiContext,
  chart?: FortuneChart
): InterpretationContextV2 {
  const evidenceRegistry: EvidenceRecord[] = [];
  const tenGodCounts = countsFromTenGods(ctx);
  const { dominant, scarce, rows } = dominantAndScarce(ctx.fiveElements);
  const dayMasterEvidenceId = addEvidence(evidenceRegistry, {
    id: "ev_day_master",
    type: "DAY_MASTER",
    axisId: "day_master",
    sources: ["dayMaster.stem", `dayMaster.hangul=${ctx.dayMaster.hangul}`],
    description: `${ctx.dayMaster.stem}(${ctx.dayMaster.hangul}) 일간`,
  });
  const yinYangEvidenceId = addEvidence(evidenceRegistry, {
    id: "ev_yin_yang",
    type: "YIN_YANG_PATTERN",
    axisId: "yin_yang",
    sources: ["dayMaster.yinYang"],
    description: `${ctx.dayMaster.yinYang === "yang" ? "양" : "음"} 기질`,
  });
  const dominantEvidenceId = addEvidence(evidenceRegistry, {
    id: `ev_element_dominant_${dominant.key}`,
    type: "ELEMENT_DOMINANCE",
    axisId: "five_elements",
    sources: [`fiveElements.${dominant.key}=${dominant.count}`],
    description: `${ELEMENT_LABEL[dominant.key]} 기운이 ${dominant.count}개로 가장 두드러짐`,
  });
  const scarceEvidenceId = addEvidence(evidenceRegistry, {
    id: `ev_element_scarce_${scarce.key}`,
    type: "ELEMENT_SCARCITY",
    axisId: "five_elements",
    sources: [`fiveElements.${scarce.key}=${scarce.count}`],
    description: `${ELEMENT_LABEL[scarce.key]} 기운이 ${scarce.count}개로 가장 적음`,
    confidence: scarce.count === dominant.count ? "low" : "medium",
  });

  const monthStemEvidenceId = addEvidence(evidenceRegistry, {
    id: `ev_tg_month_${ctx.tenGods.month.stem}`,
    type: "PILLAR_TEN_GOD",
    axisId: "ten_gods_month",
    sources: ["tenGods.month.stem"],
    description: `월간 십성 ${ctx.tenGods.month.stem}`,
  });
  const yearStemEvidenceId = addEvidence(evidenceRegistry, {
    id: `ev_tg_year_${ctx.tenGods.year.stem}`,
    type: "PILLAR_TEN_GOD",
    axisId: "ten_gods_year",
    sources: ["tenGods.year.stem"],
    description: `년간 십성 ${ctx.tenGods.year.stem}`,
  });
  const dayBranchEvidenceId = addEvidence(evidenceRegistry, {
    id: `ev_day_branch_${ctx.pillars.day.branch}`,
    type: "PILLAR_SYMBOL",
    axisId: "pillar_day",
    sources: ["pillars.day.branch", "tenGods.day.branch"],
    description: `일지 ${ctx.pillars.day.branch} / 일지 십성 ${ctx.tenGods.day.branch}`,
  });

  const mainQiEvidenceIds = [
    { pillar: "year", branch: ctx.pillars.year.branch },
    { pillar: "month", branch: ctx.pillars.month.branch },
    { pillar: "day", branch: ctx.pillars.day.branch },
    ...(ctx.pillars.hour ? [{ pillar: "hour", branch: ctx.pillars.hour.branch }] : []),
  ].map(({ pillar, branch }) => {
    const stem = STEMS[branchMainStem(branch)];
    return addEvidence(evidenceRegistry, {
      id: `ev_hidden_${pillar}_${stem.hanja}`,
      type: "HIDDEN_STEM_MAIN_QI",
      axisId: "hidden_stem_main_qi",
      sources: [`pillars.${pillar}.branch`],
      description: `${pillar} 지지의 본기 천간 ${stem.hanja}(${stem.hangul})만 반영`,
      confidence: "medium",
    });
  });

  const relationToDayMaster = rows
    .filter((row) => row.count > 0)
    .map((row) => {
      const relation =
        GENERATES[ctx.dayMaster.element as ElementKey] === row.key
          ? "day-master-generates"
          : CONTROLS[ctx.dayMaster.element as ElementKey] === row.key
            ? "day-master-controls"
            : GENERATES[row.key] === (ctx.dayMaster.element as ElementKey)
              ? "element-generates-day-master"
              : CONTROLS[row.key] === (ctx.dayMaster.element as ElementKey)
                ? "element-controls-day-master"
                : "same-element";
      return {
        row,
        relation,
        evidenceId: addEvidence(evidenceRegistry, {
          id: `ev_relation_${ctx.dayMaster.element}_${row.key}`,
          type: "ELEMENT_RELATION",
          axisId: "element_relation",
          sources: ["dayMaster.element", `fiveElements.${row.key}=${row.count}`],
          description: `${ELEMENT_LABEL[row.key]}과 일간 오행의 관계: ${relation}`,
          confidence: row.count >= 2 ? "high" : "medium",
        }),
      };
    });

  const topTenGods = [...tenGodCounts.entries()]
    .filter(([label]) => label !== "일간")
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([label, count]) => ({
      label,
      count,
      evidenceId: addEvidence(evidenceRegistry, {
        id: `ev_tg_dist_${label}`,
        type: "TEN_GOD_DISTRIBUTION",
        axisId: "ten_god_distribution",
        sources: ["tenGods.year.stem", "tenGods.month.stem", "tenGods.day.branch"],
        description: `${label} 십성이 ${count}회 나타남`,
        confidence: count >= 2 ? "high" : "medium",
      }),
    }));

  const identityAxes = [
    {
      id: "identity_day_master",
      label: "일간 축",
      summary: `${ctx.dayMaster.stem}(${ctx.dayMaster.hangul}) 일간과 ${ctx.dayMaster.yinYang === "yang" ? "양" : "음"} 기질`,
      evidenceIds: [dayMasterEvidenceId, yinYangEvidenceId],
    },
  ];

  const elementAxes = [
    {
      id: "element_distribution",
      label: "오행 분포 축",
      summary: `${ELEMENT_LABEL[dominant.key]} 우세, ${ELEMENT_LABEL[scarce.key]} 희소`,
      evidenceIds: [dominantEvidenceId, scarceEvidenceId],
    },
  ];

  const tenGodAxes = [
    {
      id: "ten_god_distribution",
      label: "십성 분포 축",
      summary: topTenGods.map((x) => `${x.label} ${x.count}`).join(" · "),
      evidenceIds: topTenGods.map((x) => x.evidenceId),
    },
    {
      id: "ten_gods_month",
      label: "월간 십성 축",
      summary: `월간 십성 ${ctx.tenGods.month.stem}`,
      evidenceIds: [monthStemEvidenceId],
    },
  ];

  const pillarAxes = [
    {
      id: "pillar_day",
      label: "일주 축",
      summary: `${ctx.pillars.day.ganji} · 일지 ${ctx.pillars.day.branch} · 십성 ${ctx.tenGods.day.branch}`,
      evidenceIds: [dayBranchEvidenceId],
    },
    {
      id: "pillar_year",
      label: "년주 축",
      summary: `${ctx.pillars.year.ganji} · 년간 십성 ${ctx.tenGods.year.stem}`,
      evidenceIds: [yearStemEvidenceId],
    },
  ];

  const interactionAxes = [
    {
      id: "element_relation",
      label: "오행 관계 축",
      summary: relationToDayMaster.map((x) => `${ELEMENT_LABEL[x.row.key]}:${x.relation}`).join(" · "),
      evidenceIds: relationToDayMaster.map((x) => x.evidenceId),
    },
    {
      id: "hidden_stem_main_qi",
      label: "지지 본기 축",
      summary: "지장간 전체가 아니라 각 지지의 본기 천간만 반영",
      evidenceIds: mainQiEvidenceIds,
    },
  ];

  const monthFamily = tenGodFamily(ctx.tenGods.month.stem as TenGodLabel);
  const behaviorHypotheses: InsightCardV2[] = [
    buildMoneyHypothesis({
      family: monthFamily,
      dominant: dominant.key,
      scarce: scarce.key,
      evidenceAxisIds: ["day_master", "five_elements", "ten_gods_month"],
      evidenceIds: [dayMasterEvidenceId, dominantEvidenceId, monthStemEvidenceId],
    }),
    buildWorkHypothesis({
      family: monthFamily,
      dominant: dominant.key,
      scarce: scarce.key,
      evidenceAxisIds: ["five_elements", "ten_god_distribution", "ten_gods_month"],
      evidenceIds: [dominantEvidenceId, monthStemEvidenceId, topTenGods[0]?.evidenceId ?? monthStemEvidenceId],
    }),
    buildLoveHypothesis({
      family: monthFamily,
      yinYang: ctx.dayMaster.yinYang as "yang" | "yin",
      dominant: dominant.key,
      evidenceAxisIds: ["pillar_day", "ten_gods_day", "yin_yang"],
      evidenceIds: [dayBranchEvidenceId, yinYangEvidenceId],
    }),
  ];

  const tensions: TensionV2[] = [
    {
      id: "tension_coordination_vs_inner_closure",
      poleA: "겉으로는 조율",
      poleB: "속으로는 내부 확정",
      whyBothExist: "년간·월간 십성 축이 외부 조율과 내부 기준 정리를 동시에 밀기 때문입니다.",
      howItShows: "자리에서는 듣고 맞추는 듯 보여도, 결론은 혼자 정리한 뒤 공유하는 식으로 나타날 수 있습니다.",
      upside: "충동 합의를 줄입니다.",
      downside: "상대는 이미 결론이 끝난 뒤 통보받는 느낌을 받을 수 있습니다.",
      balance: "경청 뒤 결론 초안을 먼저 공유하면 오해가 줄어듭니다.",
      evidenceAxisIds: ["ten_gods_year", "ten_gods_month"],
      evidenceIds: [yearStemEvidenceId, monthStemEvidenceId],
    },
    {
      id: "tension_precision_vs_speed",
      poleA: "정확도를 지키려는 힘",
      poleB: "결정을 늦추는 그림자",
      whyBothExist: `${ELEMENT_LABEL[dominant.key]} 우세와 월간 십성 축이 기준 정리를 앞세우기 때문입니다.`,
      howItShows: "중요한 일에서는 번복을 줄이지만, 정보가 늘어날수록 결론 종료 시점도 함께 늦어질 수 있습니다.",
      upside: "실수를 줄입니다.",
      downside: "결정 지연이 기본값이 될 수 있습니다.",
      balance: "기준 개수를 줄이고 종료 시각을 먼저 정합니다.",
      evidenceAxisIds: ["five_elements", "ten_gods_month", "element_relation"],
      evidenceIds: [dominantEvidenceId, monthStemEvidenceId, relationToDayMaster[0]?.evidenceId ?? dominantEvidenceId],
    },
  ];

  const strengthShadowPairs: StrengthShadowPairV2[] = [
    {
      id: "ss_checking",
      strength: "끝까지 확인하는 힘",
      overuse: "모든 단계를 직접 쥐고 가려는 경향",
      realLifeConsequence: "일에서는 위임 지연, 돈에서는 과검토, 관계에서는 속 결론 미공유로 이어질 수 있습니다.",
      balance: "최종 확인만 본인이 맡고 중간 단계는 체크포인트로 분리합니다.",
      evidenceAxisIds: ["day_master", "five_elements"],
      evidenceIds: [dayMasterEvidenceId, dominantEvidenceId],
    },
    {
      id: "ss_boundary",
      strength: "범위를 분명히 하는 힘",
      overuse: "유연성보다 선 긋기가 먼저 보이는 순간",
      realLifeConsequence: "공동비용, 부탁, 일정 조율에서 차갑게 읽힐 수 있습니다.",
      balance: "거절보다 범위 제안 문장을 먼저 준비합니다.",
      evidenceAxisIds: ["pillar_day", "ten_gods_day"],
      evidenceIds: [dayBranchEvidenceId],
    },
    {
      id: "ss_responsibility",
      strength: "책임을 끝까지 가져가는 힘",
      overuse: "도움을 늦게 요청하는 방식",
      realLifeConsequence: "완성도는 높지만 회복이 늦고 피로가 누적될 수 있습니다.",
      balance: "도움 요청 기준을 사전에 정해 둡니다.",
      evidenceAxisIds: ["ten_gods_year", "ten_god_distribution"],
      evidenceIds: [yearStemEvidenceId, topTenGods[0]?.evidenceId ?? yearStemEvidenceId],
    },
  ];

  const domainSignals: DomainSignalV2[] = [
    {
      domain: "free",
      keyQuestion: "나는 어떤 사람인가?",
      evidenceAxisIds: ["day_master", "five_elements", "ten_god_distribution"],
      signalSummary: [
        "겉과 속의 속도가 다를 수 있음",
        "기준 정리와 실제 행동 사이 간격이 존재",
      ],
    },
    {
      domain: "money",
      keyQuestion: "나는 돈 앞에서 어떻게 움직이는가?",
      evidenceAxisIds: ["day_master", "five_elements", "ten_gods_month", "ten_gods_year"],
      signalSummary: [
        behaviorHypotheses[0]!.shareableLine ?? "돈 앞에서 속도가 갈라질 수 있음",
        behaviorHypotheses[0]!.shadowSide,
      ],
    },
    {
      domain: "work",
      keyQuestion: "나는 어떤 방식으로 일할 때 강해지는가?",
      evidenceAxisIds: ["five_elements", "ten_god_distribution", "ten_gods_month"],
      signalSummary: [
        behaviorHypotheses[1]!.shareableLine ?? "환경이 맞을 때 강점이 살아남",
        behaviorHypotheses[1]!.shadowSide,
      ],
    },
    {
      domain: "love",
      keyQuestion: "나는 관계가 깊어질수록 어떻게 달라지는가?",
      evidenceAxisIds: ["pillar_day", "ten_gods_day", "yin_yang"],
      signalSummary: [
        behaviorHypotheses[2]!.shareableLine ?? "가까워질수록 속도가 달라질 수 있음",
        behaviorHypotheses[2]!.shadowSide,
      ],
    },
    {
      domain: "total",
      keyQuestion: "이 모든 모습이 나라는 한 사람 안에서 어떻게 연결되는가?",
      evidenceAxisIds: ["day_master", "five_elements", "ten_god_distribution", "pillar_day", "element_relation"],
      signalSummary: [
        "확인·기준이라는 공통 리듬이 있지만, 영역마다 출발 근거가 다름",
        "모순은 단일 성격이 아니라 상황별 다른 축의 충돌로 설명됨",
      ],
    },
    {
      domain: "cross",
      keyQuestion: "지금 고민과 타로 질문에는 무엇을 연결해 봐야 하는가?",
      evidenceAxisIds: ["pillar_day", "element_relation", "ten_gods_month"],
      signalSummary: [
        "현재 갈등 장면에서 무엇을 통제하려는지",
        "무엇이 결정을 멈추게 하는지 질문화 가능",
      ],
    },
  ];

  void chart;

  return {
    contextVersion: "v2",
    capability: getEngineCapabilityAudit(),
    identityAxes,
    elementAxes,
    tenGodAxes,
    pillarAxes,
    interactionAxes,
    behaviorHypotheses,
    tensions,
    strengthShadowPairs,
    domainSignals,
    evidenceRegistry,
  };
}

export function axisUsagePercent(
  evidenceAxisIds: string[]
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const id of evidenceAxisIds) {
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const total = evidenceAxisIds.length || 1;
  for (const [key, value] of counts.entries()) {
    counts.set(key, Math.round((value / total) * 100));
  }
  return counts;
}
