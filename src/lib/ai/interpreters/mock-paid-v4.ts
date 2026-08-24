import { USER_FACING_DISCLAIMER } from "@/lib/ai/disclaimer";
import { buildMoneyProfileScales } from "@/lib/ai/paid-profile-scales";
import type { PaidFortuneReport, PaidSection } from "@/lib/ai/schemas/paid-report";
import type { FortuneAiContext } from "@/lib/ai/types";

const SCOPE =
  "이 리포트는 출생 명식(四柱)과 오행·십성 분포만 사용합니다. 대운·세운·월별 길흉·특정 시기의 재물운 예언은 포함하지 않습니다.";

function ev(ctx: FortuneAiContext, keys: string[]): string[] {
  return keys.slice(0, 5);
}

/** 경향 + 가능 행동 + 예시 (사실 단정 금지) */
function tendency(
  insight: string,
  examples: string[],
  check?: string
): string[] {
  const lines = [insight];
  if (check) lines.push(check);
  for (const ex of examples) {
    lines.push(`예를 들면, ${ex}`);
  }
  return lines;
}

function dominantElement(ctx: FortuneAiContext): { key: string; label: string; n: number } {
  const fe = ctx.fiveElements;
  const rows = [
    { key: "wood", label: "木", n: fe.wood },
    { key: "fire", label: "火", n: fe.fire },
    { key: "earth", label: "土", n: fe.earth },
    { key: "metal", label: "金", n: fe.metal },
    { key: "water", label: "水", n: fe.water },
  ];
  return [...rows].sort((a, b) => b.n - a.n)[0]!;
}

function buildMoneySections(ctx: FortuneAiContext): PaidSection[] {
  const stem = ctx.dayMaster.stem;
  const dm = ctx.dayMaster.hangul;
  const fe = ctx.fiveElements;
  const dom = dominantElement(ctx);
  const tgM = ctx.tenGods.month.stem;
  const tgY = ctx.tenGods.year.stem;

  return [
    {
      key: "money_v4_structure",
      title: "내 돈의 기본 구조",
      question: "이 명식에서 돈을 볼 때 무엇이 먼저 보이나요?",
      coreInsight: `${stem}(${dm}) 일간과 五行 분포를 함께 보면, 돈은 ‘느낌’보다 ‘정리된 흐름’에 반응하는 쪽으로 읽힙니다.`,
      behaviorScenes: tendency(
        "지출이나 수입 결정에서, 납득할 근거가 생기기 전까지 속도를 늦추는 경향이 있을 수 있습니다.",
        [
          "큰 금액은 비교·검토를 거친 뒤에야 마음이 놓이는 식으로 나타날 수 있습니다.",
          "통장 잔액보다 ‘이번에 허용한 범위’를 먼저 확인하는 편일 수 있습니다.",
        ],
        "이런 패턴이 익숙한지 스스로 확인해보세요."
      ),
      includeWhyBox: true,
      evidenceExplanation: [
        `명식에서 ${stem} 일간은 ${ctx.dayMaster.yinYang === "yang" ? "양" : "음"} ${ctx.dayMaster.element} 기운으로, 경계를 세우는 축으로 봅니다.`,
        `오행 중 ${dom.label}(${dom.n})이 상대적으로 두드러져, ${dom.key === "metal" || dom.key === "earth" ? "정리·검수" : "속도·변화"} 쪽 기운이 돈 다루는 방식에 영향을 줄 수 있습니다.`,
      ],
      evidence: ev(ctx, ["dayMaster", "fiveElements.metal", "fiveElements.earth"]),
      pullQuote: "돈은 감정보다, 정리된 흐름에 반응한다",
    },
    {
      key: "money_v4_earn_spend",
      title: "벌기 vs 쓰기",
      question: "같은 성향이 수입과 지출에서 어떻게 다르게 보일까요?",
      coreInsight: "수입에서는 ‘정당성’, 지출에서는 ‘허용 범위’가 각각 따로 작동하는 경우가 많습니다.",
      behaviorScenes: [
        "【벌 때】산출 기준이 분명한 보상 구조에서 만족감이 올라갈 수 있습니다.",
        "【벌 때】약속만 있고 규칙이 흐린 수입은 불안이 먼저 올 수 있습니다.",
        "【쓸 때】큰 지출은 신중해지고, 작은 반복 지출은 덜 눈에 띌 수 있습니다.",
        "【쓸 때】피로·바쁨이 겹치면 ‘이번만’ 소비가 늘어날 수 있습니다.",
      ],
      strengthSide: "수입: 규칙·검수가 있는 구조 / 지출: 큰돈 방어",
      riskSide: "수입: 모호한 약속 / 지출: 소액 누수·피로 소비",
      evidenceExplanation: [
        `월주 십성 ${tgM}은 ‘어떻게 벌고 관리할지’의 태도와 연결됩니다.`,
        `火${fe.fire}·金${fe.metal} 분포는 추진과 다듬기의 리듬으로, 벌기와 쓰기에서 다른 속도가 나올 수 있습니다.`,
      ],
      evidence: ev(ctx, ["tenGods.month.stem", "fiveElements.fire", "fiveElements.metal"]),
    },
    {
      key: "money_v4_blindspot",
      title: "돈의 사각지대",
      question: "나는 돈에서 무엇을 놓치기 쉬울까요?",
      coreInsight: "세 가지 다른 패턴이 겹치면, ‘돈 관리는 잘한다’는 느낌과 실제 흐름이 어긋날 수 있습니다.",
      behaviorScenes: [
        "① 큰돈은 지키지만, 소액 반복이 합쳐져야 비로소 보일 수 있습니다.",
        "② 검토가 길어지면 ‘안 함’이 편해져, 기회 비용이 생길 수 있습니다.",
        "③ 관계 속 돈은 정이 아니라 ‘분담 문장’이 없을 때 꼬일 수 있습니다.",
      ],
      paradoxNote: "겉으로는 절제형처럼 보여도, 피로·편의 소비에서는 오히려 관대해질 여지가 있습니다.",
      includeWhyBox: true,
      evidenceExplanation: [
        `년주 십성 ${tgY}과 ${stem} 일간의 조합은 ‘책임·경계’가 강할수록 작은 항목을 놓치기 쉬운 구조로 이어질 수 있습니다.`,
      ],
      evidence: ev(ctx, ["tenGods.year.stem", "dayMaster", "fiveElements.fire"]),
      takeaway: "사각지대는 성격 결함이 아니라, 주의가 쏠리는 크기의 문제일 수 있습니다.",
    },
    {
      key: "money_v4_work",
      title: "일·부업과 돈",
      question: "어떤 수입 ‘방식’에서 편하고, 어디서 답답할까요?",
      coreInsight: "직업명이 아니라, 보상이 ‘어떤 구조’로 오는지가 만족도를 가릅니다.",
      behaviorScenes: tendency(
        "반복·검수·마감이 보이는 일에서 돈과 성취가 연결되기 쉬울 수 있습니다.",
        [
          "프로젝트형 수입은 범위·일정이 분명할 때 동기가 살아날 수 있습니다.",
          "사람 상대 영업보다, 혼자 다듬어 재사용 가능한 결과물 쪽에 손이 가기 쉬울 수 있습니다.",
        ]
      ),
      evidenceExplanation: [
        `金${fe.metal}·土${fe.earth} 비중은 ‘완성·정리’와 대가를 연결하려는 경향으로 볼 수 있습니다.`,
      ],
      evidence: ev(ctx, ["fiveElements.metal", "fiveElements.earth", "tenGods.month.stem"]),
    },
    {
      key: "money_v4_people",
      title: "사람과 돈",
      question: "관계 속에서 돈은 어디서 민감해질까요?",
      coreInsight: "거절이 어려워서라기보다, ‘말이 된 분담’이 없을 때 부담이 커질 수 있습니다.",
      behaviorScenes: tendency(
        "공동비용·선물·가족 지출에서, 금액과 범위를 먼저 말로 정리하려는 경향이 있을 수 있습니다.",
        [
          "정산이 ‘나중에’로 미뤄지면 속으로만 불편해질 수 있습니다.",
          "부탁을 받을 때 가능 범위를 먼저 말하는 편이 마음이 편할 수 있습니다.",
        ],
        "최근 비슷한 상황이 있었다면, 어디서 막혔는지 떠올려보세요."
      ),
      evidence: ev(ctx, ["tenGods.day.stem", "pillars.month.branch", "dayMaster"]),
      evidenceExplanation: [
        `일주 지지 ${ctx.pillars.day.branch}와 일간 ${stem}은 관계에서 ‘범위’를 중시하는 패턴으로 연결됩니다.`,
      ],
    },
    {
      key: "money_v4_playbook",
      title: "나의 재물 플레이북",
      question: "지금부터 쓸 수 있는 대응은?",
      coreInsight: "규칙을 많이 두기보다, 자주 반복되는 장면에 맞춘 짧은 대응이 잘 맞습니다.",
      behaviorScenes: [
        "큰 결제를 계속 미루고 있다면 → 기준을 세 가지(필요·대안·한도)로 줄이고, 둘 이상 충족되면 결론을 내립니다. 검토가 길어져 ‘안 함’이 기본값이 되는 것을 막기 위함입니다.",
        "소액 지출이 눈에 안 들어온다면 → 매주 같은 요일에 반복 항목만 합산합니다. 큰돈 레이더는 켜져 있지만 작은 항목은 사각일 수 있기 때문입니다.",
        "공동비용이 애매하다면 → 대화 전에 금액·범위를 한 문장으로 보냅니다. 정이 아니라 분담 문장이 관계 스트레스를 줄일 수 있습니다.",
      ],
      evidenceExplanation: [
        `${stem} 일간의 검수 성향은 ‘규칙을 많이’보다 ‘자주 반복되는 장면’에 맞춘 짧은 대응과 잘 맞습니다.`,
      ],
      evidence: ev(ctx, ["dayMaster", "fiveElements.metal"]),
    },
  ];
}

function buildTotalSections(ctx: FortuneAiContext): PaidSection[] {
  const stem = ctx.dayMaster.stem;
  const fe = ctx.fiveElements;
  const tgM = ctx.tenGods.month.stem;
  const tgY = ctx.tenGods.year.stem;
  const tgD = ctx.tenGods.day.stem;
  const hourNote = ctx.birthTimeUnknown ? null : ctx.tenGods.hour?.stem;

  return [
    {
      key: "total_v4_decision",
      title: "내가 판단하는 방식",
      question: "정보·시간·책임이 겹칠 때 어떻게 움직일까요?",
      coreInsight: "한 가지 속도가 아니라, ‘수집 → 확정’ 두 박자로 나뉘는 경우가 많습니다.",
      behaviorScenes: tendency(
        "중요한 선택일수록 번복을 싫어하고, 충분한 근거가 생긴 뒤에야 속도가 붙을 수 있습니다.",
        [
          "재촉받으면 일단 보류하고 자료를 더 모으는 식으로 나타날 수 있습니다.",
          "결정 후에는 방향 전환보다 세부 수정 쪽을 택하기 쉬울 수 있습니다.",
        ]
      ),
      includeWhyBox: true,
      evidenceExplanation: [
        `${stem} 일간의 ${ctx.dayMaster.yinYang === "yang" ? "양" : "음"} 기질은 ‘확정 전 검토’ 쪽으로 기울 수 있습니다.`,
        `월주 ${tgM}은 판단 절차·책임감과 연결됩니다.`,
      ],
      evidence: ev(ctx, ["dayMaster", "tenGods.month.stem"]),
    },
    {
      key: "total_v4_relationship",
      title: "관계 속의 나",
      question: "처음부터 갈등까지, 거리는 어떻게 변할까요?",
      coreInsight: "처음엔 맞추고, 친해질수록 ‘내 방식’을 분명히 하는 흐름이 보일 수 있습니다.",
      behaviorScenes: [
        "처음: 예의·경청으로 시작할 수 있습니다.",
        "친해짐: 가능 범위를 먼저 말하는 편이 편할 수 있습니다.",
        "부탁: 모호한 ‘알아서’는 부담으로 느껴질 수 있습니다.",
        "갈등: 큰소리보다 말수가 줄고, 정리 후에야 다시 가까워질 수 있습니다.",
        "거리: 서운함을 길게 설명하기보다 간격으로 표현할 수 있습니다.",
      ],
      evidence: ev(ctx, ["tenGods.year.stem", "pillars.year.branch", "dayMaster"]),
      evidenceExplanation: [
        `년주 ${ctx.pillars.year.ganji}와 년간 십성 ${tgY}은 대외 관계의 ‘첫 태도’와 연결됩니다.`,
      ],
    },
    {
      key: "total_v4_work",
      title: "일과 성취",
      question: "어떤 환경에서 강해지고, 어디서 지칠까요?",
      coreInsight: "목표·자율·완료 조건이 보일 때와, 기준 없는 수정이 반복될 때의 차이가 큽니다.",
      behaviorScenes: [
        "잘 맞기 쉬운 환경: 목표가 선명하고, 혼자 구간→합치기 리듬이 있는 경우",
        "지치기 쉬운 환경: ‘느낌상 다시’ 같은 모호한 수정 요청이 반복되는 경우",
        "강점이 살아날 때: 완료 조건을 스스로 정리할 수 있을 때",
        "과해질 때: 모든 단계를 직접 확인하려 들 때",
      ],
      evidence: ev(ctx, ["fiveElements.fire", "fiveElements.metal", "tenGods.month.stem"]),
      evidenceExplanation: [
        `火${fe.fire}·金${fe.metal}은 추진과 검수의 리듬으로, 업무 만족도와 연결됩니다.`,
      ],
    },
    {
      key: "total_v4_money_link",
      title: "돈과 통제",
      question: "돈이 일·관계·통제감과 어떻게 이어질까요?",
      coreInsight: "금액 자체보다 ‘내가 설명·검수할 수 있는 흐름인가’가 만족과 불안을 가릅니다.",
      behaviorScenes: tendency(
        "일의 대가가 흐릴 때, 돈보다 ‘정당성’이 먼저 흔들릴 수 있습니다.",
        [
          "관계 지출은 범위가 없으면 통제감이 약해질 수 있습니다.",
          "재물 전문 리포트가 아닌, 전체 성향과의 ‘연결’만 짚습니다.",
        ]
      ),
      evidence: ev(ctx, ["fiveElements.earth", "dayMaster", "tenGods.day.stem"]),
      evidenceExplanation: [
        `土${fe.earth} 비중과 일주 십성 ${tgD}은 ‘기준·분담’과 돈의 연결점으로 볼 수 있습니다.`,
      ],
    },
    {
      key: "total_v4_love",
      title: "사랑과 거리",
      question: "호감에서 회복까지, 어떤 리듬일까요?",
      coreInsight: "확신 전에는 신중하고, 확신 후에는 챙김이 빨라지는 대비가 보일 수 있습니다.",
      behaviorScenes: [
        "관심: 행동의 일관성으로 마음을 확인하려 할 수 있습니다.",
        "확신 전: 말보다 시간·태도를 더 믿을 수 있습니다.",
        "확신 후: 챙김·실질적 배려가 늘 수 있습니다.",
        "갈등: 감정 폭발보다 정리·거리 조절 쪽일 수 있습니다.",
        "회복: 오해가 풀린 뒤에야 다시 가까워질 수 있습니다.",
      ],
      evidenceExplanation: [
        `일주 지지 ${ctx.pillars.day.branch}와 일간 십성 ${tgD}은 ‘확신 전 신중·이후 챙김’ 리듬과 연결됩니다.`,
      ],
      evidence: ev(ctx, ["pillars.day.branch", "tenGods.day.stem", "dayMaster"]),
    },
    {
      key: "total_v4_stress",
      title: "스트레스와 회복",
      question: "무엇이 쌓이고, 어떻게 풀릴까요?",
      coreInsight: "예측 불가 변수와 미정 결정이 겹치면, 정리·분류로 회복하려 할 수 있습니다.",
      behaviorScenes: [
        "시작: 기준 없는 수정·일정 변경·미룬 공동 결정",
        "처음 반응: 더 정리하고, 확인하려는 쪽",
        "쌓였을 때: 말수 감소·혼자 분류",
        "회복: 정리·기록·우선순위 재배치",
        "조심할 점: 정리가 회피로 길어지면 피로가 남을 수 있습니다.",
      ],
      includeWhyBox: true,
      evidenceExplanation: [
        `월주 ${tgM}의 검증 성향이 과열되면, 회복과 회피가 동시에 나타날 수 있습니다.`,
        hourNote ? `시주 십성 ${hourNote}은 습관·리듬과 스트레스 반응에 보조 근거가 됩니다.` : "시주 미상 — 시주 십성은 사용하지 않았습니다.",
      ],
      evidence: ev(ctx, [
        "tenGods.month.stem",
        ...(ctx.birthTimeUnknown ? [] : ["tenGods.hour.stem"]),
      ]),
    },
    {
      key: "total_v4_paradox",
      title: "나의 모순",
      question: "겉과 속이 다른 지점은?",
      coreInsight: "모순은 결함이 아니라, 같은 기질이 다른 상황에서 다르게 보이는 것일 수 있습니다.",
      behaviorScenes: [
        "경청하는 것 같지만, 결론은 혼자 정리하는 경우가 있을 수 있습니다.",
        "책임감 있게 맡지만, 도움 요청은 늦어질 수 있습니다.",
      ],
      paradoxNote: "상대는 ‘합의했다’고 느끼지만, 본인은 ‘아직 정리 중’일 수 있습니다.",
      evidence: ev(ctx, ["tenGods.year.stem", "tenGods.month.stem"]),
      includeWhyBox: true,
      evidenceExplanation: [
        `년·월 십성 ${tgY} / ${tgM}의 조합은 ‘외부 조율 + 내부 확정’ 이중 절차로 읽힙니다.`,
      ],
    },
    {
      key: "total_v4_shadow",
      title: "강점의 그림자",
      question: "잘하는 것이 과해지면?",
      coreInsight: "강점은 줄이기보다, ‘어디까지 맡길지’를 정할 때 균형이 옵니다.",
      behaviorScenes: [
        "끝까지 확인 → 모든 단계 직접 검수 → 위임 지연",
        "기준 선명 → 기준 미달에 과민 → 협업 마찰",
        "경청 → 속 결론 공유 지연 → 오해·거리",
      ],
      evidenceExplanation: [
        `金${fe.metal}·${stem} 일간은 ‘완성·기준’이 강할수록 그림자(과잉·지연)도 함께 드러날 수 있습니다.`,
      ],
      evidence: ev(ctx, ["fiveElements.metal", "dayMaster"]),
    },
    {
      key: "total_v4_playbook",
      title: "개인 플레이북",
      question: "일·돈·관계·자기관리에서 지금 쓸 수 있는 것",
      coreInsight: "많은 조언보다, 자주 반복되는 장면에 맞춘 짧은 대응이 낫습니다.",
      behaviorScenes: [
        "【일】수정 요청이 모호할 때 → ‘완료 조건’을 한 문장으로 되물어봅니다.",
        "【돈】소액이 합쳐져야 보일 때 → 반복 항목만 주 1회 합산합니다.",
        "【관계】경청 후 오해가 생길 때 → 하루 안에 결론 초안을 짧게 공유합니다.",
        "【자기】보류가 길어질 때 → 만료일을 달력에 적습니다.",
      ],
      evidenceExplanation: [
        `월주 ${tgM}의 ‘절차·확정’ 성향을 일·돈·관계·자기관리에 각각 짧게 적용한 대응입니다.`,
      ],
      evidence: ev(ctx, ["dayMaster", "tenGods.month.stem"]),
    },
  ];
}

export function buildMockPaidResultV4(
  ctx: FortuneAiContext,
  productName: string,
  options?: { productSlug?: string }
): PaidFortuneReport {
  const dm = ctx.dayMaster.hangul;
  const stem = ctx.dayMaster.stem;
  const fe = ctx.fiveElements;
  const dom = dominantElement(ctx);
  const slug = options?.productSlug ?? "";
  const kind = /money/i.test(slug) ? "money" : /total/i.test(slug) ? "total" : "generic";
  if (kind !== "money" && kind !== "total") {
    throw new Error("V4 mock supports money/total only");
  }

  const snap = [
    { key: "wood" as const, label: "木", count: fe.wood },
    { key: "fire" as const, label: "火", count: fe.fire },
    { key: "earth" as const, label: "土", count: fe.earth },
    { key: "metal" as const, label: "金", count: fe.metal },
    { key: "water" as const, label: "水", count: fe.water },
  ];

  const scales = buildMoneyProfileScales(ctx).slice(0, 3);

  if (kind === "money") {
    const sections = buildMoneySections(ctx);
    return {
      title: `${productName} · 재물 사용설명서`,
      reportVersion: "v4",
      reportKind: "money",
      signatureStatement: `이 사주에서 돈을 볼 때, ${stem}(${dm})과 ${dom.label} 기운이 먼저 겹칩니다.`,
      executiveSummary:
        `${stem} 일간 중심의 재물 성향 분석입니다. 시기 예언 없이, 돈을 대하는 구조·사각지대·관계 속 패턴을 짚습니다.`,
      profileDashboard: [
        { label: "돈을 움직이는 기준", value: "근거·범위가 서야 움직임" },
        { label: "돈을 지키는 방식", value: "큰 흐름 검수·작은 항목 주의" },
        { label: "수입에서 편한 구조", value: "규칙·마감·산출이 보이는 보상" },
        { label: "돈 판단의 약점", value: "과검토·소액 사각·분담 미정" },
        { label: "사람과 돈 경계", value: "금액·범위를 먼저 말하기" },
      ],
      profileScales: scales,
      fiveElementsSnapshot: snap,
      keywords: ["흐름", "검수", "사각", "분담", "구조"],
      sections,
      actionItems: [
        { domain: "money", what: "반복 지출 주 1회 합산", why: "소액 사각", how: "15분 루틴" },
        { domain: "money", what: "큰 결제 기준 3줄", why: "과검토 완화", how: "필요·대안·한도" },
        { domain: "self", what: "공동비용 선공유", why: "분담 미정", how: "대화 전 한 문장" },
        { domain: "money", what: "검수 가능 수입 선택", why: "정당성", how: "범위·마감 확인" },
        { domain: "self", what: "보류 만료일", why: "결정 지연", how: "달력 D-day" },
      ],
      finalSummary: {
        strengths: ["큰 흐름을 지키려는 태도", "규칙 있는 수입에서 안정"],
        cautions: ["소액 반복 누수", "과검토·분담 미정"],
        portraitNarrative: [
          `${dm}님의 돈 성향은 ‘많이 버는 타입’보다 ‘흐름을 설명할 수 있는 타입’에 가깝게 읽힙니다.`,
          "벌 때는 정당성, 쓸 때는 허용 범위가 각각 따로 작동할 수 있습니다.",
          "사각지대는 성격이 아니라 주의가 쏠리는 크기의 문제일 수 있습니다.",
        ],
        keepItems: ["큰 지출 전 짧은 기준", "검수 가능한 수입 구조"],
        watchItems: ["소액 반복", "관계 속 분담 미정"],
        useItems: ["주 1회 반복 항목 합산", "공동비용 선공유"],
        closingLine: `운의결 — ${dm}님의 돈은 ‘확인하는 손’이 설계되어 있을 때 가장 안전합니다.`,
      },
      evidence: ev(ctx, ["dayMaster", "fiveElements.metal", "tenGods.month.stem"]),
      disclaimer: USER_FACING_DISCLAIMER,
      scopeNotes: SCOPE,
    };
  }

  const sections = buildTotalSections(ctx);
  return {
    title: `${productName} · 사주 사용설명서`,
    reportVersion: "v4",
    reportKind: "total",
    signatureStatement: `${stem}(${dm}) — ${dom.label} 기운과 ${ctx.tenGods.month.stem}이 만드는 ‘확인 후 추진’의 리듬`,
    executiveSummary:
      "한 사람의 판단·관계·일·돈·사랑·스트레스를 명식 축별로 연결한 개인 분석서입니다. 시기 예언은 포함하지 않습니다.",
    profileDashboard: [
      { label: "판단", value: "수집 → 확정 두 박자" },
      { label: "관계", value: "맞춤 후 범위 선언" },
      { label: "일", value: "완료 조건·자율 구간" },
      { label: "돈", value: "설명 가능한 흐름" },
      { label: "사랑", value: "확신 전 신중·이후 챙김" },
      { label: "스트레스", value: "정리·분류로 회복" },
      { label: "가장 큰 강점", value: "끝까지 확인하는 힘" },
      { label: "쉽게 꼬이는 지점", value: "속 결론 공유 지연" },
    ],
    fiveElementsSnapshot: snap,
    keywords: ["명식", "리듬", "모순", "균형", "연결"],
    blueprint: {
      dayMasterTerm: `${stem} (${dm})`,
      dayMasterPlain: `${ctx.dayMaster.yinYang === "yang" ? "양" : "음"} ${ctx.dayMaster.element} 일간`,
      fiveElementsNote: `木${fe.wood} 火${fe.fire} 土${fe.earth} 金${fe.metal} 水${fe.water}`,
      tenGodsNote: `월 ${ctx.tenGods.month.stem} · 년 ${ctx.tenGods.year.stem}`,
      structurePlain: `상대적으로 ${dom.label}(${dom.n}) 기운이 두드러짐`,
      lifePlain: "명식 축마다 다른 십성·오행 근거로 영역을 나눴습니다",
    },
    sections,
    contradictions: [
      {
        poleA: "겉: 경청·조율",
        poleB: "속: 내부 확정",
        howItShows: "자리에서는 듣지만, 결론은 혼자 정리할 수 있습니다.",
        upside: "충동 합의를 줄일 수 있습니다.",
        downside: "상대는 ‘이미 정했다’고 느낄 수 있습니다.",
        whenStronger: "공동 결정·비용·업무 방향",
        result: "합의한 것 같지만 본인은 정리 중일 수 있습니다.",
        evidence: ev(ctx, ["tenGods.year.stem", "tenGods.month.stem"]),
      },
      {
        poleA: "겉: 책임·완성",
        poleB: "속: 위임 지연",
        howItShows: "맡은 일을 끝까지 가져가며 중간 공유가 늦을 수 있습니다.",
        upside: "신뢰가 쌓일 수 있습니다.",
        downside: "과부하·시간 잠식",
        whenStronger: "완성도 기준이 높을 때",
        result: "주변은 믿지만 본인 업무가 늘 수 있습니다.",
        evidence: ev(ctx, ["fiveElements.metal", "dayMaster"]),
      },
    ],
    strengthShadows: [
      {
        strength: "끝까지 확인",
        overuse: "모든 단계 직접 검수",
        problem: "위임 지연",
        balancePoint: "최종 확인만 본인, 중간은 위임",
        evidence: ev(ctx, ["dayMaster"]),
      },
      {
        strength: "기준 선명",
        overuse: "기준 미달에 과민",
        problem: "협업 마찰",
        balancePoint: "완료 조건만 공유",
        evidence: ev(ctx, ["fiveElements.metal"]),
      },
      {
        strength: "경청",
        overuse: "속 결론 늦게 공유",
        problem: "오해·거리",
        balancePoint: "하루 안 결론 초안 공유",
        evidence: ev(ctx, ["tenGods.month.stem"]),
      },
    ],
    actionItems: [
      { domain: "work", what: "완료 조건 되물음", why: "모호한 수정", how: "한 문장 확인" },
      { domain: "work", what: "위임 1건/주", why: "과부하", how: "검수 포인트만" },
      { domain: "money", what: "소액 합산", why: "누수", how: "주 1회" },
      { domain: "relationship", what: "결론 초안 공유", why: "오해", how: "하루 안" },
      { domain: "self", what: "보류 만료일", why: "과검토", how: "달력" },
      { domain: "relationship", what: "범위 한 문장", why: "부탁", how: "가능/불가" },
      { domain: "self", what: "회복 시간 상한", why: "회피성 정리", how: "25분" },
      { domain: "money", what: "돈·일 연결 점검", why: "정당성", how: "월 1회" },
    ],
    finalSummary: {
      strengths: ["확인 후 추진", "선명한 목표에서 실행"],
      cautions: ["위임 지연", "속 결론 공유 지연"],
      portraitNarrative: [
        `${dm}님은 한 가지 성향이 모든 영역에 똑같이 보이기보다, 상황마다 다른 속도로 나타날 수 있습니다.`,
        "판단·관계·일·돈·사랑·스트레스는 ‘확인’이라는 공통 리듬으로 이어지지만, 각각 다른 근거에서 출발합니다.",
        "모순은 결함이 아니라, 같은 기질의 두 면일 수 있습니다.",
      ],
      keepItems: ["결정 전 짧은 기준", "완료 조건이 보이는 일"],
      watchItems: ["과검토·보류", "속 결론 미공유"],
      useItems: ["위임 1건/주", "공동 결정 시 결론 공유 시점"],
      closingLine: `運의結 — ${dm}님을 잘 쓰는 법은 ‘혼자 다 확인’이 아니라 ‘확인 포인트를 설계’하는 일입니다.`,
    },
    evidence: ev(ctx, ["dayMaster", "tenGods.month.stem", "tenGods.year.stem"]),
    disclaimer: USER_FACING_DISCLAIMER,
    scopeNotes: SCOPE,
  };
}
