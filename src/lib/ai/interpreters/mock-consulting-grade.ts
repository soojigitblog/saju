/**
 * Consulting-grade enrichment over mock-paid-deep.
 * Easy Value path stays untouched; only consulting PDF consumes this.
 */
import type {
  PaidFortuneReport,
  PaidSection,
  PaidContradiction,
  PaidStrengthShadow,
  PaidActionItem,
} from "@/lib/ai/schemas/paid-report";
import { paidFortuneReportStrictSchema } from "@/lib/ai/schemas/paid-report";

type ChainStep = { label: string; text: string };

function withDepth(
  s: PaidSection,
  patch: Partial<PaidSection> & {
    discoveryLevel: 1 | 2 | 3;
    whyDeeper: string;
  }
): PaidSection {
  return { ...s, ...patch };
}

function moneyEnrich(report: PaidFortuneReport): PaidFortuneReport {
  const byKey = (k: string) => report.sections.find((s) => s.key === k)!;
  const sections = report.sections.map((s) => {
    if (s.key === "money_v4_structure") {
      return withDepth(s, {
        discoveryLevel: 3,
        whyDeeper:
          "큰 지출에서는 ‘허용 범위’를 먼저 정하려 하고, 작은 반복에서는 ‘나중에 보면 되겠지’가 쉽게 열립니다. 그래서 큰돈은 막히는데 한 달 뒤 통장에서는 작은 구멍들이 먼저 눈에 띕니다.",
        reactionChain: [
          { label: "TRIGGER", text: "큰 결정과 작은 반복이 같은 주에 섞임" },
          { label: "FIRST", text: "큰 항목부터 허용 범위를 적어 둠" },
          { label: "INTERNAL", text: "소액은 ‘예외’로 남겨 두고 판단 보류" },
          { label: "VISIBLE", text: "큰돈은 신중, 소액은 빠르게 지나감" },
          { label: "OTHERS", text: "주변은 ‘아끼는 사람’으로만 읽기 쉬움" },
          { label: "RESULT", text: "실제 누수는 작은 반복에서 커질 수 있음" },
        ] satisfies ChainStep[],
        selfInterpretation: "나는 큰 손해를 막는 쪽으로 판단한다고 느낌",
        outsideInterpretation: "상대는 그냥 돈을 아끼거나 까다롭다고 느낄 수 있음",
        selfMisread:
          "‘나는 원래 꼼꼼한 사람’이라고만 보면, 작은 반복을 늦게 보는 구조를 놓칠 수 있음",
        counterPattern:
          "끝나는 날짜와 한도가 정해진 소액 항목에서는 오히려 큰돈보다 쉽게 유지될 수 있습니다.",
      });
    }
    if (s.key === "money_v4_earn_spend") {
      return withDepth(s, {
        discoveryLevel: 3,
        whyDeeper:
          "벌 때는 ‘설명이 되는 대가’를, 쓸 때는 ‘허용 가능한 범위’를 먼저 봅니다. 같은 신중함이라도 장면이 바뀌면 속도가 갈라집니다.",
        reactionChain: [
          { label: "TRIGGER", text: "수입·지출 결정을 같은 기준으로 묶으려 함" },
          { label: "FIRST", text: "벌기는 정당성, 쓰기는 한도부터 확인" },
          { label: "INTERNAL", text: "두 기준이 충돌하면 결정을 미룸" },
          { label: "VISIBLE", text: "어떤 날은 빠르고 어떤 날은 유난히 느림" },
          { label: "OTHERS", text: "일관성 없는 사람으로 보일 수 있음" },
          { label: "RESULT", text: "미루는 동안 찜찜함과 기회비용이 쌓임" },
        ],
        selfInterpretation: "나는 상황에 맞게 신중히 고른다고 느낌",
        outsideInterpretation: "상대는 기준이 왔다 갔다 한다고 느낄 수 있음",
        selfMisread: "‘우유부단하다’고 자책하지만, 실제로는 벌기/쓰기의 종료 조건이 다를 수 있음",
      });
    }
    if (s.key === "money_v4_blindspot") {
      return withDepth(s, {
        discoveryLevel: 3,
        whyDeeper:
          "결정을 미룰수록 금액보다 ‘찜찜함’이 먼저 커집니다. 정보를 더 모으는 동안에도 작은 반복 지출은 계속 흘러갑니다.",
        reactionChain: [
          { label: "TRIGGER", text: "선택이 여러 개고 끝이 안 보임" },
          { label: "FIRST", text: "비교·검색·의견 수집이 늘어남" },
          { label: "INTERNAL", text: "종료 기준이 없어 확정이 미뤄짐" },
          { label: "VISIBLE", text: "큰 결정은 안 하고 소액만 움직임" },
          { label: "OTHERS", text: "결정을 못하는 사람으로 보일 수 있음" },
          { label: "RESULT", text: "본인은 신중, 장부는 구멍이 남음" },
        ],
        selfInterpretation: "나는 더 좋은 답을 찾는 중이라고 느낌",
        outsideInterpretation: "상대는 시간을 끌거나 책임을 피한다고 느낄 수 있음",
        selfMisread: "‘정보가 부족해서’라고만 보면, 종료 기준 부재가 원인인 경우를 놓침",
      });
    }
    if (s.key === "money_v4_work") {
      return withDepth(s, {
        discoveryLevel: 3,
        whyDeeper:
          "수입 만족은 직업명보다 ‘결과와 대가가 설명되는지’에서 갈립니다. 능력보다 환경 선명도가 강점을 켜고 끕니다.",
        reactionChain: [
          { label: "TRIGGER", text: "보상·역할 설명이 흐림" },
          { label: "FIRST", text: "일을 더 해서 증명하려 함" },
          { label: "INTERNAL", text: "기준이 없어 확인 노동이 늘음" },
          { label: "VISIBLE", text: "성실한데 불만이 커짐" },
          { label: "OTHERS", text: "욕심이 많다/불평이 많다고 오해" },
          { label: "RESULT", text: "수입보다 피로가 먼저 커질 수 있음" },
        ],
        selfInterpretation: "나는 제대로 된 대가를 원할 뿐이라고 느낌",
        outsideInterpretation: "조직은 예민하거나 까다롭다고 읽을 수 있음",
        selfMisread: "‘돈을 밝힌다’고 스스로를 탓하면, 구조 설명 욕구를 놓침",
      });
    }
    if (s.key === "money_v4_people") {
      return withDepth(s, {
        discoveryLevel: 3,
        whyDeeper:
          "가까운 사람과 돈이 섞이면 ‘말이 된 분담’이 없을 때 예민해집니다. 인색함보다 정산 문장의 부재가 갈등을 키웁니다.",
        reactionChain: [
          { label: "TRIGGER", text: "비용·분담이 말로만 흘러감" },
          { label: "FIRST", text: "일단 맞춰 주며 불편을 삼킴" },
          { label: "INTERNAL", text: "속으로 기준을 정리하기 시작" },
          { label: "VISIBLE", text: "어느 순간 갑자기 단호해짐" },
          { label: "OTHERS", text: "갑자기 변했다고 느낄 수 있음" },
          { label: "RESULT", text: "관계와 돈이 한 번에 꼬일 수 있음" },
        ],
        selfInterpretation: "나는 공정함을 지키려 한다고 느낌",
        outsideInterpretation: "상대는 인색하거나 계산적이라고 느낄 수 있음",
        selfMisread: "‘정이 없다’고 자책하면, 필요한 건 정이 아니라 분담 문장일 수 있음",
      });
    }
    if (s.key === "money_v4_playbook") {
      return withDepth(s, {
        discoveryLevel: 2,
        whyDeeper:
          "돈 관리는 의지 구호보다, 자주 반복되는 장면에 맞는 짧은 규칙이 있을 때 오래 갑니다.",
        selfInterpretation: "나는 규칙을 싫어하는 게 아니라 끝이 없는 규칙을 싫어함",
        outsideInterpretation: "주변은 ‘작심삼일’로만 기억할 수 있음",
        selfMisread: "‘의지가 약하다’고만 보면, 종료 조건 없는 목표 설계를 반복함",
      });
    }
    return s;
  });

  const contradictions: PaidContradiction[] = [
    {
      poleA: "큰돈 신중",
      poleB: "소액 방치",
      howItShows:
        "큰 지출은 허용 범위를 세우는데, 작은 반복은 ‘예외’로 남겨 한 달 뒤 구멍이 됩니다.",
      upside: "치명적 손해를 막는 힘이 큼",
      downside: "누수의 실체는 소액에서 커질 수 있음",
      whenStronger: "바쁘고 피곤한 주에 소액 예외가 늘 때",
      result: "주변은 ‘아끼는 사람’으로만 보고, 본인은 ‘왜 돈이 안 모이지?’로 자책하기 쉬움",
      evidence: byKey("money_v4_structure").evidence,
    },
    {
      poleA: "설명 가능한 대가",
      poleB: "결정 지연",
      howItShows:
        "정당성이 보이는 수입에는 힘이 붙지만, 종료 기준이 없는 선택에서는 검토가 길어집니다.",
      upside: "대가가 선명한 곳에서 만족이 큼",
      downside: "미루는 동안 기회와 소액 누수가 함께 쌓임",
      whenStronger: "선택지가 많고 마감이 없을 때",
      result: "타인은 우유부단, 본인은 신중으로 서로 다른 해석이 남음",
      evidence: byKey("money_v4_blindspot").evidence,
    },
  ];

  const strengthShadows: PaidStrengthShadow[] = [
    {
      strength: "큰 손해 차단",
      overuse: "정보가 더 필요하다고만 느낌",
      problem: "종료 기준이 없어 결정이 밀림",
      balancePoint: "허용 범위 3줄만 적고 소액 예외 날짜를 정함",
      evidence: byKey("money_v4_structure").evidence.slice(0, 3),
    },
    {
      strength: "설명 가능한 흐름 선호",
      overuse: "모든 항목을 같은 밀도로 확인",
      problem: "확인 피로가 소비·관계를 경직시킴",
      balancePoint: "큰돈/소액/관계비용의 확인 밀도를 나눔",
      evidence: byKey("money_v4_earn_spend").evidence.slice(0, 3),
    },
  ];

  const actionItems: PaidActionItem[] = [
    {
      domain: "money",
      when: "결정을 사흘 이상 미루고 있다면",
      what: "정보를 더 찾기 전에 결정 기준 3개만 적습니다",
      why: "정보 부족보다 종료 기준이 없을 때 확인이 길어지기 쉽습니다",
      how: "‘금액 한도 / 필요 이유 / 오늘 결정해도 되는 조건’ 세 줄",
    },
    {
      domain: "money",
      when: "피곤한 날 소액이 예외처럼 늘면",
      what: "예외 항목에 끝나는 날짜를 붙입니다",
      why: "이 구조는 큰돈보다 작은 반복을 늦게 보기 쉽습니다",
      how: "‘이번 주까지만’ 한 줄을 결제 메모에 남김",
    },
    {
      domain: "money",
      when: "가까운 사람과 비용이 섞일 때",
      what: "정이 아니라 분담 문장부터 말합니다",
      why: "예민함은 인색함보다 말이 된 분담이 없을 때 커집니다",
      how: "‘이번엔 A/B로 나누자’ 한 문장을 대화 초반에",
    },
    {
      domain: "money",
      when: "수입 구조가 말로만 약속될 때",
      what: "결과·대가 연결을 숫자로 확인합니다",
      why: "만족도는 직업명보다 설명이 되는 흐름에서 갈립니다",
      how: "주간 결과 1줄 + 대가 기준 1줄을 같은 노트에",
    },
    {
      domain: "money",
      when: "한 달 뒤 장부가 허무하게 느껴질 때",
      what: "큰돈 목록이 아니라 반복 5개를 먼저 봅니다",
      why: "강점(큰 손해 차단)이 소액 시야를 가릴 수 있습니다",
      how: "구독·배달·이동·간식·소액이체만 표시",
    },
  ];

  return {
    ...report,
    sections,
    contradictions,
    strengthShadows,
    actionItems,
    shareableInsights: [
      "큰돈은 막는데, 작은 반복은 늦게 보일 수 있다.",
      "결정을 미룰수록 금액보다 찜찜함이 먼저 커질 수 있다.",
      "인색해서가 아니라, 말이 된 분담이 없을 때 더 예민해질 수 있다.",
    ],
  };
}

function careerEnrich(report: PaidFortuneReport): PaidFortuneReport {
  const byKey = (k: string) => report.sections.find((s) => s.key === k)!;
  const patchKeys: Record<string, Partial<PaidSection> & { discoveryLevel: 1 | 2 | 3; whyDeeper: string }> = {
    career_strength_work: {
      discoveryLevel: 3,
      whyDeeper:
        "끝이 보이는 일에서 힘이 붙습니다. 애매한 업무를 맡으면 질문이 늘고, 답이 부족하면 직접 구조를 다시 만든 뒤 마지막 확인까지 본인이 쥐게 될 수 있습니다.",
      reactionChain: [
        { label: "TRIGGER", text: "범위·완료 조건이 흐린 요청" },
        { label: "FIRST", text: "질문이 늘고 자료를 모음" },
        { label: "INTERNAL", text: "혼자 완료 기준을 다시 설계" },
        { label: "VISIBLE", text: "본인이 더 많이 맡음" },
        { label: "OTHERS", text: "까다롭거나 느리다고 느낄 수 있음" },
        { label: "RESULT", text: "능력 부족이 아니라 ‘내가 다 해야 편한 구조’로 과부하" },
      ],
      selfInterpretation: "나는 제대로 끝내려는 중이라고 느낌",
      outsideInterpretation: "상사는 속도가 느리거나 질문이 많다고 느낄 수 있음",
      selfMisread: "‘적응력 부족’으로 보이지만, 실제로는 완료 조건이 없어 시작 에너지가 큼",
      counterPattern: "중간에 확인할 시점과 완료 조건이 있으면 생각보다 빠르게 착수할 수 있습니다.",
    },
    career_character: {
      discoveryLevel: 3,
      whyDeeper:
        "시작이 느린 것은 게으름보다, 기준을 세우는 시간이 필요해서일 수 있습니다. 첫 결과물이 보이면 그다음부터 속도가 붙습니다.",
      reactionChain: [
        { label: "TRIGGER", text: "새 업무 / 새 팀" },
        { label: "FIRST", text: "범위·완료 조건을 확인" },
        { label: "INTERNAL", text: "템플릿이 생길 때까지 손대기 보류" },
        { label: "VISIBLE", text: "초반은 질문, 중반은 가속" },
        { label: "OTHERS", text: "적응이 느리다고 오해" },
        { label: "RESULT", text: "기준이 잡히면 꾸준함이 오래감" },
      ],
      selfInterpretation: "나는 준비하는 중이라고 느낌",
      outsideInterpretation: "동료는 소극적이라고 느낄 수 있음",
      selfMisread: "‘게으르다’고 자책하면, 필요한 기준 세우기 시간을 빼앗기기 쉬움",
    },
    career_org_friction: {
      discoveryLevel: 3,
      whyDeeper:
        "어떤 상사 아래에서는 잘하고, 어떤 아래에서는 급격히 지칩니다. 사람은 싫어서가 아니라 기준 없는 수정이 반복될 때 에너지가 빠집니다.",
      reactionChain: [
        { label: "TRIGGER", text: "‘느낌상 다시’ 요청 반복" },
        { label: "FIRST", text: "수정본을 더 만듦" },
        { label: "INTERNAL", text: "완료 기준을 혼자 추측" },
        { label: "VISIBLE", text: "성실한데 표정·말수가 굳음" },
        { label: "OTHERS", text: "불만이 많다 / 까다롭다고 오해" },
        { label: "RESULT", text: "일 혐오처럼 느껴지나 실제는 구조 마찰" },
      ],
      selfInterpretation: "나는 제대로 맞추려 한다고 느낌",
      outsideInterpretation: "상사는 질문이 많거나 속도가 느리다고 느낄 수 있음",
      selfMisread: "‘사회성이 부족하다’고 보면, 필요한 건 완료 조건을 같이 적는 상사일 수 있음",
    },
    career_overload: {
      discoveryLevel: 3,
      whyDeeper:
        "책임감이 과부하로 바뀌는 순간은 ‘내가 하면 빠르니까’가 반복될 때입니다. 확인과 책임을 스스로 더 붙들수록 일이 싫어질 수 있습니다.",
      reactionChain: [
        { label: "TRIGGER", text: "역할이 비거나 기준이 흐림" },
        { label: "FIRST", text: "빈자리를 메움" },
        { label: "INTERNAL", text: "위임 시점을 미룸" },
        { label: "VISIBLE", text: "야근·검수가 본인에게 모임" },
        { label: "OTHERS", text: "일을 잘하니 더 맡기면 된다고 느낌" },
        { label: "RESULT", text: "강점이 그림자가 되어 이탈 신호" },
      ],
      selfInterpretation: "나는 책임을 다하는 중이라고 느낌",
      outsideInterpretation: "팀은 ‘다 해주는 사람’으로 고정하기 쉬움",
      selfMisread: "‘일을 못 해서 지친다’가 아니라 ‘설명되지 않는 구조에서 힘이 샌다’에 가까움",
    },
    career_conflict: {
      discoveryLevel: 3,
      whyDeeper:
        "갈등 초반에는 말수가 줄고 정리합니다. 겉에서는 동의해 보이지만, 속에서는 기준을 모으는 중입니다.",
      reactionChain: [
        { label: "TRIGGER", text: "회의에서 기준이 충돌" },
        { label: "FIRST", text: "자리에서는 들음" },
        { label: "INTERNAL", text: "나중에 결론을 정리" },
        { label: "VISIBLE", text: "문장이 짧아지고 경계가 선명해짐" },
        { label: "OTHERS", text: "갑자기 태도가 바뀌었다고 느낌" },
        { label: "RESULT", text: "침묵≠동의, 정리 중일 수 있음" },
      ],
      selfInterpretation: "나는 싸우지 않고 정리하려 함",
      outsideInterpretation: "상대는 무관심하거나 이미 멀어졌다고 느낄 수 있음",
      selfMisread: "‘갈등을 피한다’고만 보면, 실제로는 내부 확정 후 말하는 리듬일 수 있음",
    },
    career_recognition: {
      discoveryLevel: 2,
      whyDeeper:
        "인정은 열정 연출보다 결과가 흔들리지 않는다는 안정감에서 기억되기 쉽습니다.",
      selfInterpretation: "나는 티내지 않아도 실력이 보이길 바람",
      outsideInterpretation: "리더십이 약해 보일 수 있음",
      selfMisread: "‘어필을 못 한다’가 아니라, 원하는 피드백 형태가 결과 신뢰 쪽일 수 있음",
    },
  };

  const sections = report.sections.map((s) =>
    patchKeys[s.key] ? withDepth(s, patchKeys[s.key]!) : s
  );

  const contradictions: PaidContradiction[] = [
    {
      poleA: "완료 조건 집착",
      poleB: "시작 지연",
      howItShows: "끝이 보이면 강해지고, 끝이 없으면 질문과 자료 모으기가 먼저입니다.",
      upside: "품질과 꾸준함이 오래감",
      downside: "초반이 느려 보여 오해받기 쉬움",
      whenStronger: "새 업무·모호한 지시가 겹칠 때",
      result: "타인은 적응력 부족, 본인은 기준 세우기 중으로 해석이 갈림",
      evidence: byKey("career_strength_work").evidence,
    },
    {
      poleA: "성실한 떠맡음",
      poleB: "갑작스런 이탈 신호",
      howItShows: "빈자리를 메우다 ‘내가 하면 빠르니까’가 반복되면 어느 날 일이 싫어질 수 있습니다.",
      upside: "팀이 흔들릴 때 수습력이 큼",
      downside: "과부하가 일 혐오로 오인됨",
      whenStronger: "역할만 늘고 인정·보상이 안 보일 때",
      result: "주변은 갑자기 변했다고 느끼고, 본인은 구조가 안 맞는다고 느낌",
      evidence: byKey("career_overload").evidence,
    },
  ];

  const strengthShadows: PaidStrengthShadow[] = [
    {
      strength: "끝까지 확인",
      overuse: "위임 지연",
      problem: "검수가 본인에게만 모임",
      balancePoint: "중간 확인 시점 1개를 먼저 합의",
      evidence: byKey("career_overload").evidence.slice(0, 3),
    },
    {
      strength: "기준 설계",
      overuse: "질문이 과다해 보임",
      problem: "초반 속도 오해",
      balancePoint: "질문 3개를 ‘완료 조건 확인’으로 묶어 말함",
      evidence: byKey("career_character").evidence.slice(0, 3),
    },
    {
      strength: "수습력",
      overuse: "빈자리 자동 점유",
      problem: "역할 경계 소실",
      balancePoint: "맡기 전에 ‘어디까지’ 한 문장",
      evidence: byKey("career_org_friction").evidence.slice(0, 3),
    },
  ];

  const actionItems: PaidActionItem[] = [
    {
      domain: "work",
      when: "애매한 업무를 받으면",
      what: "착수 전에 완료 조건 한 문장을 되묻습니다",
      why: "질문이 많은 건 관심이 없어서가 아니라 기준을 찾는 과정일 수 있음",
      how: "‘이 결과물이 끝인 기준이 뭔가요?’ 한 줄",
    },
    {
      domain: "work",
      when: "‘알아서 해’만 반복되면",
      what: "중간 확인 시점을 제안합니다",
      why: "기준 없는 수정이 반복되면 일보다 과정이 먼저 피곤해짐",
      how: "초안 공유 날짜 1개를 일정에 박음",
    },
    {
      domain: "work",
      when: "빈자리가 생겨 떠안게 되면",
      what: "맡기 전에 범위 한 줄을 적습니다",
      why: "성실함이 과부하로 바뀌는 지점을 미리 끊어야 함",
      how: "‘이번 주까지 / 이 산출물까지’ 명시",
    },
    {
      domain: "work",
      when: "일이 싫다는 생각이 들면",
      what: "일 자체와 환경(기준·보상·역할)을 나눕니다",
      why: "환경 마찰을 일 혐오로 오인하면 잘못된 이동을 고름",
      how: "세 칸: 일 / 지시 방식 / 인정·보상",
    },
    {
      domain: "work",
      when: "회의에서 침묵이 길어지면",
      what: "‘지금은 정리 중’이라고 한 번 말합니다",
      why: "침묵이 동의로 읽히면 나중에 단호함이 갑작스러워 보임",
      how: "‘오늘 중으로 기준 정리해 공유할게요’",
    },
  ];

  return {
    ...report,
    sections,
    contradictions,
    strengthShadows,
    actionItems,
    shareableInsights: [
      "일을 못 해서 지치는 게 아니라, 설명되지 않는 구조에서 힘이 샐 수 있다.",
      "질문이 많아지는 건 기준을 찾는 과정일 수 있다.",
      "조용히 듣는 건 동의가 아니라 정리 중일 수 있다.",
    ],
    finalSummary: {
      ...report.finalSummary,
      closingLine:
        "일을 못 해서 지치는 것이 아니라, 설명되지 않는 구조에서 힘이 새는 쪽에 가깝습니다.",
    },
  };
}

function loveEnrich(report: PaidFortuneReport): PaidFortuneReport {
  const byKey = (k: string) => report.sections.find((s) => s.key === k)!;
  const patchKeys: Record<string, Partial<PaidSection> & { discoveryLevel: 1 | 2 | 3; whyDeeper: string }> = {
    love_before: {
      discoveryLevel: 3,
      whyDeeper:
        "호감과 확신은 같은 속도로 움직이지 않습니다. 확신이 생기기 전에는 표현 속도를 조절하고, 관찰이 먼저입니다.",
      reactionChain: [
        { label: "TRIGGER", text: "호감은 있는데 관계가 정의되지 않음" },
        { label: "FIRST", text: "말보다 행동 패턴을 관찰" },
        { label: "INTERNAL", text: "확신이 찰 때까지 속도 조절" },
        { label: "VISIBLE", text: "표현이 늦게 보임" },
        { label: "OTHERS", text: "관심 없거나 차갑다고 오해" },
        { label: "RESULT", text: "본인은 신중, 상대는 거리감으로 느낌" },
      ],
      selfInterpretation: "나는 함부로 다가가지 않으려 함",
      outsideInterpretation: "상대는 마음이 없다고 느낄 수 있음",
      selfMisread: "‘표현을 못한다’가 아니라, 확신 전 속도를 조절하는 방식일 수 있음",
      counterPattern: "기준이 채워진 사람에게는 의외로 빠르게 마음이 기울 수 있습니다.",
    },
    love_after: {
      discoveryLevel: 3,
      whyDeeper:
        "확신이 생기면 말보다 실질 챙김이 늘어납니다. 처음과 깊어진 뒤가 다르게 보이는 이유가 여기 있습니다.",
      reactionChain: [
        { label: "TRIGGER", text: "관계 정의·신뢰가 정리됨" },
        { label: "FIRST", text: "시간·실행·배려가 늘어남" },
        { label: "INTERNAL", text: "관계를 지키는 기준도 같이 세움" },
        { label: "VISIBLE", text: "행동이 갑자기 많아짐" },
        { label: "OTHERS", text: "사람이 바뀐 것처럼 보일 수 있음" },
        { label: "RESULT", text: "속도 차이를 모르면 오해가 쌓임" },
      ],
      selfInterpretation: "나는 이제야 제대로 챙기는 중",
      outsideInterpretation: "상대는 왜 이제야? 혹은 부담으로 느낄 수 있음",
      selfMisread: "‘원래 애정 표현이 없다’고만 보면, 확신 전/후 리듬을 놓침",
    },
    love_needs: {
      discoveryLevel: 3,
      whyDeeper:
        "사랑받는 감각은 화려한 말보다 태도의 일관성과 신뢰가 먼저 쌓일 때 편해집니다.",
      reactionChain: [
        { label: "TRIGGER", text: "말과 행동이 어긋난 장면" },
        { label: "FIRST", text: "바로 따지기보다 관찰" },
        { label: "INTERNAL", text: "신뢰 잔고를 계산" },
        { label: "VISIBLE", text: "거리 조절" },
        { label: "OTHERS", text: "갑자기 차가워졌다고 느낌" },
        { label: "RESULT", text: "서운함은 한 번보다 반복에서 커짐" },
      ],
      selfInterpretation: "나는 일관성을 확인하는 중",
      outsideInterpretation: "상대는 시험을 받는다고 느낄 수 있음",
      selfMisread: "‘의심이 많다’가 아니라, 신뢰가 확신을 만드는 구조일 수 있음",
    },
    love_fight: {
      discoveryLevel: 3,
      whyDeeper:
        "갈등하면 폭발보다 말이 줄고 정리합니다. 침묵은 동의가 아니라 정리 중일 수 있습니다.",
      reactionChain: [
        { label: "TRIGGER", text: "불편한 장면" },
        { label: "FIRST", text: "말수 감소" },
        { label: "INTERNAL", text: "무엇을 문제인지 정리" },
        { label: "VISIBLE", text: "거리 조절" },
        { label: "OTHERS", text: "이미 마음이 떠났다고 오해" },
        { label: "RESULT", text: "정리 없이 사과만 오면 회복이 안 됨" },
      ],
      selfInterpretation: "나는 더 큰 싸움을 막으려 함",
      outsideInterpretation: "상대는 무시당한다고 느낄 수 있음",
      selfMisread: "‘갈등을 못 한다’고 자책하면, 필요한 회복 조건(재발 방지 근거)을 놓침",
    },
    love_expression: {
      discoveryLevel: 2,
      whyDeeper:
        "좋아할수록 말수가 줄고 현실적인 준비가 늘 수 있습니다. 표현이 늦은 것과 마음이 없는 것은 다릅니다.",
      selfInterpretation: "나는 행동으로 보여주려 함",
      outsideInterpretation: "상대는 설렘이 없다고 느낄 수 있음",
      selfMisread: "‘로맨틱하지 않다’가 아니라, 안정형 챙김이 애정 언어일 수 있음",
    },
    love_attraction: {
      discoveryLevel: 2,
      whyDeeper:
        "끌림은 화려한 표현보다 태도·일관성에서 더 빨리 반응합니다.",
      selfInterpretation: "나는 말보다 태도를 봄",
      outsideInterpretation: "상대는 반응이 없다고 느낄 수 있음",
      selfMisread: "‘차가워 보인다’와 ‘기준이 있다’를 구분해야 함",
    },
  };

  const sections = report.sections.map((s) =>
    patchKeys[s.key] ? withDepth(s, patchKeys[s.key]!) : s
  );

  const contradictions: PaidContradiction[] = [
    {
      poleA: "확신 전 절제",
      poleB: "확신 후 챙김",
      howItShows: "정의 전에는 관찰, 정의 후에는 실질 행동이 급증합니다.",
      upside: "가벼운 말로 상처 줄 위험이 적음",
      downside: "초반 호감이 안 보여 기회가 식음",
      whenStronger: "관계가 모호한 초반",
      result: "타인은 ‘관심 없음’, 본인은 ‘신중함’으로 서로 다른 영화가 됨",
      evidence: byKey("love_before").evidence,
    },
    {
      poleA: "갈등 시 침묵",
      poleB: "정리 후 단호함",
      howItShows: "당장은 말이 줄고, 정리된 뒤에는 경계가 선명해집니다.",
      upside: "감정 폭발로 관계를 태우지 않음",
      downside: "침묵이 거절로 읽힘",
      whenStronger: "같은 서운함이 반복될 때",
      result: "상대는 갑작스런 단호함에 당황하고, 본인은 ‘이미 말했어야 했다’고 느낌",
      evidence: byKey("love_fight").evidence,
    },
  ];

  const strengthShadows: PaidStrengthShadow[] = [
    {
      strength: "일관성 확인",
      overuse: "관찰 기간이 길어짐",
      problem: "호감 표현이 안 보임",
      balancePoint: "확인 중임을 한 문장으로 알림",
      evidence: byKey("love_needs").evidence.slice(0, 3),
    },
    {
      strength: "실질 챙김",
      overuse: "말로 된 설렘 부족",
      problem: "애정 언어 불일치",
      balancePoint: "행동 1 + 짧은 말 1을 같이",
      evidence: byKey("love_expression").evidence.slice(0, 3),
    },
  ];

  const actionItems: PaidActionItem[] = [
    {
      domain: "relationship",
      when: "호감은 있는데 말이 안 나가면",
      what: "‘지금은 속도를 보는 중’이라고 한 번 말합니다",
      why: "표현 지연이 관심 없음으로 읽히기 쉬움",
      how: "긴 고백 대신 상태 한 문장",
    },
    {
      domain: "relationship",
      when: "서운함이 반복되면",
      what: "사과 크기보다 재발 방지 근거를 묻습니다",
      why: "회복은 감정 확인보다 같은 일이 안 반복될 근거에서 시작됨",
      how: "‘다음에 어떻게 다르게 할 건지’ 한 줄",
    },
    {
      domain: "relationship",
      when: "갈등 중 말이 줄면",
      what: "침묵이 동의가 아님을 짧게 표시합니다",
      why: "상대는 이미 마음이 떠났다고 오해하기 쉬움",
      how: "‘정리한 뒤  tonight에 이야기하자’",
    },
    {
      domain: "relationship",
      when: "확신이 생긴 뒤 행동이 늘면",
      what: "상대에게 속도 변화를 설명해 줍니다",
      why: "처음과 다른 모습이 부담으로 읽힐 수 있음",
      how: "‘이제 마음을 정해서 챙기는 거야’ 한 줄",
    },
    {
      domain: "relationship",
      when: "말과 행동이 어긋난 장면이 보이면",
      what: "바로 추궁보다 패턴 기록을 짧게 합니다",
      why: "일관성 확인이 이 사람의 확신 재료임",
      how: "날짜·장면·느낀 점 세 줄",
    },
  ];

  return {
    ...report,
    sections,
    contradictions,
    strengthShadows,
    actionItems,
    shareableInsights: [
      "느린 게 아니라, 확신 없이 앞서가지 못하는 리듬일 수 있다.",
      "좋아함보다 신뢰가 먼저 쌓여야 마음이 편해질 수 있다.",
      "침묵은 동의가 아니라 정리 중일 수 있다.",
    ],
  };
}

function totalEnrich(report: PaidFortuneReport): PaidFortuneReport {
  const byKey = (k: string) => report.sections.find((s) => s.key === k)!;
  const patchKeys: Record<string, Partial<PaidSection> & { discoveryLevel: 1 | 2 | 3; whyDeeper: string }> = {
    total_v4_decision: {
      discoveryLevel: 3,
      whyDeeper:
        "판단이 느린 게 아니라 수집과 확정의 속도가 다릅니다. 재촉받을수록 바로 결론보다 자료를 더 모을 수 있습니다.",
      reactionChain: [
        { label: "TRIGGER", text: "불확실한 선택" },
        { label: "FIRST", text: "확인·수집 증가" },
        { label: "INTERNAL", text: "혼자 기준 정리" },
        { label: "VISIBLE", text: "결론 공유 지연" },
        { label: "OTHERS", text: "갑작스럽거나 우유부단하다고 느낌" },
        { label: "RESULT", text: "본인은 기준 완성 중, 타인은 결정 지연으로 읽음" },
      ],
      selfInterpretation: "나는 대충 정하기 싫을 뿐",
      outsideInterpretation: "상대는 결정을 미룬다고 느낌",
      selfMisread: "‘결단력이 없다’가 아니라 확정 단계가 따로 있는 구조일 수 있음",
    },
    total_v4_relationship: {
      discoveryLevel: 3,
      whyDeeper:
        "처음엔 조율하고, 가까워질수록 경계가 선명해집니다. 맞춰 주는 동안 속에서는 이미 결론이 진행될 수 있습니다.",
      reactionChain: [
        { label: "TRIGGER", text: "관계에서 맞춤" },
        { label: "FIRST", text: "겉으로 조율" },
        { label: "INTERNAL", text: "속으로 기준 정리" },
        { label: "VISIBLE", text: "경계 초과 시 단호" },
        { label: "OTHERS", text: "갑자기 변했다고 느낌" },
        { label: "RESULT", text: "겉과 속의 시간차가 오해를 만듦" },
      ],
      selfInterpretation: "나는 배려하다가 선을 그은 것",
      outsideInterpretation: "상대는 통보받는 느낌을 받을 수 있음",
      selfMisread: "‘이중적이다’가 아니라 조율과 확정이 다른 층에서 움직임",
    },
    total_v4_work: {
      discoveryLevel: 3,
      whyDeeper:
        "일에서의 강점은 열정 과시보다 완성도를 끝까지 맞추는 힘입니다. 환경이 흐리면 같은 일도 전혀 다른 피로가 됩니다.",
      reactionChain: [
        { label: "TRIGGER", text: "완료 조건이 흐림" },
        { label: "FIRST", text: "확인 증가" },
        { label: "INTERNAL", text: "혼자 구조 재설계" },
        { label: "VISIBLE", text: "더 많이 맡음" },
        { label: "OTHERS", text: "꼼꼼하거나 까다롭다고 느낌" },
        { label: "RESULT", text: "강점이 과부하로 뒤집힘" },
      ],
      selfInterpretation: "나는 일을 제대로 하려는 중",
      outsideInterpretation: "팀은 속도·위임이 느리다고 느낄 수 있음",
      selfMisread: "‘일 중독’이 아니라 설명되지 않는 구조에서 힘이 셈",
    },
    total_v4_money_link: {
      discoveryLevel: 3,
      whyDeeper:
        "돈에서는 금액보다 흐름이 설명되는지가 중요합니다. 손실을 막는 강점이 종료 기준 없는 결정에서는 지연으로 바뀔 수 있습니다.",
      reactionChain: [
        { label: "TRIGGER", text: "설명이 안 되는 지출·보상" },
        { label: "FIRST", text: "확인·보류" },
        { label: "INTERNAL", text: "허용 범위 탐색" },
        { label: "VISIBLE", text: "큰돈 신중 / 소액 누수" },
        { label: "OTHERS", text: "아끼거나 우유부단하다고 오해" },
        { label: "RESULT", text: "손해를 막는 힘이 기회를 늦출 수 있음" },
      ],
      selfInterpretation: "나는 낭비를 막는 중",
      outsideInterpretation: "상대는 결정을 안 한다고 느낌",
      selfMisread: "‘돈에 집착’이 아니라 설명 가능한 흐름 선호일 수 있음",
    },
    total_v4_love: {
      discoveryLevel: 3,
      whyDeeper:
        "연애에서는 마음을 정하기 전과 후의 속도가 다릅니다. 일에서 통하는 ‘확인 후 실행’이 연애 초반에는 관심 없음으로 읽힐 수 있습니다.",
      reactionChain: [
        { label: "TRIGGER", text: "호감 vs 미정의 관계" },
        { label: "FIRST", text: "관찰·속도 조절" },
        { label: "INTERNAL", text: "신뢰 잔고 확인" },
        { label: "VISIBLE", text: "표현 지연" },
        { label: "OTHERS", text: "마음이 없다고 오해" },
        { label: "RESULT", text: "일 강점이 연애 오해가 됨" },
      ],
      selfInterpretation: "나는 함부로 다가가지 않음",
      outsideInterpretation: "상대는 설렘이 없다고 느낌",
      selfMisread: "‘연애를 못한다’가 아니라 확신 전후 리듬 차이일 수 있음",
    },
    total_v4_stress: {
      discoveryLevel: 3,
      whyDeeper:
        "스트레스는 일이 많아서보다, 끝나지 않은 일이 오래 남을수록 쌓입니다. 더 정리하려다 회복이 미뤄질 수 있습니다.",
      reactionChain: [
        { label: "TRIGGER", text: "미완료 상태가 길어짐" },
        { label: "FIRST", text: "더 확인·정리" },
        { label: "INTERNAL", text: "끝내지 못했다는 압박" },
        { label: "VISIBLE", text: "말수 감소 / 체크리스트 증가" },
        { label: "OTHERS", text: "예민하거나 피한다고 느낌" },
        { label: "RESULT", text: "정리가 회복이 아니라 회피가 될 수 있음" },
      ],
      selfInterpretation: "나는 정리하면 괜찮아질 것 같음",
      outsideInterpretation: "주변은 연락이 끊긴다고 느낄 수 있음",
      selfMisread: "‘멘탈이 약하다’가 아니라 미완료 누적이 스트레스 엔진일 수 있음",
    },
    total_v4_paradox: {
      discoveryLevel: 3,
      whyDeeper:
        "겉으로는 조율, 속으로는 내부 확정이 동시에 움직입니다. 그래서 한 문장 성격 설명이 자꾸 어긋납니다.",
      selfInterpretation: "나는 배려와 기준을 같이 씀",
      outsideInterpretation: "상대는 맞추는 줄 알았다가 통보받는 느낌을 받음",
      selfMisread: "‘가짜 친절’이 아니라 층이 다른 두 힘이 공존",
    },
    total_v4_shadow: {
      discoveryLevel: 2,
      whyDeeper:
        "강점은 줄이는 게 답이 아니라, 과해지는 구간을 아는 것이 균형입니다.",
      selfInterpretation: "나는 강점을 더 써야 한다고 느낌",
      outsideInterpretation: "주변은 과한 확인으로 지침",
      selfMisread: "강점 과사용을 성실함으로만 포장하면 그림자를 놓침",
    },
  };

  const sections = report.sections.map((s) =>
    patchKeys[s.key] ? withDepth(s, patchKeys[s.key]!) : s
  );

  const contradictions: PaidContradiction[] = [
    {
      poleA: "수집형 판단",
      poleB: "확정 후 단호",
      howItShows: "전에는 자료를 모으고, 확정되면 문장이 짧아집니다.",
      upside: "대충 결정해 후회할 위험이 적음",
      downside: "공유 전 침묵이 오해를 만듦",
      whenStronger: "재촉과 불확실이 겹칠 때",
      result: "타인은 우유부단→갑작스러움으로 읽고, 본인은 일관된 과정으로 느낌",
      evidence: byKey("total_v4_decision").evidence,
    },
    {
      poleA: "겉 조율",
      poleB: "속 확정",
      howItShows: "맞추는 동안 내부 결론이 진행됩니다.",
      upside: "초반 마찰이 적음",
      downside: "경계가 갑작스러워 보임",
      whenStronger: "관계가 깊어질 때",
      result: "상대는 통보, 본인은 ‘이미 참았다’로 해석이 갈림",
      evidence: byKey("total_v4_relationship").evidence,
    },
    {
      poleA: "일 완성도",
      poleB: "연애 표현 지연",
      howItShows: "일에서는 확인 후 실행이 강점인데, 연애 초반에는 관심 없음으로 읽힐 수 있습니다.",
      upside: "가벼운 말로 상처 줄 위험이 적음",
      downside: "호감이 전달되지 않음",
      whenStronger: "관계가 미정의일 때",
      result: "크로스 도메인 오해의 전형",
      evidence: byKey("total_v4_love").evidence,
    },
    {
      poleA: "손해 차단",
      poleB: "결정 지연",
      howItShows: "돈에서 손실을 막는 힘이 종료 기준 없는 선택에서는 미루기로 바뀝니다.",
      upside: "큰 낭비를 막음",
      downside: "기회와 소액 누수가 함께 쌓임",
      whenStronger: "선택지가 많을 때",
      result: "신중함이 비용이 되는 구간",
      evidence: byKey("total_v4_money_link").evidence,
    },
  ];

  const strengthShadows =
    report.strengthShadows && report.strengthShadows.length >= 3
      ? report.strengthShadows
      : [
          {
            strength: "확인·정리",
            overuse: "미완료를 더 붙잡음",
            problem: "회복이 미뤄짐",
            balancePoint: "오늘은 ‘끝낼 것 1개’만",
            evidence: byKey("total_v4_stress").evidence.slice(0, 3),
          },
          {
            strength: "조율",
            overuse: "속 기준을 늦게 공유",
            problem: "통보처럼 보임",
            balancePoint: "중간 상태를 한 문장으로",
            evidence: byKey("total_v4_relationship").evidence.slice(0, 3),
          },
          {
            strength: "완성도",
            overuse: "혼자 다 맡음",
            problem: "과부하",
            balancePoint: "범위 한 줄 후 착수",
            evidence: byKey("total_v4_work").evidence.slice(0, 3),
          },
        ];

  const actionItems: PaidActionItem[] = [
    {
      domain: "self",
      when: "결정을 미루고 있다면",
      what: "정보 추가보다 확정 기준 3개를 적습니다",
      why: "수집과 확정의 속도가 다른 구조이기 때문",
      how: "기준·기한·포기 조건",
    },
    {
      domain: "work",
      when: "업무가 흐리면",
      what: "완료 조건을 한 문장으로 되묻습니다",
      why: "일 강점이 흐린 환경에서 과부하로 뒤집힘",
      how: "‘끝이 뭔가요?’",
    },
    {
      domain: "money",
      when: "큰 결정을 미루는 동안",
      what: "소액 반복 5개를 먼저 표시합니다",
      why: "손해 차단 강점이 소액 시야를 가릴 수 있음",
      how: "주간 반복만 하이라이트",
    },
    {
      domain: "relationship",
      when: "맞춰 주다가 단호해지기 직전",
      what: "중간 상태를 먼저 말합니다",
      why: "겉 조율과 속 확정의 시간차가 오해를 만듦",
      how: "‘지금은 정리 중이야’",
    },
    {
      domain: "relationship",
      when: "연애 초반 표현이 안 나가면",
      what: "관심 없음을 부정하는 상태 문장을 보냅니다",
      why: "일 강점(확인 후 실행)이 연애에선 오해가 됨",
      how: "‘관심 있어서 속도를 보는 중’",
    },
    {
      domain: "self",
      when: "정리가 끝나지 않아 스트레스면",
      what: "정리 범위를 오늘 1개로 끊습니다",
      why: "미완료 누적이 스트레스 엔진",
      how: "타이머 25분 + 종료",
    },
    {
      domain: "work",
      when: "빈자리를 떠안게 되면",
      what: "맡기 전 범위를 적습니다",
      why: "성실 떠맡음이 이탈 신호가 됨",
      how: "기간·산출물 한 줄",
    },
    {
      domain: "general",
      when: "나를 한 단어로 규정하고 싶을 때",
      what: "상황별 속도 차이 문장을 다시 봅니다",
      why: "한 문장 성격 설명이 이 구조를 놓침",
      how: "판단/관계/일/돈/연애 다섯 칸",
    },
  ];

  return {
    ...report,
    sections,
    contradictions,
    strengthShadows,
    actionItems,
    crossDomainLinks: [
      {
        from: "일",
        to: "연애",
        bridge:
          "일에서 장점인 ‘확인 후 실행’이 연애 초반에는 관심 없음으로 읽힐 수 있습니다.",
      },
      {
        from: "돈",
        to: "결정",
        bridge:
          "손실을 막는 강점이 종료 기준이 없는 선택에서는 결정을 늦추는 비용이 됩니다.",
      },
      {
        from: "관계",
        to: "일",
        bridge:
          "맞춰 주는 조율이 업무에서는 빈자리 떠맡음으로 이어져 과부하가 될 수 있습니다.",
      },
      {
        from: "스트레스",
        to: "돈",
        bridge:
          "끝나지 않은 일을 붙잡는 회복 방식이 장부 정리 미룸과 같은 엔진으로 작동할 수 있습니다.",
      },
    ],
    patternChains: [
      {
        title: "불확실 → 과부하",
        steps: [
          "불확실한 상황",
          "확인 증가",
          "혼자 정리",
          "결론 공유 지연",
          "타인은 갑작스럽다고 느낌",
        ],
      },
      {
        title: "조율 → 단호",
        steps: [
          "관계에서 맞춤",
          "속으로 기준 정리",
          "경계 초과",
          "갑자기 단호해짐",
          "상대는 통보로 느낌",
        ],
      },
      {
        title: "호감 → 오해",
        steps: [
          "호감 발생",
          "확신 전 속도 조절",
          "표현 지연",
          "상대는 관심 없음으로 읽음",
          "본인은 신중했다고 느낌",
        ],
      },
    ],
    shareableInsights: [
      "판단이 느린 게 아니라, 수집과 확정의 속도가 서로 다를 수 있다.",
      "일에서 통하는 확인이 연애에서는 오해가 될 수 있다.",
      "겉으로 맞추는 동안 속에서는 이미 결론이 진행될 수 있다.",
      "끝나지 않은 일이 오래 남을수록 스트레스가 쌓일 수 있다.",
    ],
  };
}

export function enrichConsultingGrade(report: PaidFortuneReport): PaidFortuneReport {
  const kind = report.reportKind ?? "generic";
  let next: PaidFortuneReport;
  if (kind === "money") next = moneyEnrich(report);
  else if (kind === "career") next = careerEnrich(report);
  else if (kind === "love") next = loveEnrich(report);
  else if (kind === "total") next = totalEnrich(report);
  else next = report;
  return paidFortuneReportStrictSchema.parse(next);
}

export function countLevel3(report: PaidFortuneReport): number {
  return report.sections.filter((s) => s.discoveryLevel === 3).length;
}
