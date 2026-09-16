import { USER_FACING_DISCLAIMER } from "@/lib/ai/disclaimer";
import { buildInterpretationContextV2 } from "@/lib/ai/interpretation-context-v2";
import { buildMoneyProfileScales } from "@/lib/ai/paid-profile-scales";
import type {
  PaidFortuneReport,
  PaidSection,
  PaidProductKind,
} from "@/lib/ai/schemas/paid-report";
import type { FortuneAiContext } from "@/lib/ai/types";
import type { FortuneChart } from "@/lib/fortune-engine/types";

const SCOPE =
  "이 리포트는 태어난 순간의 사주 구조를 중심으로 분석합니다. 특정 연도·월의 길흉이나 미래 시기를 맞히는 내용은 포함하지 않습니다.";

function fiveSnapshot(ctx: FortuneAiContext) {
  return [
    { key: "wood" as const, label: "木", count: ctx.fiveElements.wood },
    { key: "fire" as const, label: "火", count: ctx.fiveElements.fire },
    { key: "earth" as const, label: "土", count: ctx.fiveElements.earth },
    { key: "metal" as const, label: "金", count: ctx.fiveElements.metal },
    { key: "water" as const, label: "水", count: ctx.fiveElements.water },
  ];
}

function chartElementEvidence(ctx: FortuneAiContext) {
  const rows = fiveSnapshot(ctx);
  const dominant = [...rows].sort((a, b) => b.count - a.count)[0]!;
  const scarce = [...rows].sort((a, b) => a.count - b.count)[0]!;
  const second = [...rows].sort((a, b) => b.count - a.count)[1]!;
  return {
    dominant: `fiveElements.${dominant.key}`,
    second: `fiveElements.${second.key}`,
    scarce: `fiveElements.${scarce.key}`,
  };
}

function section(
  key: PaidSection["key"],
  input: Omit<PaidSection, "key" | "title" | "coreInsight" | "behaviorScenes" | "evidenceExplanation" | "evidence"> & {
    title: string;
    coreInsight: string;
    behaviorScenes: string[];
    evidenceExplanation: string[];
    evidence: string[];
  }
): PaidSection {
  return {
    key,
    id: key,
    title: input.title,
    coreInsight: input.coreInsight,
    coreInterpretation: input.coreInterpretation ?? input.coreInsight,
    behaviorScenes: input.behaviorScenes,
    behaviorPossibilities: input.behaviorPossibilities ?? input.behaviorScenes.slice(0, 2),
    realLifeExamples: input.realLifeExamples ?? input.behaviorScenes.slice(0, 2),
    evidenceExplanation: input.evidenceExplanation,
    evidence: input.evidence,
    evidenceAxisIds: input.evidenceAxisIds,
    confidence: input.confidence,
    shareableLine: input.shareableLine,
    question: input.question,
    strengthSide: input.strengthSide,
    shadowSide: input.shadowSide,
    riskSide: input.riskSide,
    counterPattern: input.counterPattern,
    triggerSituation: input.triggerSituation,
    triggerConditions: input.triggerConditions,
    practicalMeaning: input.practicalMeaning,
    actionAdvice: input.actionAdvice,
    actionOptions: input.actionOptions,
    takeaway: input.takeaway,
    cautions: input.cautions,
    pullQuote: input.pullQuote,
    narrativeBridge: input.narrativeBridge,
    includeWhyBox: input.includeWhyBox,
    paradoxNote: input.paradoxNote,
  };
}

function pickCard(ctxV2: ReturnType<typeof buildInterpretationContextV2>, id: string) {
  return ctxV2.behaviorHypotheses.find((card) => card.id === id) ?? ctxV2.behaviorHypotheses[0]!;
}

export function buildMockPaidResultDeep(
  ctx: FortuneAiContext,
  productName: string,
  options?: { productSlug?: string; chart?: FortuneChart }
): PaidFortuneReport {
  const slug = options?.productSlug ?? "";
  const kind: PaidProductKind =
    /money/i.test(slug) ? "money" : /career|job/i.test(slug) ? "career" : /love/i.test(slug) ? "love" : /total/i.test(slug) ? "total" : "generic";
  const v2 = buildInterpretationContextV2(ctx, options?.chart);
  const fe = chartElementEvidence(ctx);
  const dm = `${ctx.dayMaster.stem}(${ctx.dayMaster.hangul})`;
  const moneyCard = pickCard(v2, "money-threshold");
  const workCard = pickCard(v2, "work-environment");
  const loveCard = pickCard(v2, "love-distance");
  const tensionA = v2.tensions[0]!;
  const shadowA = v2.strengthShadowPairs[0]!;
  const shadowB = v2.strengthShadowPairs[1]!;
  const shadowC = v2.strengthShadowPairs[2]!;

  const evidence = [...new Set(v2.evidenceRegistry.flatMap((x) => x.sources))].slice(0, 16);
  const scales = buildMoneyProfileScales(ctx).slice(0, 3);
  const nextQuestions = [
    "돈에서 기준이 분명한데, 일에서는 왜 위임이 늦어질까?",
    "관계에서는 맞추는 것처럼 보이는데, 연애에서는 왜 행동의 일관성을 더 보게 될까?",
    "정리로 회복하려는 습관이 스트레스 관리에는 언제 도움이 되고 언제 회피가 될까?",
  ];

  if (kind === "money") {
    const sections: PaidSection[] = [
      section("money_v4_structure", {
        title: "내 돈의 기본 구조",
        question: "돈을 볼 때 가장 먼저 읽히는 축은 무엇인가요?",
        coreInsight: moneyCard.coreInterpretation,
        behaviorScenes: [
          ...(moneyCard.behaviorPossibilities ?? []).slice(0, 2),
          ...(moneyCard.realLifeExamples ?? []).slice(0, 1),
        ],
        evidenceExplanation: [
          `${dm} 일간과 오행 분포를 함께 보면, 돈 판단의 중심은 즉흥보다 기준 정리에 가깝습니다.`,
          `오행 우세·희소 축과 월간 십성 축이 함께 작동해 큰 흐름과 작은 누수를 다르게 보게 만듭니다.`,
        ],
        evidence: moneyCard.evidenceIds.map((id) => v2.evidenceRegistry.find((x) => x.id === id)?.sources[0] ?? "dayMaster").slice(0, 6),
        evidenceAxisIds: moneyCard.evidenceAxisIds,
        behaviorPossibilities: moneyCard.behaviorPossibilities,
        realLifeExamples: moneyCard.realLifeExamples,
        counterPattern: moneyCard.counterPattern,
        triggerConditions: moneyCard.triggerConditions,
        strengthSide: moneyCard.strengthSide,
        shadowSide: moneyCard.shadowSide,
        practicalMeaning: "소비를 선악으로 나누기보다, 어떤 크기의 돈에서 판단이 달라지는지 보는 것이 핵심입니다.",
        actionOptions: moneyCard.actionOptions,
        confidence: moneyCard.confidence,
        shareableLine: moneyCard.shareableLine,
        includeWhyBox: true,
        pullQuote: moneyCard.shareableLine,
      }),
      section("money_v4_earn_spend", {
        title: "벌기 vs 쓰기",
        question: "같은 사람이 수입과 지출에서 왜 다르게 움직일까요?",
        coreInsight: "수입에서는 정당성, 지출에서는 허용 범위가 따로 작동해 같은 신중함도 전혀 다른 표정으로 나타날 수 있습니다.",
        behaviorScenes: [
          "수입: 기준이 보이는 보상 구조에서는 힘을 오래 쓰기 쉽습니다.",
          "수입: 말로만 약속된 대가는 일의 만족보다 불안을 먼저 키울 수 있습니다.",
          "지출: 필요성은 인정해도 허용 범위를 못 정하면 결론이 늦어질 수 있습니다.",
          "지출: 피로한 날에는 작은 편의 소비가 예외처럼 늘 수 있습니다.",
        ],
        evidenceExplanation: [
          "월간 십성 축은 ‘어떻게 벌고 관리하는가’를, 오행 관계 축은 ‘어디서 속도가 달라지는가’를 보여줍니다.",
        ],
        evidence: ["tenGods.month.stem", fe.dominant, fe.second],
        evidenceAxisIds: ["ten_gods_month", "five_elements", "element_relation"],
        counterPattern: "반대로, 이미 산출 기준이 정해진 수입 구조에서는 의외로 빠르게 결정할 수 있습니다.",
        strengthSide: "정당성이 보이면 오래 버팀",
        shadowSide: "허용 범위가 안 서면 과검토",
        practicalMeaning: "돈 성향은 ‘신중하다’ 한마디가 아니라 벌기와 쓰기에서 다른 이유를 가져야 입체적입니다.",
        shareableLine: "버는 데서 보는 기준과, 쓰는 데서 보는 기준이 다를 수 있다.",
        confidence: "high",
      }),
      section("money_v4_blindspot", {
        title: "돈의 사각지대",
        question: "나는 무엇을 놓치기 쉬울까요?",
        coreInsight: "이 명식의 사각지대는 낭비 습관 하나가 아니라, 크기·속도·관계 문장 세 군데에서 각각 다르게 생길 수 있습니다.",
        behaviorScenes: [
          "큰돈은 막아도 작은 반복 지출은 뒤늦게 합쳐져 보일 수 있습니다.",
          "검토가 길어지면 ‘안 하는 쪽’이 더 편해져 기회비용이 생길 수 있습니다.",
          "공동비용은 금액보다 정산 문장이 없을 때 더 꼬일 수 있습니다.",
        ],
        evidenceExplanation: [
          "년간 십성 축은 책임과 경계의 압력을 보여주고, 오행 희소 축은 무엇이 시야에서 늦게 잡히는지 드러냅니다.",
        ],
        evidence: ["tenGods.year.stem", fe.scarce, "dayMaster"],
        evidenceAxisIds: ["ten_gods_year", "five_elements", "day_master"],
        counterPattern: "기준이 이미 정리된 반복 항목이라면 오히려 누구보다 안정적으로 관리할 수도 있습니다.",
        strengthSide: "큰 손실을 쉽게 허용하지 않음",
        shadowSide: "작은 반복과 결정 지연이 누적됨",
        practicalMeaning: "절약 습관 권유보다, 어디서 시야가 끊기는지 쪼개는 편이 실제 도움 됩니다.",
        shareableLine: "사각지대는 성격 결함보다, 어디에 주의가 몰리는가의 문제일 수 있다.",
        confidence: "high",
        includeWhyBox: true,
        paradoxNote: "겉으로는 절제형처럼 보여도 피로가 끼어들면 편의 소비에는 의외로 너그러워질 수 있습니다.",
      }),
      section("money_v4_work", {
        title: "일·부업과 돈",
        question: "어떤 수입 방식에서 만족하기 쉬울까요?",
        coreInsight: "돈 문제는 직업명보다, 결과물과 대가의 연결이 얼마나 설명 가능한 구조인지에서 만족도가 갈립니다.",
        behaviorScenes: workCard.realLifeExamples,
        evidenceExplanation: [
          "오행 우세 축과 십성 분포 축을 같이 보면, 일의 강점은 사람 이미지보다 구조 선명도와 더 가깝습니다.",
        ],
        evidence: [fe.dominant, "tenGods.month.stem", "dayMaster"],
        evidenceAxisIds: ["five_elements", "ten_god_distribution", "ten_gods_month"],
        behaviorPossibilities: workCard.behaviorPossibilities,
        counterPattern: workCard.counterPattern,
        triggerConditions: workCard.triggerConditions,
        strengthSide: workCard.strengthSide,
        shadowSide: workCard.shadowSide,
        practicalMeaning: "부업·본업을 예언하기보다, 어떤 보상 구조가 오래 가는지 답하는 쪽이 정확합니다.",
        actionOptions: workCard.actionOptions,
        confidence: "high",
        shareableLine: workCard.shareableLine,
      }),
      section("money_v4_people", {
        title: "사람과 돈",
        question: "관계 속 돈은 어디서 민감해질까요?",
        coreInsight: "돈 문제는 인색함보다 ‘말이 된 분담’이 없을 때 예민해지는 방식으로 나타날 수 있습니다.",
        behaviorScenes: [
          "공동비용은 미리 범위를 정하면 편하지만, ‘나중에 보자’가 길어지면 속으로 불편할 수 있습니다.",
          "선물이나 호의는 줄 수 있어도 반복적 기대가 생기면 빠르게 경계를 세울 수 있습니다.",
          "가족·연인 지출도 마음보다 기준이 먼저 흔들릴 때 스트레스가 커질 수 있습니다.",
        ],
        evidenceExplanation: [
          "일주 축은 가까운 관계에서의 반응을, 년주 축은 바깥 관계에서 보이는 태도를 드러냅니다.",
        ],
        evidence: ["pillars.day.branch", "tenGods.day.branch", "tenGods.year.stem"],
        evidenceAxisIds: ["pillar_day", "ten_gods_day", "ten_gods_year"],
        counterPattern: "신뢰가 충분히 쌓인 관계에서는 계산보다 실질적 지원이 먼저 나갈 수도 있습니다.",
        strengthSide: "경계를 분명히 하여 뒤탈을 줄임",
        shadowSide: "불편함을 늦게 말해 오해가 쌓임",
        practicalMeaning: "사람과 돈을 별도 장면으로 보는 것이 재물 리포트의 완결성을 만듭니다.",
        confidence: "medium",
        shareableLine: "인색해서가 아니라, 말이 된 분담이 없을 때 더 예민해질 수 있다.",
      }),
      section("money_v4_playbook", {
        title: "나의 재물 플레이북",
        question: "실제로는 어떻게 써먹어야 할까요?",
        coreInsight: "재물 해석의 핵심은 성격 칭찬이 아니라, 자주 반복되는 돈 장면에 맞는 대응을 갖는 데 있습니다.",
        behaviorScenes: [
          "큰 결제를 계속 미루고 있다면 → 기준을 세 가지로 줄이고 종료 시각을 정합니다.",
          "소액이 늦게 보인다면 → 반복 항목만 따로 합산하는 루틴을 둡니다.",
          "정산이 애매하다면 → 금액과 범위를 한 문장으로 먼저 보냅니다.",
        ],
        evidenceExplanation: [
          "플레이북은 기존 성향을 바꾸려는 훈계가 아니라, 실제 증거 축이 강하게 드러나는 장면에 대응을 붙인 것입니다.",
        ],
        evidence: ["dayMaster", "tenGods.month.stem", "pillars.day.branch"],
        evidenceAxisIds: ["day_master", "ten_gods_month", "pillar_day"],
        counterPattern: "모든 장면에 규칙을 늘리면 오히려 피로해질 수 있으니, 자주 반복되는 세 장면만 고정하는 편이 낫습니다.",
        practicalMeaning: "좋은 재물 리포트는 절약하라고 끝나지 않고, 내 방식에 맞는 관리 문장을 남겨야 합니다.",
        actionOptions: ["기준 3개", "반복 지출 합산", "정산 문장 선공유"],
        confidence: "high",
        shareableLine: "돈 관리는 의지보다, 자주 반복되는 장면에 맞는 문장이 있을 때 오래 간다.",
      }),
    ];

    return {
      title: "나의 재물 사용설명서",
      reportVersion: "v4",
      interpretationVersion: "p2-v2",
      reportKind: "money",
      signatureStatement: moneyCard.coreInterpretation.slice(0, 220),
      executiveSummary: "재물 영역을 단일 성격 문장으로 묶지 않고, 수입 구조·지출 속도·정산 경계·사각지대·대응 문장까지 분리해 읽은 focused report입니다.",
      profileDashboard: [
        { label: "돈의 기준", value: "크기와 정당성에 따라 다르게 작동" },
        { label: "새는 지점", value: "소액 반복·결정 지연·분담 미정" },
        { label: "편한 수입 구조", value: "범위·대가·검수 지점이 보이는 구조" },
        { label: "사람과 돈", value: "정이 아니라 분담 문장이 핵심" },
        { label: "핵심 질문", value: "나는 돈 앞에서 어디서 속도가 달라지는가?" },
      ],
      profileScales: scales,
      fiveElementsSnapshot: fiveSnapshot(ctx),
      keywords: ["큰돈 방어", "소액 사각", "정산 기준", "수입 구조", "결정 종료"],
      sections,
      actionItems: [
        { domain: "money", what: "기준 3개 고정", why: "과검토 완화", how: "필요·대안·한도" },
        { domain: "money", what: "반복 지출 합산", why: "소액 사각 보완", how: "주 1회 15분" },
        { domain: "relationship", what: "정산 문장 선공유", why: "분담 미정 방지", how: "금액·범위 한 문장" },
        { domain: "work", what: "보상 구조 확인", why: "수입 불안 감소", how: "산출 기준 확인" },
        { domain: "self", what: "결정 종료 시각 설정", why: "보류 습관 완화", how: "달력에 마감 입력" },
      ],
      finalSummary: {
        strengths: ["큰 흐름을 쉽게 놓치지 않음", "설명 가능한 돈 구조를 선호함"],
        cautions: ["소액 반복 누수", "기준이 안 서면 결론이 길어짐"],
        portraitNarrative: [
          "이 재물 리포트의 핵심은 절약형/소비형 구분이 아닙니다.",
          "같은 신중함도 큰돈, 작은 반복, 수입 구조, 정산 관계에서 전혀 다른 모습으로 나타날 수 있다는 점이 더 중요합니다.",
          "그래서 돈을 잘 쓰는 법도 의지보다 장면별 대응 문장을 갖는 쪽에 가깝습니다.",
        ],
        keepItems: ["큰 결제 전 기준 정리", "설명 가능한 보상 구조 선호"],
        watchItems: ["소액 반복 누적", "정산 미루기"],
        useItems: ["주 1회 반복 지출 합산", "금액·범위 한 문장"],
        closingLine: "운의결 한 줄 — 큰돈을 막는 힘과, 작은 반복을 늦게 보는 틈이 함께 있는 타입입니다.",
      },
      shareableInsights: (sections.map((s) => s.shareableLine).filter(Boolean) as string[]).slice(0, 8),
      possibleNextQuestions: nextQuestions,
      evidence,
      disclaimer: USER_FACING_DISCLAIMER,
      scopeNotes: SCOPE,
    };
  }

  if (kind === "career") {
    const sections: PaidSection[] = [
      section("career_character", {
        title: "일에서 보이는 기본 캐릭터",
        question: "나는 어떤 방식으로 일을 잡는 편일까요?",
        coreInsight: workCard.coreInterpretation,
        behaviorScenes: workCard.behaviorPossibilities,
        evidenceExplanation: ["일의 기본 캐릭터는 일간 축, 월간 십성 축, 오행 우세 축이 겹치는 지점에서 읽는 쪽이 안정적입니다."],
        evidence: ["dayMaster", "tenGods.month.stem", fe.dominant],
        evidenceAxisIds: ["day_master", "ten_gods_month", "five_elements"],
        counterPattern: workCard.counterPattern,
        strengthSide: workCard.strengthSide,
        shadowSide: workCard.shadowSide,
        confidence: "high",
        shareableLine: "일 잘하는 사람이라기보다, 완료 조건이 보여야 제대로 힘을 쓰는 사람에 가깝다.",
      }),
      section("career_strength_work", {
        title: "강점이 살아나는 업무",
        coreInsight: "목표·범위·중간에 확인할 시점이 선명할 때, 강점을 꾸준히 발휘하기 쉽습니다.",
        behaviorScenes: [
          "혼자 초안을 정리하고, 마지막에 품질을 맞추는 리듬에서 강점이 살아날 수 있습니다.",
          "성과가 말이 되는 구조에서는 꾸준함이 오래갑니다.",
        ],
        evidenceExplanation: ["오행 우세 축과 십성 분포 축은 ‘무슨 일을 하느냐’보다 ‘어떤 구조에서 살아나는가’를 더 잘 설명합니다."],
        evidence: [fe.dominant, fe.second, "tenGods.month.stem"],
        evidenceAxisIds: ["five_elements", "ten_god_distribution", "ten_gods_month"],
        counterPattern: "반대로 범위가 흐린 프로젝트에서는 능력보다 피로가 먼저 드러날 수 있습니다.",
        confidence: "high",
        shareableLine: "일을 잘하는 게 아니라, 끝이 보이는 일에서 유독 강해지는 사람일 수 있다.",
      }),
      section("career_org_friction", {
        title: "조직에서 마찰이 생기는 지점",
        coreInsight: "갈등은 사람 싫음보다, 기준 없는 수정과 역할 불명확에서 생길 가능성이 큽니다.",
        behaviorScenes: [
          "‘느낌상 다시’ 같은 요청이 반복되면 일보다 과정이 더 피곤해질 수 있습니다.",
          "책임 범위가 흐리면 스스로 더 많이 떠안게 될 수 있습니다.",
        ],
        evidenceExplanation: ["년간 십성 축과 월간 십성 축은 바깥 관계와 책임 압력이 겹칠 때의 반응을 보여줍니다."],
        evidence: ["tenGods.year.stem", "tenGods.month.stem"],
        evidenceAxisIds: ["ten_gods_year", "ten_gods_month"],
        counterPattern: "신뢰와 기준이 확보된 조직에서는 오히려 갈등이 적고 조율도 잘할 수 있습니다.",
        confidence: "medium",
        shareableLine: "사람이 싫은 게 아니라, 기준 없는 수정이 반복될 때 에너지가 빠지는 구조다.",
      }),
      section("career_conflict", {
        title: "갈등이 생겼을 때",
        coreInsight: "즉시 폭발하기보다 내부 정리 후 말하는 쪽에 가까워, 처음에는 조용하지만 뒤로 갈수록 단호해질 수 있습니다.",
        behaviorScenes: [
          "자리에서는 듣지만, 나중에 결론을 정리해 전달하는 흐름이 익숙할 수 있습니다.",
          "반복된 이슈에는 점점 문장이 짧아지고 경계가 선명해질 수 있습니다.",
        ],
        evidenceExplanation: ["첫 태도와 내부 확정의 시간차는 년간/월간 십성 긴장에서 반복됩니다."],
        evidence: ["tenGods.year.stem", "tenGods.month.stem", "dayMaster"],
        evidenceAxisIds: ["ten_gods_year", "ten_gods_month", "day_master"],
        counterPattern: "이미 기준이 분명한 사안이라면 갈등 초반부터 바로 선을 그을 수도 있습니다.",
        confidence: "medium",
        shareableLine: "조용히 듣는 건 동의가 아니라, 정리 중이라는 뜻일 수 있다.",
      }),
      section("career_overload", {
        title: "과부하가 걸리는 방식",
        coreInsight: "일을 못 해서가 아니라, 확인과 책임을 스스로 더 오래 붙들 때 과부하가 시작될 수 있습니다.",
        behaviorScenes: [
          "위임 시점을 늦추고 마지막 검수까지 직접 맡고 싶어질 수 있습니다.",
          "실수가 나면 속도를 줄이고 더 많이 확인하는 방향으로 반응할 수 있습니다.",
        ],
        evidenceExplanation: ["강점의 그림자는 일간 축과 오행 우세 축이 함께 밀어주는 확인 성향에서 나옵니다."],
        evidence: ["dayMaster", fe.dominant],
        evidenceAxisIds: ["day_master", "five_elements"],
        counterPattern: "완료 기준만 선명하면 오히려 위임과 속도가 동시에 살아날 수 있습니다.",
        confidence: "high",
        shareableLine: "일이 많아서 지치는 게 아니라, 확인을 스스로 더 하려는 구조에서 과부하가 온다.",
      }),
      section("career_recognition", {
        title: "인정을 받는 방식",
        coreInsight: "보이는 열정만큼이나, 결과가 흔들리지 않게 만드는 안정감에서 평가를 받을 가능성이 큽니다.",
        behaviorScenes: [
          "드러난 리더십보다 결과물의 신뢰도, 재현 가능성, 마감 안정감이 기억될 수 있습니다.",
          "같은 팀에서 오래 함께한 사람들이 먼저 실력을 알아보는 경우가 많을 수 있습니다.",
        ],
        evidenceExplanation: ["십성 분포 축은 어떤 모습이 외부에서 성과로 읽히는지 판단할 근거가 됩니다."],
        evidence: ["tenGods.month.stem", fe.second],
        evidenceAxisIds: ["ten_gods_month", "five_elements"],
        counterPattern: "다만 스스로는 이 강점을 ‘당연히 해야 하는 일’로 과소평가할 수 있습니다.",
        confidence: "medium",
        shareableLine: "열정적으로 보이지 않아도, 결과가 흔들리지 않는다는 게 이 사람의 인정 방식이다.",
      }),
      section("career_path_type", {
        title: "잘 맞는 커리어 경로",
        coreInsight: "명함보다 역할 구조가 중요해, 할수록 경험과 실력이 쌓이는 일·운영을 맡는 일·중간에 확인하며 완성하는 일과의 궁합을 먼저 보는 편이 정확합니다.",
        behaviorScenes: [
          "역할이 겹치지 않고 축적이 남는 일에서 오래 가기 쉽습니다.",
          "관계 소모가 핵심인 환경보다는 기준과 결과물이 남는 일이 편할 수 있습니다.",
        ],
        evidenceExplanation: ["오행 우세·희소 축과 일주 축을 같이 보면, 경력에서 무엇이 남아야 만족하는지 드러납니다."],
        evidence: [fe.dominant, fe.second, "pillars.day.branch"],
        evidenceAxisIds: ["five_elements", "pillar_day"],
        counterPattern: "반대로 기준 없는 변화 자체를 즐겨야 하는 역할은 피로가 누적될 수 있습니다.",
        confidence: "high",
        shareableLine: "명함보다 역할 구조가 중요한 사람이라, 같은 직함이라도 맡는 일에 따라 만족도가 크게 달라진다.",
      }),
      section("career_change_signal", {
        title: "변화를 고민하게 되는 신호",
        coreInsight: "새 일에 끌려서보다, 지금 구조가 더 이상 설명되지 않을 때 이동 욕구가 커질 수 있습니다.",
        behaviorScenes: [
          "역할은 늘어나는데 기준과 보상이 흐려질 때 가장 답답할 수 있습니다.",
          "수정만 많고 배움·축적이 남지 않으면 의욕이 빠질 수 있습니다.",
        ],
        evidenceExplanation: ["수입 구조·일 구조를 함께 보는 축이기 때문에 단순한 이직운 예언보다 실제 불만의 조건을 분리할 수 있습니다."],
        evidence: ["tenGods.month.stem", fe.second, fe.dominant],
        evidenceAxisIds: ["ten_gods_month", "five_elements", "element_relation"],
        counterPattern: "같은 업무라도 기준과 보상이 정리되면 다시 오래 버틸 수 있습니다.",
        confidence: "medium",
        shareableLine: "새 곳에 끌려서가 아니라, 지금이 더 이상 설명되지 않을 때 움직이는 타입이다.",
      }),
      section("career_check", {
        title: "지금 바로 점검할 질문",
        coreInsight: "일을 잘할수록 ‘무엇을 더 할까’보다 ‘무엇까지 맡을까’를 먼저 정하는 것이 중요합니다.",
        behaviorScenes: [
          "내가 아니면 안 될 일인지, 내가 다 하고 싶은 일인지 구분해 보는 점검이 필요할 수 있습니다.",
          "지금 피로의 원인이 업무량인지, 기준 부재인지 분리하면 해법이 달라질 수 있습니다.",
        ],
        evidenceExplanation: ["강점-그림자 축을 일 질문으로 옮기면, 성과를 깎지 않고도 과부하를 줄일 수 있습니다."],
        evidence: ["dayMaster", "tenGods.month.stem"],
        evidenceAxisIds: ["day_master", "ten_gods_month"],
        counterPattern: "능력을 줄이는 게 아니라 검수 포인트만 남기는 방식이 더 맞습니다.",
        confidence: "high",
        shareableLine: "더 하려는 게 아니라, 어디까지 맡을지를 먼저 정하는 게 이 사람의 성과 방식이다.",
      }),
      section("career_closing", {
        title: "일 리포트의 결론",
        coreInsight: "직업명 예언보다 ‘어떤 구조에서 강해지는 사람인가’를 잡아낸다면, 이미 이 리포트의 핵심 질문에는 충분히 답한 셈입니다.",
        behaviorScenes: [
          "내 강점이 환경 따라 어떻게 달라지는지 알면 같은 업무도 덜 소모적으로 운영할 수 있습니다.",
          "이 리포트의 핵심 문장 3개를 기억해두면, 다음 선택에서 기준이 될 수 있습니다.",
        ],
        evidenceExplanation: ["focused work report의 완결성은 진로 불안 마케팅이 아니라, 일하는 방식의 해상도를 높이는 데 있습니다."],
        evidence: ["dayMaster", fe.dominant, "tenGods.month.stem"],
        evidenceAxisIds: ["day_master", "five_elements", "ten_gods_month"],
        counterPattern: "다른 상품을 사지 않아도 ‘나는 어떤 방식의 일에서 강한가’라는 질문은 여기서 완결되어야 합니다.",
        confidence: "high",
        shareableLine: "직업명을 예언할 수는 없지만, 어떤 구조에서 강한 사람인지는 분명히 보인다.",
      }),
    ];

    return {
      title: `${productName} · 일 사용설명서`,
      reportVersion: "v4",
      interpretationVersion: "p2-v2",
      reportKind: "career",
      signatureStatement: workCard.coreInterpretation.slice(0, 220),
      executiveSummary: "직업명을 예언하지 않고, 어떤 환경·보상·책임 구조에서 강점과 과부하가 어떻게 갈리는지에 집중한 focused work report입니다.",
      profileDashboard: [
        { label: "잘 맞는 구조", value: "완료 조건·검수 지점이 보이는 일" },
        { label: "지치는 구조", value: "기준 없는 수정 반복" },
        { label: "갈등 패턴", value: "조용히 듣다가 나중에 단호해짐" },
        { label: "핵심 그림자", value: "위임 지연·과부하" },
      ],
      fiveElementsSnapshot: fiveSnapshot(ctx),
      keywords: ["완료 조건", "검수 리듬", "위임 지연", "역할 구조", "책임 압력"],
      sections,
      actionItems: [
        { domain: "work", what: "완료 조건 되묻기", why: "모호한 수정 방지", how: "한 문장 확인" },
        { domain: "work", what: "검수 포인트만 남겨 위임", why: "과부하 감소", how: "중간 단계 분리" },
        { domain: "self", what: "도움 요청 기준 정하기", why: "책임 과잉 방지", how: "3개 조건 메모" },
        { domain: "work", what: "역할 경계 확인", why: "업무 범위 팽창 방지", how: "이번 주 맡을 일만 명시" },
        { domain: "relationship", what: "결론 초안 먼저 공유", why: "조용한 갈등 완화", how: "회의 후 요약 3줄" },
      ],
      finalSummary: {
        strengths: ["완료 기준이 보이면 강함", "품질 안정감이 높음"],
        cautions: ["위임 지연", "모호한 수정에 취약"],
        portraitNarrative: [
          "일 리포트의 핵심은 능력 칭찬이 아닙니다.",
          "같은 사람도 어떤 구조에서는 강점이 증폭되고, 어떤 구조에서는 책임과 확인이 과해져 과부하로 바뀔 수 있다는 점을 잡아내는 데 있습니다.",
        ],
        closingLine: "운의결 한 줄 — 일을 못 해서 지치는 것이 아니라, 설명되지 않는 구조에서 힘이 새는 쪽에 가깝습니다.",
      },
      shareableInsights: (sections.map((s) => s.shareableLine).filter(Boolean) as string[]).slice(0, 8),
      possibleNextQuestions: [
        "일에서는 기준을 먼저 보는데, 돈에서는 왜 작은 반복을 늦게 보는가?",
        "일에서 위임이 늦은 패턴이 가까운 관계에서는 어떻게 나타날까?",
        "지금 조직에서 느끼는 정체가 구조 문제인지, 시기 문제인지 사주×타로로 구분할 수 있을까?",
      ],
      evidence,
      disclaimer: USER_FACING_DISCLAIMER,
      scopeNotes: SCOPE,
    };
  }

  if (kind === "love") {
    const sections: PaidSection[] = [
      section("love_attraction", {
        title: "마음이 가는 방식",
        coreInsight: "끌림의 시작은 화려한 표현보다 태도와 일관성에서 더 빨리 반응할 수 있습니다.",
        behaviorScenes: loveCard.behaviorPossibilities,
        evidenceExplanation: ["일주 축과 음양 축은 ‘처음부터 깊어지기까지’ 관계 속 속도 차이를 읽는 재료입니다."],
        evidence: ["pillars.day.branch", "tenGods.day.branch", "dayMaster"],
        evidenceAxisIds: ["pillar_day", "ten_gods_day", "day_master"],
        counterPattern: loveCard.counterPattern,
        confidence: "medium",
        shareableLine: "말보다 태도의 일관성을 더 오래 보는 타입일 수 있다.",
      }),
      section("love_before", {
        title: "확신 전의 거리",
        coreInsight: loveCard.coreInterpretation,
        behaviorScenes: loveCard.behaviorPossibilities,
        evidenceExplanation: ["확신 전의 속도는 일간 축과 일주 축이 같이 설명하는 영역입니다."],
        evidence: ["dayMaster", "pillars.day.branch"],
        evidenceAxisIds: ["day_master", "pillar_day"],
        counterPattern: loveCard.counterPattern,
        confidence: "medium",
        shareableLine: loveCard.shareableLine,
      }),
      section("love_after", {
        title: "확신 후의 변화",
        coreInsight: "확신이 생기면 표현보다 실질적 챙김과 책임감이 빠르게 커질 수 있습니다.",
        behaviorScenes: [
          "시간·실행·정리된 배려로 마음을 보여줄 가능성이 있습니다.",
          "관계를 지키기 위한 기준도 함께 세우려 할 수 있습니다.",
        ],
        evidenceExplanation: ["관계가 깊어진 뒤의 모습은 일주 축과 십성 분포 축을 함께 볼 때 더 입체적입니다."],
        evidence: ["pillars.day.branch", "tenGods.day.stem", "tenGods.month.stem"],
        evidenceAxisIds: ["pillar_day", "ten_gods_day", "ten_god_distribution"],
        counterPattern: "다만 기준이 흔들리면 챙김의 속도만큼 빠르게 거리를 조절할 수도 있습니다.",
        confidence: "medium",
        shareableLine: "확신 후에는 말보다 행동이 갑자기 많아지는 사람일 수 있다.",
      }),
      section("love_expression", {
        title: "표현 방식",
        coreInsight: "감정의 크기보다 관계를 안정시키는 행동이 먼저 표현으로 나올 수 있습니다.",
        behaviorScenes: [
          "말로 길게 설명하기보다 실제로 챙기거나 정리해 주는 방식이 자연스러울 수 있습니다.",
          "기념일을 말로 축하하기보다 실질적 준비로 보여주려 할 수 있습니다.",
        ],
        evidenceExplanation: ["오행 우세 축은 감정 표현의 화려함보다 어떤 방식으로 실질화되는지를 보여줍니다."],
        evidence: [fe.dominant, fe.second],
        evidenceAxisIds: ["five_elements", "day_master"],
        counterPattern: "상대가 계속 말만 요구하면 표현 부족으로 오해받을 수 있습니다.",
        confidence: "medium",
        shareableLine: "말은 적어도 챙기는 건 많은, 행동형 애정 표현에 가깝다.",
      }),
      section("love_needs", {
        title: "관계에서 필요한 것",
        coreInsight: "설렘보다도 예측 가능한 태도, 말과 행동의 합치, 불편함을 정리할 수 있는 시간이 중요할 수 있습니다.",
        behaviorScenes: [
          "좋아함보다 신뢰가 먼저 쌓여야 마음이 편해질 수 있습니다.",
          "불편한 장면을 바로 정리하지 못하면 속으로 거리가 생길 수 있습니다.",
        ],
        evidenceExplanation: ["연애의 필요 조건은 일주 축과 년·월 십성 긴장이 만나는 지점에서 읽힙니다."],
        evidence: ["pillars.day.branch", "tenGods.year.stem", "tenGods.month.stem"],
        evidenceAxisIds: ["pillar_day", "ten_gods_year", "ten_gods_month"],
        counterPattern: "이미 신뢰가 충분한 관계에서는 설명보다 행동만으로도 안심할 수 있습니다.",
        confidence: "medium",
        shareableLine: "설렘보다 예측 가능한 태도가 먼저인 사람이라, 안정감의 기준이 좀 다르다.",
      }),
      section("love_fight", {
        title: "갈등이 생겼을 때",
        coreInsight: "갈등은 감정 폭발보다 정리와 거리 조절로 먼저 나타날 가능성이 있습니다.",
        behaviorScenes: [
          "즉시 싸우기보다 말수가 줄고, 정리한 뒤 다시 이야기하려 할 수 있습니다.",
          "같은 문제가 반복되면 설명보다 거리를 선택할 가능성이 높아집니다.",
        ],
        evidenceExplanation: ["월간 십성 축과 강점-그림자 축은 갈등 시 과도한 확인이 어떻게 나타나는지 보여줍니다."],
        evidence: ["tenGods.month.stem", "dayMaster"],
        evidenceAxisIds: ["ten_gods_month", "day_master"],
        counterPattern: "기준이 분명히 어겨진 갈등이라면 오히려 즉시 선을 그을 수 있습니다.",
        confidence: "high",
        shareableLine: "싸우지 않는 게 아니라, 정리될 때까지 말을 아끼는 방식이 갈등의 시작이다.",
      }),
      section("love_breaking", {
        title: "멀어질 때의 패턴",
        coreInsight: "한 번의 감정보다, 신뢰를 정리하는 시간이 길어질수록 관계 회복 가능성도 함께 줄 수 있습니다.",
        behaviorScenes: [
          "서운함이 쌓인 뒤 한 번에 마음을 접는 것처럼 보일 수 있습니다.",
          "마지막이라고 느끼면 오히려 담담해지고, 설명 없이 물러나는 방식이 될 수 있습니다.",
        ],
        evidenceExplanation: ["년간 십성 축과 일주 축이 함께 작동하면 관계 종료도 갑작스런 폭발보다 내부 정리의 결과로 보이기 쉽습니다."],
        evidence: ["tenGods.year.stem", "pillars.day.branch"],
        evidenceAxisIds: ["ten_gods_year", "pillar_day"],
        counterPattern: "오해가 초기에 풀리면 생각보다 오래 붙들고 회복하려 할 수도 있습니다.",
        confidence: "medium",
        shareableLine: "갑자기 마음을 접는 것처럼 보여도, 사실은 오래 정리한 결과일 수 있다.",
      }),
      section("love_distance", {
        title: "다시 가까워지는 방식",
        coreInsight: "회복은 감정 확인보다, 무엇이 문제였는지 말이 되는 정리가 생길 때 시작될 가능성이 큽니다.",
        behaviorScenes: [
          "다시 가까워질 때는 사과의 크기보다 태도의 일관성과 재발 방지 문장이 더 중요할 수 있습니다.",
          "회복 중이라도 같은 패턴이 보이면 다시 속도를 줄이고 관찰 모드로 돌아갈 수 있습니다.",
        ],
        evidenceExplanation: ["관계 회복은 오행 관계 축과 일주 축을 함께 볼 때 더 설명이 됩니다."],
        evidence: [fe.second, "pillars.day.branch", "tenGods.day.branch"],
        evidenceAxisIds: ["element_relation", "pillar_day", "ten_gods_day"],
        counterPattern: "감정은 남아 있어도 기준이 다시 흔들릴 것 같으면 스스로 속도를 늦출 수 있습니다.",
        confidence: "medium",
        shareableLine: "회복은 미안하다는 말보다, 같은 일이 반복되지 않을 거라는 근거에서 시작된다.",
      }),
      section("love_fit", {
        title: "잘 맞는 관계 방식",
        coreInsight: "강한 끌림보다도, 예측 가능하고 책임감 있는 태도 속에서 마음이 오래 갈 가능성이 큽니다.",
        behaviorScenes: [
          "표현 과다보다 일관된 행동, 지나친 밀착보다 적절한 간격이 더 편할 수 있습니다.",
          "예측 가능한 사람 옆에서 오히려 자기 표현이 느는 방향으로 변할 수 있습니다.",
        ],
        evidenceExplanation: ["focused love report는 인연 예언보다, 어떤 관계 방식이 오래 가는지 답하는 쪽이 더 유효합니다."],
        evidence: ["dayMaster", fe.second, "tenGods.day.branch"],
        evidenceAxisIds: ["day_master", "five_elements", "ten_gods_day"],
        counterPattern: "다만 지나치게 무던한 관계는 오히려 마음을 붙잡지 못할 수 있습니다.",
        confidence: "medium",
        shareableLine: "강한 끌림보다 일관된 행동이 오래가는 관계의 조건이라고 느끼는 타입이다.",
      }),
      section("love_closing", {
        title: "연애 리포트의 결론",
        coreInsight: "연애 해석의 핵심은 ‘사랑을 잘한다’가 아니라, 마음이 생기기 전과 후의 내가 얼마나 다르게 움직이는지 이해하는 데 있습니다.",
        behaviorScenes: [
          "관계를 빨리 정하지 않아도, 기준이 맞는 사람에게는 오히려 오래 가는 집중력이 생길 수 있습니다.",
          "이 리포트를 읽고 나면 왜 나는 관계가 깊어지면 이렇게 행동했는지 설명이 될 수 있습니다.",
        ],
        evidenceExplanation: ["연애 focused report는 가까워질수록 달라지는 태도와 거리 조절의 패턴까지 보일 때 완결됩니다."],
        evidence: ["dayMaster", "pillars.day.branch", "tenGods.month.stem"],
        evidenceAxisIds: ["day_master", "pillar_day", "ten_gods_month"],
        counterPattern: "이 리포트는 인연 시기를 예언하지 않고, 관계 패턴 자체를 더 깊게 설명합니다.",
        confidence: "high",
        shareableLine: "연애 해석의 핵심은 잘 맞는 사람이 아니라, 깊어질수록 내가 어떻게 달라지는가이다.",
      }),
    ];

    return {
      title: `${productName} · 연애 사용설명서`,
      reportVersion: "v4",
      interpretationVersion: "p2-v2",
      reportKind: "love",
      signatureStatement: loveCard.coreInterpretation.slice(0, 220),
      executiveSummary: "호감의 시작, 확신 전 거리, 확신 후 챙김, 갈등과 회복 방식까지 단계별로 분리한 focused love report입니다.",
      profileDashboard: [
        { label: "끌림의 기준", value: "말보다 태도와 일관성" },
        { label: "확신 전", value: "관찰·속도 조절" },
        { label: "확신 후", value: "실질적 챙김 증가" },
        { label: "갈등 반응", value: "정리 후 거리 조절" },
      ],
      fiveElementsSnapshot: fiveSnapshot(ctx),
      keywords: ["일관성", "속도 차이", "거리 조절", "회복 방식", "실질적 챙김"],
      sections,
      actionItems: [
        { domain: "relationship", what: "불편함을 하루 안에 짧게 공유", why: "거리 누적 방지", how: "핵심 2줄" },
        { domain: "relationship", what: "확신 기준 언어화", why: "관찰만 길어지는 패턴 방지", how: "행동 기준 3개 메모" },
        { domain: "self", what: "정리 시간 상한", why: "과도한 거리 조절 방지", how: "24시간 후 공유" },
        { domain: "relationship", what: "재발 방지 문장 확인", why: "회복 가능성 판단", how: "말보다 방식 확인" },
        { domain: "self", what: "확신 후 경계도 점검", why: "챙김 과부하 방지", how: "가능 범위 먼저 말하기" },
      ],
      finalSummary: {
        strengths: ["깊어질수록 책임감 있는 챙김", "겉보다 진정성을 오래 봄"],
        cautions: ["속 결론 공유 지연", "거리 조절이 길어질 수 있음"],
        portraitNarrative: [
          "연애 리포트의 핵심은 감정의 유무가 아닙니다.",
          "마음이 생기기 전과 후, 갈등이 생긴 뒤와 회복을 시도할 때의 속도가 각각 다르다는 점을 이해해야 입체적인 해석이 됩니다.",
        ],
        closingLine: "운의결 한 줄 — 연애에서 중요한 건 마음의 크기보다, 언제 속도를 늦추고 언제 갑자기 빨라지는가입니다.",
      },
      shareableInsights: (sections.map((s) => s.shareableLine).filter(Boolean) as string[]).slice(0, 8),
      possibleNextQuestions: [
        "연애에서는 행동의 일관성을 보는데, 친구나 가족 관계에서도 같은 패턴이 나타날까?",
        "관계에서 거리를 조절하는 방식이 일과 스트레스에서는 어떻게 바뀔까?",
        "확신까지 시간이 걸리는 나에게, 지금 관계의 흐름을 사주×타로로 보면 어떤 모양일까?",
      ],
      evidence,
      disclaimer: USER_FACING_DISCLAIMER,
      scopeNotes: SCOPE,
    };
  }

  const sections: PaidSection[] = [
    section("total_v4_decision", {
      title: "내가 판단하는 방식",
      coreInsight: "판단은 단순 신중형이 아니라, 수집 단계와 확정 단계의 속도가 다른 구조로 보는 편이 더 정확합니다.",
      behaviorScenes: [
        "재촉받을수록 바로 결론보다 자료를 더 모으는 식으로 나타날 수 있습니다.",
        "결정 후에는 번복보다 세부 수정 쪽으로 움직일 수 있습니다.",
      ],
      evidenceExplanation: ["일간 축, 월간 십성 축, 오행 관계 축이 함께 작동해 판단 속도를 두 박자로 만듭니다."],
      evidence: ["dayMaster", "tenGods.month.stem", fe.dominant],
      evidenceAxisIds: ["day_master", "ten_gods_month", "element_relation"],
      counterPattern: "이미 기준이 충분한 영역에서는 생각보다 빠르게 결론을 내릴 수도 있습니다.",
      strengthSide: "충동 합의를 줄임",
      shadowSide: "결정 종료가 늦어짐",
      practicalMeaning: "‘신중하다’보다 ‘언제 느리고 언제 빠른가’를 분리해야 실제 자기 이해에 가깝습니다.",
      actionOptions: ["기준 수 제한", "결정 종료 시각 설정"],
      confidence: "high",
      shareableLine: "판단이 느린 게 아니라, 수집과 확정의 속도가 서로 다를 수 있다.",
      includeWhyBox: true,
    }),
    section("total_v4_relationship", {
      title: "관계 속의 나",
      coreInsight: "관계에서는 처음의 조율과 가까워진 뒤의 경계 설정이 같은 사람이 맞나 싶을 만큼 다르게 보일 수 있습니다.",
      behaviorScenes: [
        "처음엔 예의와 경청이 먼저일 수 있습니다.",
        "친해질수록 가능 범위와 선을 더 분명히 할 수 있습니다.",
        "갈등이 생기면 길게 설명하기보다 거리로 먼저 정리할 수 있습니다.",
      ],
      evidenceExplanation: ["년주 축은 바깥에서의 첫 태도, 일주 축은 가까운 관계의 반응을 더 잘 드러냅니다."],
      evidence: ["tenGods.year.stem", "pillars.year.branch", "pillars.day.branch"],
      evidenceAxisIds: ["ten_gods_year", "pillar_year", "pillar_day"],
      counterPattern: "이미 신뢰가 정리된 관계에서는 선을 강하게 긋기보다 실질 지원이 먼저 나갈 수도 있습니다.",
      confidence: "high",
      shareableLine: "처음의 나와 가까워진 뒤의 내가 꽤 다르게 보일 수 있다.",
    }),
    section("total_v4_work", {
      title: "일과 성취",
      coreInsight: "일에서의 강점은 열정 과시보다, 완성도와 끝까지 결과를 맞추는 힘에서 더 선명하게 드러납니다.",
      behaviorScenes: workCard.behaviorPossibilities,
      evidenceExplanation: ["오행 우세 축, 십성 분포 축, 월간 십성 축을 함께 보면 일 만족도의 조건이 분리됩니다."],
      evidence: [fe.dominant, "tenGods.month.stem", fe.second],
      evidenceAxisIds: ["five_elements", "ten_god_distribution", "ten_gods_month"],
      counterPattern: workCard.counterPattern,
      confidence: "high",
      shareableLine: workCard.shareableLine,
    }),
    section("total_v4_money_link", {
      title: "돈과 통제",
      coreInsight: "돈은 금액 자체보다, 내가 이해하고 확인할 수 있는 흐름인가에 따라 안정감이 크게 달라질 수 있습니다.",
      behaviorScenes: moneyCard.behaviorPossibilities,
      evidenceExplanation: [
        "돈이 판단·일·관계와 어떻게 연결되는지 보는 축입니다. 금액 길흉이 아니라 설명·검수 가능한 흐름인가를 봅니다.",
      ],
      evidence: ["dayMaster", fe.second, "tenGods.day.stem"],
      evidenceAxisIds: ["day_master", "five_elements", "ten_gods_day"],
      counterPattern: moneyCard.counterPattern,
      confidence: "high",
      shareableLine: "돈을 좋아하느냐보다, 설명 가능한 흐름인가가 더 중요할 수 있다.",
    }),
    section("total_v4_love", {
      title: "사랑과 거리",
      coreInsight: "연애에서는 마음이 커지는 속도보다, 확신 전과 후의 태도 차이가 더 강한 특징으로 남을 수 있습니다.",
      behaviorScenes: loveCard.behaviorPossibilities,
      evidenceExplanation: ["일주 축과 음양 축은 가까워질수록 달라지는 속도 차이를 읽는 핵심 근거입니다."],
      evidence: ["pillars.day.branch", "tenGods.day.branch", "dayMaster"],
      evidenceAxisIds: ["pillar_day", "ten_gods_day", "yin_yang"],
      counterPattern: loveCard.counterPattern,
      confidence: "medium",
      shareableLine: loveCard.shareableLine,
    }),
    section("total_v4_stress", {
      title: "스트레스와 회복",
      coreInsight: "스트레스는 예측 불가 변수보다 ‘정리가 끝나지 않은 상태’가 길어질 때 더 크게 쌓일 수 있습니다.",
      behaviorScenes: [
        "처음에는 더 정리하고 확인하려는 반응이 나올 수 있습니다.",
        "쌓이면 말수가 줄고 혼자 분류하는 쪽으로 흐를 수 있습니다.",
        "회복은 기록·정리·우선순위 재배치처럼 구조를 다시 세우는 방식이 될 수 있습니다.",
      ],
      evidenceExplanation: ["월간 십성 축과 강점-그림자 축이 겹치면 회복과 회피가 비슷한 모습으로 섞일 수 있습니다."],
      evidence: ["tenGods.month.stem", "dayMaster", fe.second],
      evidenceAxisIds: ["ten_gods_month", "day_master", "five_elements"],
      counterPattern: "정리 기준만 분명하면 오히려 빠르게 회복할 수 있습니다.",
      confidence: "high",
      shareableLine: "스트레스는 일이 많아서보다, 정리가 끝나지 않은 상태가 길어질 때 더 쌓일 수 있다.",
      includeWhyBox: true,
    }),
    section("total_v4_paradox", {
      title: "나의 모순",
      coreInsight: "모순은 가면이 아니라, 외부 조율과 내부 확정이 서로 다른 축에서 동시에 작동하기 때문에 생깁니다.",
      behaviorScenes: [
        "듣고 맞추는 사람처럼 보여도 결론은 혼자 정리할 수 있습니다.",
        "책임감 있게 맡지만 도움 요청은 뒤로 밀릴 수 있습니다.",
      ],
      evidenceExplanation: ["년간·월간 십성 긴장과 오행 우세 축이 만나면 같은 사람 안에서 속도 차이가 커집니다."],
      evidence: ["tenGods.year.stem", "tenGods.month.stem", fe.dominant],
      evidenceAxisIds: ["ten_gods_year", "ten_gods_month", "five_elements"],
      counterPattern: "기준이 충분히 공유된 관계나 조직에서는 이 모순이 훨씬 약하게 보일 수 있습니다.",
      confidence: "high",
      shareableLine: "겉으로는 조율하지만, 속으로는 이미 내부 결론이 진행되고 있을 수 있다.",
      paradoxNote: tensionA.whyBothExist,
      includeWhyBox: true,
    }),
    section("total_v4_shadow", {
      title: "강점의 그림자",
      coreInsight: "좋은 점을 줄이는 것이 해답이 아니라, 강점이 언제 과사용으로 넘어가는지 구간을 알아야 균형이 생깁니다.",
      behaviorScenes: [
        `${shadowA.strength} → ${shadowA.overuse} → ${shadowA.realLifeConsequence}`,
        `${shadowB.strength} → ${shadowB.overuse} → ${shadowB.realLifeConsequence}`,
        `${shadowC.strength} → ${shadowC.overuse} → ${shadowC.realLifeConsequence}`,
      ],
      evidenceExplanation: ["강점-그림자 해석은 일반 자기계발 조언이 아니라, 실제 증거 축이 반복되는 장면을 묶은 것입니다."],
      evidence: ["dayMaster", fe.dominant, "tenGods.year.stem"],
      evidenceAxisIds: ["day_master", "five_elements", "ten_gods_year"],
      counterPattern: "강점을 억누르기보다 체크포인트와 공유 타이밍만 설계해도 그림자는 많이 줄어듭니다.",
      confidence: "high",
      shareableLine: "강점은 줄이는 것이 아니라, 과해지는 구간을 아는 것이 더 중요하다.",
    }),
    section("total_v4_playbook", {
      title: "개인 플레이북",
      coreInsight: "이 사람을 잘 쓰는 방법은 성격을 바꾸는 것이 아니라, 영역별로 반복되는 장면에 맞는 대응을 붙이는 데 있습니다.",
      behaviorScenes: [
        "일: 완료 조건이 흐리면 먼저 한 문장으로 되묻습니다.",
        "돈: 소액 반복이 늦게 보이면 주 1회만 따로 합산합니다.",
        "관계: 경청 뒤 결론이 생기면 하루 안에 초안을 공유합니다.",
        "자기관리: 정리 시간이 길어지면 종료 시각을 먼저 정합니다.",
      ],
      evidenceExplanation: ["플레이북은 판단·돈·관계·스트레스 섹션의 반복 장면을 다시 실용 문장으로 정리한 결과입니다."],
      evidence: ["dayMaster", "tenGods.month.stem", "pillars.day.branch", fe.dominant],
      evidenceAxisIds: ["day_master", "ten_gods_month", "pillar_day", "five_elements"],
      counterPattern: "규칙을 많이 둘수록 맞는 타입이 아니라, 자주 나오는 네 장면만 고정할수록 지속되기 쉽습니다.",
      confidence: "high",
      shareableLine: "성격을 바꾸는 것보다, 반복되는 장면에 맞는 문장을 갖는 편이 훨씬 강하다.",
    }),
  ];

  return {
    title: `${productName} · 사주 사용설명서`,
    reportVersion: "v4",
    interpretationVersion: "p2-v2",
    reportKind: "total",
      signatureStatement: `${dm} 일간에서는 판단·관계·일·돈·연애의 속도가 한 문장으로 안 묶입니다. ${moneyCard.shareableLine ?? ""}`.slice(0, 220),
    executiveSummary: "종합 리포트는 한 축의 반복이 아니라, 일간·오행·십성 분포·기둥 차이·오행 관계가 영역마다 어떻게 다르게 작동하는지 연결하는 개인 분석서로 설계했습니다.",
    profileDashboard: [
      { label: "판단", value: "수집과 확정의 속도가 다름" },
      { label: "관계", value: "처음의 조율과 가까워진 뒤의 경계가 다름" },
      { label: "일", value: "완료 조건이 보여야 강점이 선명해짐" },
      { label: "돈", value: "설명 가능한 흐름에서 안정감이 생김" },
      { label: "사랑", value: "확신 전과 후의 속도 차이" },
      { label: "스트레스", value: "정리가 끝나지 않을수록 누적됨" },
      { label: "가장 큰 강점", value: "확인 포인트를 놓치지 않는 힘" },
      { label: "쉽게 꼬이는 지점", value: "속 결론과 위임 타이밍" },
    ],
    fiveElementsSnapshot: fiveSnapshot(ctx),
    keywords: ["속도 차이", "영역별 다른 축", "모순", "그림자", "개인 플레이북"],
    blueprint: {
      dayMasterTerm: `${ctx.dayMaster.stem}(${ctx.dayMaster.hangul})`,
      dayMasterPlain: (() => {
        const elHanja: Record<string, string> = {
          wood: "木",
          fire: "火",
          earth: "土",
          metal: "金",
          water: "水",
        };
        const elHangul: Record<string, string> = {
          wood: "목",
          fire: "화",
          earth: "토",
          metal: "금",
          water: "수",
        };
        const yy = ctx.dayMaster.yinYang === "yang" ? "양" : "음";
        const yyH = ctx.dayMaster.yinYang === "yang" ? "陽" : "陰";
        const h = elHanja[ctx.dayMaster.element] ?? "";
        const k = elHangul[ctx.dayMaster.element] ?? "";
        return `${yy}${k}(${yyH}${h}) 일간`;
      })(),
      fiveElementsNote: fiveSnapshot(ctx).map((x) => `${x.label}${x.count}`).join(" "),
      tenGodsNote: `월 ${ctx.tenGods.month.stem} · 년 ${ctx.tenGods.year.stem} · 일지 ${ctx.tenGods.day.branch}`,
      structurePlain: "단일 성격 문장이 아니라, 서로 다른 축이 영역마다 다른 속도로 드러나는 구조",
      lifePlain: "판단·관계·일·돈·연애·스트레스를 같은 단어로 덮지 않고 따로 읽습니다.",
    },
    sections,
    contradictions: v2.tensions.map((t) => ({
      poleA: t.poleA,
      poleB: t.poleB,
      howItShows: t.howItShows,
      upside: t.upside,
      downside: t.downside,
      whenStronger: t.balance,
      result: t.whyBothExist,
      evidence: t.evidenceIds.map((id) => v2.evidenceRegistry.find((x) => x.id === id)?.sources[0] ?? "dayMaster"),
    })),
    strengthShadows: v2.strengthShadowPairs.map((s) => ({
      strength: s.strength,
      overuse: s.overuse,
      problem: s.realLifeConsequence,
      balancePoint: s.balance,
      evidence: s.evidenceIds.map((id) => v2.evidenceRegistry.find((x) => x.id === id)?.sources[0] ?? "dayMaster"),
    })),
    actionItems: [
      { domain: "work", what: "완료 조건 먼저 확인", why: "모호한 수정 방지", how: "한 문장 되묻기" },
      { domain: "money", what: "반복 지출만 합산", why: "소액 사각 보완", how: "주 1회 15분" },
      { domain: "relationship", what: "결론 초안 공유", why: "속 결론 오해 방지", how: "하루 안 3줄" },
      { domain: "self", what: "정리 종료 시각 설정", why: "회피성 정리 방지", how: "달력에 시간 입력" },
      { domain: "work", what: "검수 포인트만 위임", why: "과부하 감소", how: "중간 단계 분리" },
      { domain: "money", what: "정산 문장 선공유", why: "관계 비용 스트레스 완화", how: "금액·범위 한 문장" },
      { domain: "relationship", what: "불편함 조기 공유", why: "거리 누적 방지", how: "핵심 2줄" },
      { domain: "self", what: "도움 요청 기준 세팅", why: "책임 과잉 방지", how: "3개 조건 메모" },
    ],
    finalSummary: {
      strengths: ["영역마다 다른 속도를 스스로 조절할 수 있음", "확인 포인트를 놓치지 않는 힘"],
      cautions: ["속 결론 공유 지연", "확인 과사용이 결정 지연으로 번질 수 있음"],
      portraitNarrative: [
        "이 사람을 한 문장으로만 설명하면 결국 놓치는 것이 생깁니다.",
        "판단에서는 수집과 확정의 속도가 다르고, 관계에서는 처음의 조율과 가까워진 뒤의 경계가 다르며, 일과 돈에서는 구조가 선명할수록 강점이 살아납니다.",
        "연애와 스트레스까지 포함해 보면, 같은 ‘확인’도 전부 같은 의미가 아니라 서로 다른 축에서 시작된다는 점이 핵심입니다.",
      ],
      keepItems: ["완료 기준을 먼저 세우는 습관", "설명 가능한 흐름을 선호하는 감각"],
      watchItems: ["속 결론 지연", "위임 늦춤", "소액 반복 사각"],
      useItems: ["결정 종료 시각", "정산 문장", "결론 초안 공유"],
      closingLine: "운의결 한 줄 — 나를 잘 쓰는 법은 모든 걸 더 확인하는 것이 아니라, 무엇을 어디까지 확인할지 설계하는 데 있습니다.",
    },
    shareableInsights: (sections.map((s) => s.shareableLine).filter(Boolean) as string[]).slice(0, 8),
    possibleNextQuestions: nextQuestions,
    evidence,
    disclaimer: USER_FACING_DISCLAIMER,
    scopeNotes: SCOPE,
  };
}
