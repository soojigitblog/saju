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

  const behaviorHypotheses: InsightCardV2[] = [
    {
      id: "money-threshold",
      title: "돈에서 먼저 보는 기준",
      coreInterpretation: "큰돈에서는 속도보다 기준 정리가 앞서고, 작은 반복에서는 시야가 느슨해질 여지가 있습니다.",
      evidenceAxisIds: ["day_master", "five_elements", "ten_gods_month"],
      evidenceIds: [dayMasterEvidenceId, dominantEvidenceId, monthStemEvidenceId],
      behaviorPossibilities: [
        "결정을 미루는 것이 아니라 기준이 서기 전까지 보류하는 쪽에 가깝습니다.",
        "반복 결제는 규모가 작을수록 체감보다 늦게 잡힐 수 있습니다.",
      ],
      realLifeExamples: [
        "큰 결제에서는 필요·대안·한도를 먼저 정한 뒤 결론을 내리는 식으로 나타날 수 있습니다.",
        "월 단위 고정비보다 잔잔한 편의 소비가 나중에 합쳐져 보일 수 있습니다.",
      ],
      counterPattern: "이미 기준이 있는 영역에서는 오히려 결정이 빠르게 끝날 수 있습니다.",
      triggerConditions: ["큰 금액", "비교 선택지 다수", "정산 기준 불명확"],
      strengthSide: "큰 흐름을 지키는 판단",
      shadowSide: "소액·반복 지출의 사각",
      practicalMeaning: "절약 조언보다 ‘어디서 놓치는가’를 분리해 보는 편이 맞습니다.",
      actionOptions: ["큰 결제 기준 3개 고정", "반복 지출만 주 1회 합산"],
      confidence: "high",
      shareableLine: "큰돈은 막는데, 작은 반복은 늦게 보일 수 있다.",
    },
    {
      id: "work-environment",
      title: "일에서 힘이 나는 방식",
      coreInterpretation: "역할·완료 조건·검수 지점이 보이는 환경에서 강점이 살아나고, 기준 없는 수정 반복에서는 피로가 커질 수 있습니다.",
      evidenceAxisIds: ["five_elements", "ten_god_distribution", "ten_gods_month"],
      evidenceIds: [dominantEvidenceId, monthStemEvidenceId, topTenGods[0]?.evidenceId ?? monthStemEvidenceId],
      behaviorPossibilities: [
        "막연한 아이디어보다 범위가 정리된 과제에서 집중력이 붙을 수 있습니다.",
        "수정 이유가 흐릴수록 일 자체보다 과정 관리에 지칠 수 있습니다.",
      ],
      realLifeExamples: [
        "프로젝트 초반에는 요구사항 정리, 후반에는 마감 직전 점검에서 강점이 드러날 수 있습니다.",
      ],
      counterPattern: "목표가 선명하면 평소보다 훨씬 과감하게 밀어붙일 수 있습니다.",
      triggerConditions: ["모호한 수정 요청", "책임 범위 불명확", "완료 기준 부재"],
      strengthSide: "완성도 관리",
      shadowSide: "위임 지연",
      practicalMeaning: "직업명보다 업무 구조와 검수 리듬이 더 중요합니다.",
      actionOptions: ["완료 조건 선확인", "위임 범위와 검수 포인트 분리"],
      confidence: "high",
      shareableLine: "능력보다 환경이 먼저 맞아야 강점이 제대로 작동한다.",
    },
    {
      id: "love-distance",
      title: "가까워질수록 달라지는 태도",
      coreInterpretation: "처음에는 예의와 관찰이 앞서고, 확신이 생긴 뒤에는 챙김이 빨라지지만 경계가 흔들리면 다시 거리를 둡니다.",
      evidenceAxisIds: ["pillar_day", "ten_gods_day", "yin_yang"],
      evidenceIds: [dayBranchEvidenceId, yinYangEvidenceId],
      behaviorPossibilities: [
        "말보다 행동의 일관성을 보고 마음을 정할 수 있습니다.",
        "불편함을 바로 표출하기보다 정리 후에야 거리를 조절할 수 있습니다.",
      ],
      realLifeExamples: [
        "호감 초기에는 속도를 늦추다가, 믿음이 생기면 실질적 챙김이 빨라지는 식으로 나타날 수 있습니다.",
      ],
      counterPattern: "신뢰가 한 번 정리된 관계에서는 오히려 설명 없이도 바로 움직일 수 있습니다.",
      triggerConditions: ["관계 정의 이전", "말과 행동 불일치", "갈등 후 정리 시간 필요"],
      strengthSide: "관계의 진정성을 오래 본다",
      shadowSide: "속 결론 공유 지연",
      practicalMeaning: "연애 해석은 호감의 유무보다 ‘가까워질수록 어떻게 달라지는가’에 답해야 합니다.",
      actionOptions: ["불편함을 하루 안에 짧게 공유", "확신 전 확인 기준 언어화"],
      confidence: "medium",
      shareableLine: "마음이 생긴 뒤의 속도와, 마음을 정하기 전의 속도가 다를 수 있다.",
    },
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
        "큰돈 방어와 소액 사각이 함께 나타날 수 있음",
        "정산 기준이 없을 때 스트레스가 커질 수 있음",
      ],
    },
    {
      domain: "work",
      keyQuestion: "나는 어떤 방식으로 일할 때 강해지는가?",
      evidenceAxisIds: ["five_elements", "ten_god_distribution", "ten_gods_month"],
      signalSummary: [
        "완료 조건과 검수 지점이 보이는 일에서 강점이 살아남",
        "모호한 수정 반복에서는 피로가 빠르게 누적됨",
      ],
    },
    {
      domain: "love",
      keyQuestion: "나는 관계가 깊어질수록 어떻게 달라지는가?",
      evidenceAxisIds: ["pillar_day", "ten_gods_day", "yin_yang"],
      signalSummary: [
        "확신 전과 후의 속도가 다름",
        "갈등 시 바로 폭발하기보다 거리 조절이 먼저 나타날 수 있음",
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
