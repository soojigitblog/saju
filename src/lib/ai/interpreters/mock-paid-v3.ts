import { USER_FACING_DISCLAIMER } from "@/lib/ai/disclaimer";
import { buildMoneyProfileScales } from "@/lib/ai/paid-profile-scales";
import type { PaidFortuneReport, PaidSection } from "@/lib/ai/schemas/paid-report";
import type { FortuneAiContext } from "@/lib/ai/types";

function baseEvidence(ctx: FortuneAiContext): string[] {
  const keys = [
    `dayMaster=${ctx.dayMaster.stem}`,
    `fiveElements.metal=${ctx.fiveElements.metal}`,
    `fiveElements.fire=${ctx.fiveElements.fire}`,
    `fiveElements.earth=${ctx.fiveElements.earth}`,
    "tenGods.month.stem",
  ];
  if (!ctx.birthTimeUnknown) keys.push("pillars.hour.stem");
  return keys;
}

function ev(ctx: FortuneAiContext, ...needles: string[]): string[] {
  const root = baseEvidence(ctx);
  const picked = root.filter((e) =>
    needles.some((n) => e === n || e.startsWith(n + "=") || e.includes(n))
  );
  return (picked.length > 0 ? picked : root.slice(0, 3)).slice(0, 5);
}

function whyTriple(
  saju: string,
  plain: string,
  life: string
): [string, string, string] {
  return [
    `명리에서 보면 ${saju}`,
    `쉽게 풀면 ${plain}`,
    `실제 생활에서는 ${life}`,
  ];
}

function snap(ctx: FortuneAiContext) {
  const fe = ctx.fiveElements;
  return [
    { key: "wood" as const, label: "木", count: fe.wood },
    { key: "fire" as const, label: "火", count: fe.fire },
    { key: "earth" as const, label: "土", count: fe.earth },
    { key: "metal" as const, label: "金", count: fe.metal },
    { key: "water" as const, label: "水", count: fe.water },
  ];
}

const SCOPE_NOTES =
  "이 리포트의 범위: 출생 차트(일간·월주·오행·십성)만 사용했습니다. 대운·세운·월별 길흉·특정 시기 예언은 포함하지 않습니다.";

function buildMoneySections(ctx: FortuneAiContext): PaidSection[] {
  const dm = ctx.dayMaster.hangul;
  const stem = ctx.dayMaster.stem;
  const fe = ctx.fiveElements;
  const tg = ctx.tenGods.month.stem || "비겁";

  return [
    {
      key: "money_p01_profile",
      title: "MONEY PROFILE · 한눈에 보는 나의 돈 성향",
      question: "내 돈의 기본 체질은 무엇인가?",
      coreInsight: `${dm} 사주에서 돈은 ‘욕심’보다 ‘통제 가능한 흐름’에 반응합니다.`,
      behaviorScenes: [
        "월급이 들어오면 먼저 고정비를 빼고, 남은 금액만 ‘움직일 수 있는 돈’으로 봅니다.",
        "지출 영수증을 모으진 않아도, 큰 금액은 머릿속에 ‘왜 썼는지’ 한 줄이 남아 있어야 편합니다.",
      ],
      includeWhyBox: true,
      evidenceExplanation: whyTriple(
        `${stem} 일간과 金${fe.metal}·土${fe.earth} 상대 분포는 경계·정리를 선호하는 축으로 읽힙니다`,
        "돈을 감정으로 쓰기보다, 설명 가능한 흐름으로 다루려는 타입",
        "통장 잔액보다 ‘이번 달에 내가 허용한 지출 범위’를 먼저 확인하는 장면이 반복됩니다"
      ),
      evidence: ev(ctx, "dayMaster", "fiveElements.metal", "fiveElements.earth"),
      pullQuote: "돈은 감정이 아니라, 허용 범위의 문제",
      takeaway: "프로필의 출발점: 돈을 ‘느낌’이 아니라 ‘범위’로 관리합니다.",
    },
    {
      key: "money_p02_criteria",
      title: "돈을 움직이는 기준",
      question: "어떤 조건이 맞아야 돈이 실제로 움직이는가?",
      narrativeBridge: "앞에서 본 ‘범위 관리’는, 결정 직전에 더 선명해집니다.",
      coreInsight: "누군가 재촉할수록, 오히려 한 번 더 확인하고 싶어지는 쪽에 가깝습니다.",
      behaviorScenes: [
        "할인 마감 문자가 와도, ‘필요·대안·한도’ 세 줄을 적기 전에는 결제 버튼을 누르지 않습니다.",
        "친구가 ‘이번만’이라며 링크를 보내면, 바로 결제하지 않고 장바구니에만 넣어 두는 경우가 많습니다.",
      ],
      paradoxNote:
        "겉으로는 소비가 느려 보이지만, 기준이 이미 충족된 항목은 남들보다 빠르게 실행합니다.",
      evidenceExplanation: [
        `${stem}의 확인 성향과 월주 ${tg}가 겹치면, 외부 압력일수록 내부 검증 루프가 길어집니다.`,
      ],
      evidence: ev(ctx, "dayMaster", "tenGods.month"),
      takeaway: "기준이 서면 속도는 오히려 빨라집니다. 기준이 없을 때만 멈춥니다.",
    },
    {
      key: "money_p03_earn",
      title: "돈을 버는 방식에서 강점",
      question: "어떤 수입 구조에서 돈이 ‘제대로 벌었다’고 느껴지는가?",
      narrativeBridge: "지출 기준이 까다로운 만큼, 벌어들이는 돈에도 ‘정당성’이 필요합니다.",
      coreInsight: "금액 크기보다, 내가 범위·마감·검수를 쥐고 있을 때 수입 만족도가 올라갑니다.",
      behaviorScenes: [
        "프로젝트 수당은 들쑥날쑥해도, 산출물 기준이 분명하면 ‘받을 만했다’고 느낍니다.",
        "정기 급여는 적어도, 매달 같은 날 같은 구조로 들어오면 마음이 먼저 안정됩니다.",
      ],
      includeWhyBox: true,
      evidenceExplanation: whyTriple(
        `金${fe.metal}·火${fe.fire} 분포는 ‘다듬고 확인한 결과’와 대가를 연결하려는 기운으로 읽힙니다`,
        "돈을 ‘운’으로만 보지 않고, 내 손으로 만든 구조의 결과로 받아들이려는 편",
        "야근 수당보다, 프로세스를 정리해 반복 비용을 줄였을 때 더 큰 만족을 느끼는 장면이 나옵니다"
      ),
      evidence: ev(ctx, "fiveElements.metal", "fiveElements.fire", "dayMaster"),
      strengthSide: "규칙·검수가 있는 수입에서 신뢰를 쌓기 쉽습니다.",
      takeaway: "수입원을 고를 때 ‘얼마’보다 ‘내가 검수하는가’를 먼저 보세요.",
    },
    {
      key: "money_p04_leak",
      title: "돈이 새는 진짜 이유",
      question: "큰돈은 지키면서 작은돈이 새는 이유는?",
      narrativeBridge: "벌 때는 꼼꼼한데, 쓸 때는 ‘사각지대’가 생깁니다.",
      coreInsight: "큰 지출은 레이더가 켜지지만, 작은 반복 지출은 ‘별일 아니지’로 통과됩니다.",
      behaviorScenes: [
        "구독·배달·소액 앱결제는 각각은 작아 보이다가, 월말에 합치면 ‘이만큼이었어?’가 됩니다.",
        "비교를 충분히 못 했다고 느끼면 큰 구매는 미루면서, 피곤한 날 소액은 그냥 지나갑니다.",
      ],
      paradoxNote:
        "절약 성격이 강해 보여도, 편의·피로가 겹치면 소액에서 오히려 관대해질 수 있습니다.",
      includeWhyBox: true,
      evidenceExplanation: whyTriple(
        `${stem}의 완성도 기준이 큰 금액에 집중되면 작은 항목은 우선순위에서 밀립니다`,
        "‘큰 구멍은 막았다’는 안도감이 작은 누수를 덜 보이게 만듭니다",
        "피곤한 밤 원클릭 결제, ‘이번만’ 배달이 반복되면 현금흐름이 서서히 흐려집니다"
      ),
      evidence: ev(ctx, "dayMaster", "fiveElements.fire"),
      riskSide: "큰돈 관리 자신감이 작은 누수를 가립니다.",
      takeaway: "누수는 성격 문제가 아니라 ‘레이더 크기’ 문제입니다.",
    },
    {
      key: "money_p05_shake",
      title: "돈 앞에서 흔들리는 순간",
      question: "돈 판단이 흐려지거나 멈추는 순간은?",
      narrativeBridge: "누수를 막으려다, 반대로 ‘아무것도 안 하기’로 기울 수 있습니다.",
      coreInsight: "손실 가능성이 말로만 커질수록, 확인 루프가 길어져 ‘안 함’이 기본값이 됩니다.",
      behaviorScenes: [
        "이미 조사한 상품도 ‘한 번만 더’ 리뷰를 보다가 할인 기간을 놓칩니다.",
        "보증·공동투자 이야기는 거절 문장을 준비하기 전에, 먼저 머릿속 시뮬레이션이 길어집니다.",
      ],
      includeWhyBox: true,
      evidenceExplanation: whyTriple(
        `월주 ${tg}의 검증 성향이 돈 판단에 실리면 ‘확인→재확인’ 루프가 길어집니다`,
        "손실을 피하려는 마음이 ‘기회 비용’까지 함께 막아 버릴 수 있습니다",
        "재촉받을수록 답을 미루고, 혼자 있을 때만 다시 계산하는 패턴이 보입니다"
      ),
      evidence: ev(ctx, "tenGods.month", "dayMaster"),
      triggerSituation: "타인 재촉, 말로만 부풀려진 손실, 문서 없는 약속",
      takeaway: "검토 횟수에 상한을 두면, 돈 판단이 다시 선명해집니다.",
    },
    {
      key: "money_p06_work",
      title: "일·부업과 돈의 연결",
      question: "일하는 방식이 수입 만족도에 어떻게 영향을 주는가?",
      narrativeBridge: "흔들리는 순간을 지나면, ‘어디서 벌 때 편한지’가 드러납니다.",
      coreInsight: "같은 금액이라도, 산출 기준이 흐리면 ‘받은 돈’이 개운치 않습니다.",
      behaviorScenes: [
        "지시가 모호한 업무 수당보다, 마감·범위가 분명한 일에서 돈이 정당하게 느껴집니다.",
        "부업은 사람 상대 즉흥 영업보다, 혼자 다듬어 반복 가능한 구조에 손이 먼저 갑니다.",
      ],
      evidenceExplanation: [
        `${stem}+金${fe.metal} 조합은 ‘완성된 결과’와 대가를 연결하려는 경향으로 읽혔습니다.`,
      ],
      evidence: ev(ctx, "dayMaster", "fiveElements.metal"),
      takeaway: "돈 만족은 직업명이 아니라 ‘검수 가능한 일’에서 옵니다.",
    },
    {
      key: "money_p07_people",
      title: "사람과 돈",
      question: "관계 속 돈에서 반복되는 패턴은?",
      narrativeBridge: "일에서의 ‘정당성’ 기준이, 사람 사이 돈에도 그대로 따라옵니다.",
      coreInsight: "거절이 어려워서가 아니라, ‘말이 된 분담’이 없을 때 돈이 관계 스트레스로 번집니다.",
      behaviorScenes: [
        "더치페이는 금액을 먼저 공유하고, ‘나중에’ 정산은 불편합니다.",
        "가족·연인 지출은 챙기되, 한도를 말로 정하지 않으면 속으로만 불편해집니다.",
      ],
      evidenceExplanation: [
        `${stem}의 책임 성향이 돈으로 옮아가면, 문서화되지 않은 약속에 취약해질 수 있습니다.`,
      ],
      evidence: ev(ctx, "dayMaster", "tenGods.month"),
      takeaway: "돈 갈등은 정이 아니라 ‘분담 문장’으로 풀 때 덜 꼬입니다.",
    },
    {
      key: "money_p08_mistake",
      title: "돈에서 반복하기 쉬운 실수",
      question: "같은 실수를 반복하는 돈 패턴은?",
      narrativeBridge: "관계 돈까지 포함해, ‘반복’의 윤곽이 보입니다.",
      coreInsight: "큰돈은 지키면서, ‘피곤+소액+편의’ 조합에서 같은 실수가 반복됩니다.",
      behaviorScenes: [
        "월초에 ‘이번 달은 줄이자’고 해두고, 셋째 주쯤 소액 합계를 처음 봅니다.",
        "공동비용을 미리 말하지 않았다는 이유로, 나중에 더 큰 금액을 냅니다.",
      ],
      evidenceExplanation: [
        "앞선 누수·판단·관계 패턴이 합쳐져 ‘큰돈 신중 / 소액 관대 / 분담 지연’ 삼각형이 됩니다.",
      ],
      evidence: ev(ctx, "fiveElements.fire", "dayMaster"),
      takeaway: "실수는 의지가 아니라 루틴 공백에서 반복됩니다.",
    },
    {
      key: "money_p09_style",
      title: "나에게 맞는 돈 관리 방식",
      question: "내 성향에 맞는 관리법은 무엇인가?",
      narrativeBridge: "실수 패턴을 알면, ‘맞는 방식’은 추상적 조언이 아니라 짧은 규칙이 됩니다.",
      coreInsight: "절약 구호보다, 검증 루틴을 짧게 고정하는 편이 잘 맞습니다.",
      behaviorScenes: [
        "일요일 20분에 구독·고정비·변동비 세 줄만 업데이트하는 장면이 현실적입니다.",
        "큰 지출은 결제 전 ‘필요/대안/한도’ 메모 한 장이면 충분합니다.",
      ],
      evidenceExplanation: [
        `${stem}의 확인 습관은 ‘많은 규칙’보다 ‘짧은 고정 루틴’에 잘 붙습니다.`,
      ],
      evidence: ev(ctx, "dayMaster", "fiveElements.metal"),
      takeaway: "관리법은 많을수록 실패합니다. 다섯 줄이면 충분합니다.",
    },
    {
      key: "money_p10_manual",
      title: "재물 사용설명서",
      question: "지금부터 바로 쓸 수 있는 돈 규칙은?",
      narrativeBridge: "앞선 9개 장면을 실행 문장으로 압축합니다.",
      coreInsight: "WHEN–DO–WHY 형태의 짧은 규칙 다섯 개면, 이 리포트는 ‘읽을 것’에서 ‘쓸 것’이 됩니다.",
      behaviorScenes: [
        "결제 직전 30초 멈춤 — ‘세 줄 기준’ 없으면 장바구니에만 둡니다.",
      ],
      includeWhyBox: true,
      actionAdvice: [
        "WHEN: 중요한 결제를 계속 미루고 있다면 → DO: 조건 3개 중 2개 충족 시 실행 → WHY: 정보를 더 모을수록 안정되는 성향이 결정 지연으로 넘어가는 것을 막기 위해",
        "WHEN: 월말에 소액 합계가 놀랍다면 → DO: 매주 같은 요일 15분 합산 → WHY: 큰돈 레이더는 켜져 있지만 작은 반복은 사각이기 때문",
        "WHEN: 공동비용 대화가 애매하다면 → DO: 대화 전 금액을 먼저 보냄 → WHY: 분담 문장이 없으면 관계 스트레스로 번지기 때문",
      ],
      evidenceExplanation: whyTriple(
        "앞 챕터의 운영·누수·판단·관계 패턴을 실행 규칙으로 압축했습니다",
        "추상적 ‘절약’ 대신, 이미 반복되는 장면에 맞춘 WHEN–DO–WHY",
        "카드사 알림보다 ‘내가 정한 확인 시점’이 이 타입에 더 잘 맞습니다"
      ),
      evidence: ev(ctx, "dayMaster", "fiveElements.metal", "fiveElements.fire"),
      takeaway: "이 사용설명서는 달력에 붙여두고, 월 1회만 다시 읽으면 됩니다.",
    },
  ];
}

function buildTotalSections(ctx: FortuneAiContext): PaidSection[] {
  const dm = ctx.dayMaster.hangul;
  const stem = ctx.dayMaster.stem;
  const fe = ctx.fiveElements;
  const tg = ctx.tenGods.month.stem || "비겁";

  return [
    {
      key: "total_p01_structure",
      title: "PART 1 · 나는 어떤 구조의 사람인가",
      question: "이 사주의 뼈대는 무엇이며, 삶 전반에 어떻게 깔리는가?",
      coreInsight: `${stem}(${dm})을 축으로, 확인·경계·완성이 먼저 보이는 설계입니다.`,
      behaviorScenes: [
        "중요한 일은 ‘느낌’보다 ‘조건’을 먼저 적고 움직입니다.",
        "남의 의견을 듣는 자리와, 혼자 결론 내리는 자리가 분리되어 있습니다.",
      ],
      includeWhyBox: true,
      evidenceExplanation: whyTriple(
        `${stem} 일간은 단단한 기준과 경계를 세우려는 축으로 읽힙니다`,
        "납득되기 전에는 속도를 내지 않는 타입",
        "회의·구매·약속 모두에서 ‘한 줄 확인’이 먼저 나옵니다"
      ),
      evidence: ev(ctx, "dayMaster"),
      takeaway: "구조의 중심: 확인 후 추진.",
    },
    {
      key: "total_p02_decision",
      title: "PART 2 · 결정할 때의 나",
      question: "나는 어떻게 결정하고, 언제 멈추는가?",
      narrativeBridge: "기본 구조가 ‘확인’이라면, 결정은 2단 절차로 나타납니다.",
      coreInsight: "정보가 부족할수록 속도를 늦추고, 내가 책임질 결정일수록 번복을 싫어합니다.",
      behaviorScenes: [
        "타인이 재촉하면 일단 ‘보류’를 확보한 뒤 자료를 더 모읍니다.",
        "결정 후에는 작은 수정은 해도, 방향 자체를 뒤집는 데는 저항이 큽니다.",
      ],
      includeWhyBox: true,
      evidenceExplanation: whyTriple(
        `${stem}의 경계 + 월주 ${tg} 검증 성향이 결정을 ‘수집→확정’ 2단으로 만듭니다`,
        "충동 결정은 잘 걸러내지만, 보류가 길어질 수 있습니다",
        "할인 마감·약속 변경처럼 시간 압박이 올 때 ‘미룸’이 두드러집니다"
      ),
      evidence: ev(ctx, "dayMaster", "tenGods.month"),
      strengthSide: "충동 합의를 줄입니다.",
      riskSide: "보류가 기본값이 되면 타이밍을 놓칩니다.",
      takeaway: "결정력은 ‘빠름’이 아니라 ‘보류에 만료일’이 있을 때 살아납니다.",
    },
    {
      key: "total_p03_relationship",
      title: "PART 3 · 사람과 있을 때의 나",
      question: "관계에서 반복되는 거리·범위·오해 패턴은?",
      narrativeBridge: "결정 방식이 관계에서는 ‘범위 선언’으로 바뀝니다.",
      coreInsight: "처음엔 예의 바르게 맞추고, 친해질수록 ‘내 방식’을 분명히 합니다.",
      behaviorScenes: [
        "부탁을 받으면 가능 범위를 먼저 말하고, 모호한 ‘알아서’를 불편해합니다.",
        "서운할 때는 길게 설명하기보다 거리가 먼저 생깁니다.",
      ],
      evidenceExplanation: [
        `${stem}의 책임 반응이 관계에서는 ‘가능/불가 경계’로 나타납니다.`,
      ],
      evidence: ev(ctx, "dayMaster"),
      takeaway: "관계의 열쇠는 친밀도가 아니라 ‘범위 문장’입니다.",
    },
    {
      key: "total_p04_work",
      title: "PART 4 · 일할 때의 나",
      question: "어떤 업무 환경에서 강해지고, 어디서 지치는가?",
      narrativeBridge: "관계에서 쓰는 ‘범위’가 일에서는 ‘완료 조건’이 됩니다.",
      coreInsight: "목표가 선명하고 자율이 보장될 때 속도가 나고, 기준 없는 수정 요청에 빨리 지칩니다.",
      behaviorScenes: [
        "완성도 지적에는 고치고, ‘느낌상 다시’에는 에너지가 급락합니다.",
        "혼자 구간을 준 뒤 합치는 팀 구성에서 성과가 안정적입니다.",
      ],
      includeWhyBox: true,
      evidenceExplanation: whyTriple(
        `金${fe.metal}·火${fe.fire} 배치를 업무 ‘검수→추진’ 리듬으로 읽었습니다`,
        "직업명 추천이 아니라, 만족이 붙는 업무 조건의 해석",
        "야근보다 ‘프로세스 정리 후 여유’에 더 큰 안도를 느끼는 장면이 있습니다"
      ),
      evidence: ev(ctx, "fiveElements.metal", "fiveElements.fire"),
      takeaway: "일의 무기는 열정이 아니라 ‘선명한 완료 조건’입니다.",
    },
    {
      key: "total_p05_money",
      title: "PART 5 · 돈을 대할 때의 나",
      question: "돈은 일·통제감·관계와 어떻게 연결되는가?",
      narrativeBridge: "일에서 중요한 ‘완료 조건’이, 돈에서는 ‘검수 가능한 흐름’이 됩니다.",
      coreInsight: "돈의 만족은 금액 자체보다 ‘내가 통제·검수하는 흐름인가’에 붙습니다.",
      behaviorScenes: [
        "일한 대가라도 산출 기준이 흐리면 ‘받은 돈’이 개운치 않습니다.",
        "큰 지출은 신중하지만, 피곤한 날 소액 반복은 레이더 밖으로 나갑니다.",
      ],
      paradoxNote:
        "절약형으로 보이지만, ‘이번만’ 편의 소비에서 오히려 관대해질 수 있습니다.",
      evidenceExplanation: [
        `${stem}의 경계 성향이 돈에도 동일하게 투영됩니다. 재물 전문 리포트를 복붙하지 않고 연결만 요약했습니다.`,
      ],
      evidence: ev(ctx, "dayMaster", "fiveElements.metal"),
      takeaway: "돈은 별도 성격이 아니라, 같은 ‘확인 습관’의 다른 얼굴입니다.",
    },
    {
      key: "total_p06_love",
      title: "PART 6 · 사랑할 때의 나",
      question: "호감·친밀·갈등에서 달라지는 패턴은?",
      narrativeBridge: "돈에서 보인 ‘통제감’이 연애에서는 ‘확신 전 거리’로 바뀝니다.",
      coreInsight: "확신이 생기기 전에는 신중하고, 생긴 뒤에는 챙김이 빨라집니다.",
      behaviorScenes: [
        "호감이 있어도 애정 확인을 서두르기보다 일관된 행동으로 보여 줍니다.",
        "싸움에서는 큰소리보다 말수가 줄고, 오해가 정리돼야 다시 가까워집니다.",
      ],
      evidenceExplanation: [
        `연애운 길흉이 아니라, ${stem}의 확인·경계 패턴이 친밀 관계로 옮아간 장면입니다.`,
      ],
      evidence: ev(ctx, "dayMaster"),
      takeaway: "사랑에서도 ‘말’보다 ‘일관된 행동’이 신호입니다.",
    },
    {
      key: "total_p07_stress",
      title: "PART 7 · 스트레스 받은 나",
      question: "스트레스는 어떻게 쌓이고, 어떻게 풀리는가?",
      narrativeBridge: "평소의 확인 습관이 한계를 넘으면, 회복 방식이 ‘정리’로 고정됩니다.",
      coreInsight: "예측 불가능한 변수와 유예된 결정이 쌓일 때 피로가 급증합니다.",
      behaviorScenes: [
        "초기에는 더 정리하고, 한계를 넘으면 대화를 줄인 채 혼자 분류 작업으로 회복합니다.",
        "‘괜찮다’고 넘기다가, 어느 날 갑자기 모든 일정을 재정렬하고 싶어집니다.",
      ],
      includeWhyBox: true,
      evidenceExplanation: whyTriple(
        `검증 루프(${tg})가 과열되면 정리가 ‘회복’인 동시에 ‘회피’가 될 수 있습니다`,
        "스트레스를 말로 풀기보다, 분류·정리로 머리를 비우는 타입",
        "기준 없는 수정·미정 일정·미룬 공동 결정이 연속되면 말수가 먼저 줄어듭니다"
      ),
      evidence: ev(ctx, "tenGods.month", "dayMaster"),
      triggerSituation: "기준 없는 수정, 미정인 일정, 미룬 공동 결정",
      takeaway: "회복 루틴에 ‘시간 상한’을 두지 않으면, 정리가 회피가 됩니다.",
    },
    {
      key: "total_p08_paradox",
      title: "PART 8 · 나도 잘 모르는 내 모순",
      question: "겉과 속이 다른 지점은 어디인가?",
      narrativeBridge: "스트레스까지 보면, ‘모순’이 단점이 아니라 구조임이 보입니다.",
      coreInsight: "경청하는 사람처럼 보이지만, 결론은 이미 자기 기준으로 정리된 경우가 있습니다.",
      behaviorScenes: [
        "회의에서는 끝까지 듣지만, 집에 가서 메모로 결론을 다시 씁니다.",
        "책임감 때문에 맡은 일을 끝까지 가져가며, 도움 요청을 늦게 합니다.",
      ],
      paradoxNote:
        "겉: 협조적 / 속: 이미 자기 결론 — 상대는 ‘합의했다’고 느끼지만 본인은 ‘확인 중’일 수 있습니다.",
      includeWhyBox: true,
      evidenceExplanation: whyTriple(
        `${stem} + ${tg} 조합은 ‘외부 조율 + 내부 확정’ 이중 절차로 읽힙니다`,
        "모순이 아니라, 같은 성향의 두 단계",
        "공동비용·업무 방향·중요 약속에서 오해가 생기기 쉬운 지점입니다"
      ),
      evidence: ev(ctx, "dayMaster", "tenGods.month"),
      takeaway: "모순을 없애기보다, ‘결론 공유 시점’을 앞당기는 편이 낫습니다.",
    },
    {
      key: "total_p09_shadow",
      title: "PART 9 · 강점이 약점으로 바뀌는 순간",
      question: "잘하는 것이 과해질 때 무엇이 무너지는가?",
      narrativeBridge: "모순을 이해하면, 강점의 그림자도 ‘예측 가능한 경로’가 됩니다.",
      coreInsight: "끝까지 확인하는 힘이 과하면, 위임을 미루고 혼자 과부하에 빠집니다.",
      behaviorScenes: [
        "‘내가 보는 게 빠르다’는 생각이 팀 위임을 늦춥니다.",
        "기준이 선명한 만큼, 기준 미달 상황에 과민 반응이 나올 수 있습니다.",
      ],
      includeWhyBox: true,
      evidenceExplanation: [
        "아래 Strength→Shadow 맵과 같은 근거로, 강점의 과사용 경로를 요약했습니다.",
      ],
      evidence: ev(ctx, "dayMaster", "fiveElements.metal"),
      takeaway: "강점을 줄이기보다, ‘위임할 검수 포인트’만 남기세요.",
    },
    {
      key: "total_p10_playbook",
      title: "PART 10 · 나에게 맞는 삶의 운영법",
      question: "앞선 분석을 일상에서 어떻게 쓰는가?",
      narrativeBridge: "구조→결정→관계→일→돈→사랑→스트레스→모순→그림자를 한 사람의 운영법으로 묶습니다.",
      coreInsight: "미래 일정 예언이 아니라, 결정·관계·일에 쓰는 상시 플레이북이 필요합니다.",
      behaviorScenes: [
        "결정 전 기준 3줄, 관계에선 범위 한 문장, 일에서는 완료 조건을 고정합니다.",
      ],
      actionAdvice: [
        "WHEN: 보류가 길어진다면 → DO: 만료일을 달력에 적기 → WHY: 확인 성향이 ‘안 함’으로 굳는 것을 막기 위해",
        "WHEN: 혼자 과부하가 느껴진다면 → DO: 검수 포인트만 남기고 위임 1건 → WHY: 끝까지 확인하는 강점이 위임을 막기 때문",
      ],
      evidenceExplanation: [
        "앞 PART들의 패턴을 WHEN–DO–WHY 실행 문장으로 압축했습니다.",
      ],
      evidence: ev(ctx, "dayMaster"),
      takeaway: `운의결: ${dm}을 잘 쓰는 법은 ‘혼자 다 확인’이 아니라 ‘확인 포인트를 설계’하는 일입니다.`,
    },
  ];
}

export function buildMockPaidResultV3(
  ctx: FortuneAiContext,
  productName: string,
  options?: { productSlug?: string; targetYear?: number }
): PaidFortuneReport {
  const hourNote = ctx.birthTimeUnknown
    ? "출생시간 미확인 — 시주 해석은 제외했습니다. "
    : "";
  const dm = ctx.dayMaster.hangul;
  const stem = ctx.dayMaster.stem;
  const fe = ctx.fiveElements;
  const tg = ctx.tenGods.month.stem || "비겁";
  const rootEv = baseEvidence(ctx);
  const slug = options?.productSlug ?? "";
  const kind = /money/i.test(slug)
    ? "money"
    : /total/i.test(slug)
      ? "total"
      : "generic";

  if (kind === "money") {
    const sections = buildMoneySections(ctx);
    return {
      title: `${productName} · 재물 사용설명서`,
      reportVersion: "v3",
      reportKind: "money",
      signatureStatement:
        hourNote +
        `돈이 움직이기 전, 기준을 먼저 세우는 ${dm}의 손이 보입니다.`,
      freeBridge: "무료에서 본 한 줄은 입구일 뿐입니다. 아래부터는 돈 장면만 깊게 봅니다.",
      executiveSummary:
        `${dm} 사주에서 돈은 ‘아끼기’가 아니라 ‘설명 가능한 흐름’으로 읽힙니다. ` +
        "큰 금액 검수, 작은 반복 누수, 일·관계와의 연결을 중심으로 진단했습니다.",
      profileDashboard: [
        { label: "돈을 움직이는 기준", value: "기분보다 짧은 검증·기록" },
        { label: "리스크를 보는 방식", value: "손실 회피 → 검토 루프" },
        { label: "소비 결정", value: "큰 금액 신중 / 소액 반복 사각" },
        { label: "수입 안정 조건", value: "검수·규칙이 보이는 구조" },
        { label: "돈 문제 약점", value: "분담 문장 없는 관계 지출" },
      ],
      profileScales: buildMoneyProfileScales(ctx),
      fiveElementsSnapshot: snap(ctx),
      keywords: ["기준지출", "검수", "소액누수", "구조수입", "분담"],
      sections,
      actionItems: [
        {
          domain: "money",
          when: "월말 소액 합계가 놀랄 때",
          what: "고정비·구독 주간 합산",
          why: "소액 사각을 줄이기 위해",
          how: "매주 같은 요일 15분, 세 줄만 업데이트",
        },
        {
          domain: "money",
          when: "큰 결제를 계속 미룰 때",
          what: "기준 3줄(필요/대안/한도)",
          why: "검토 루프를 끊기 위해",
          how: "결제 전 메모 한 장",
        },
        {
          domain: "money",
          when: "공동비용 대화가 애매할 때",
          what: "금액 선공유",
          why: "관계 속 돈 스트레스를 줄이기 위해",
          how: "대화 전에 금액을 먼저 보냄",
        },
        {
          domain: "self",
          when: "할인 마감이 다가올 때",
          what: "‘확인 1회’ 규칙",
          why: "기회 비용과 과검토를 동시에 줄이기 위해",
          how: "타이머 10분 후 결정",
        },
        {
          domain: "money",
          when: "새 수입원을 검토할 때",
          what: "검수 가능 여부 체크",
          why: "만족도가 붙는 구조를 고르기 위해",
          how: "범위·마감·정산 문장 확인",
        },
      ],
      finalSummary: {
        strengths: [
          "큰 금액을 기분으로 흘려보내지 않습니다.",
          "규칙이 보이는 수입에서 신뢰를 쌓기 쉽습니다.",
        ],
        cautions: [
          "소액 반복이 레이더 밖으로 나가기 쉽습니다.",
          "검토가 길어지면 ‘안 함’이 기본값이 됩니다.",
        ],
        changeHabits: [
          "소액도 주 1회 합산으로 보이게 만드세요.",
          "공동비용은 말보다 금액 공유를 먼저 하세요.",
        ],
        keepHabits: [
          "큰 지출 전 짧은 기준 메모를 유지하세요.",
          "검수 가능한 일·수입을 우선하세요.",
        ],
        closingLine: `운의결 재물: ${dm}의 돈은 ‘확인하는 손’이 있을 때 가장 안전합니다.`,
      },
      evidence: rootEv,
      disclaimer: USER_FACING_DISCLAIMER,
      scopeNotes: SCOPE_NOTES,
    };
  }

  if (kind === "total") {
    const sections = buildTotalSections(ctx);
    return {
      title: `${productName} · 사주 사용설명서`,
      reportVersion: "v3",
      reportKind: "total",
      signatureStatement: `확인 후에야 속도가 나는 ${dm} — 그 손이 일·관계·돈을 관통합니다.`,
      freeBridge: "무료 한 줄은 입구일 뿐입니다. 아래는 하나의 사람으로 연결된 분석입니다.",
      executiveSummary:
        hourNote +
        `${stem} 사주를 개인 분석 백서로 재구성했습니다. 결정·관계·일·돈·사랑·스트레스가 같은 확인 습관으로 이어집니다.`,
      profileDashboard: [
        { label: "판단", value: "수집 → 확정 2단" },
        { label: "관계", value: "범위 선언 후 챙김" },
        { label: "일", value: "선명 목표 + 자율 구간" },
        { label: "돈", value: "검수 가능한 흐름" },
        { label: "연애", value: "확신 전 신중, 이후 챙김" },
        { label: "스트레스", value: "정리·분류로 회복" },
        { label: "무기", value: "끝까지 확인하는 손" },
        { label: "주의", value: "위임 지연·과검토" },
      ],
      fiveElementsSnapshot: snap(ctx),
      keywords: ["확인", "경계", "위임", "통제감", "회복"],
      blueprint: {
        dayMasterTerm: `${stem} (${dm})`,
        dayMasterPlain: "기준과 경계를 세운 뒤 움직이는 축",
        fiveElementsNote: `木${fe.wood} 火${fe.fire} 土${fe.earth} 金${fe.metal} 水${fe.water}`,
        tenGodsNote: `월주 천간 십성: ${tg}`,
        structurePlain: "외부 조율과 내부 확정이 겹치는 2단 구조",
        lifePlain: "회의·구매·약속에서 ‘한 줄 확인’이 먼저 나옵니다",
      },
      sections,
      contradictions: [
        {
          poleA: "겉: 상대 의견을 잘 들어줌",
          poleB: "속: 마지막 판단은 혼자 정리",
          howItShows: "자리에서는 경청하지만 결론 문장은 혼자 다시 씁니다.",
          upside: "충동 합의를 줄입니다.",
          downside: "상대는 ‘이미 정한 것 같다’고 느낄 수 있습니다.",
          whenStronger: "공동 비용·업무 방향·중요 약속",
          result:
            "다른 사람은 ‘내 말을 들어줬다’고 느끼지만, 본인은 이미 자기 기준으로 결론을 낸 경우가 생깁니다.",
          evidence: ev(ctx, "dayMaster", "tenGods.month"),
        },
        {
          poleA: "겉: 책임감 있게 맡음",
          poleB: "속: 도움 요청이 늦음",
          howItShows: "맡긴 일을 끝까지 가져가며 중간 공유가 늦습니다.",
          upside: "신뢰가 쌓입니다.",
          downside: "과부하가 한꺼번에 옵니다.",
          whenStronger: "완성도 기준이 높고 위임 규칙이 없을 때",
          result: "주변은 믿지만, 본인 업무가 계속 늘어납니다.",
          evidence: ev(ctx, "dayMaster", "fiveElements.metal"),
        },
        {
          poleA: "겉: 안정을 선호",
          poleB: "속: 답답하면 급변 욕구",
          howItShows: "오래 참다가 역할·환경 정의를 한꺼번에 바꾸고 싶어집니다.",
          upside: "불필요한 잔변동을 줄입니다.",
          downside: "쌓인 불만이 한 번에 터질 수 있습니다.",
          whenStronger: "기준 없는 수정이 반복될 때",
          result: "평소 순한 사람이 갑자기 ‘이제 그만’이라고 말하는 날이 올 수 있습니다.",
          evidence: ev(ctx, "tenGods.month", "dayMaster"),
        },
        {
          poleA: "겉: 절제·신중",
          poleB: "속: 피로+편의 소비",
          howItShows: "큰 지출은 막지만, 피곤한 밤 소액 반복은 그냥 지나갑니다.",
          upside: "큰 손실을 잘 막습니다.",
          downside: "작은 누수가 월말에 합쳐집니다.",
          whenStronger: "업무·스트레스가 겹친 주",
          result: "‘나 절약하는 사람인데?’ 하면서도 배달·구독 합계에 놀랄 수 있습니다.",
          evidence: ev(ctx, "fiveElements.fire", "dayMaster"),
        },
      ],
      strengthShadows: [
        {
          strength: "끝까지 확인",
          overuse: "모든 단계를 직접 검수",
          problem: "위임 지연·시간 잠식",
          balancePoint: "최종 확인 기준만 본인이 정하고, 중간 과정은 위임",
          evidence: ev(ctx, "dayMaster"),
        },
        {
          strength: "기준 선명",
          overuse: "기준 미달 상황에 과민",
          problem: "관계·협업 마찰",
          balancePoint: "‘완료 조건’만 공유하고, 과정 스타일은 맡김",
          evidence: ev(ctx, "fiveElements.metal"),
        },
        {
          strength: "경청",
          overuse: "속내 결론을 늦게 공유",
          problem: "오해·거리감",
          balancePoint: "하루 안에 ‘내 결론 초안’을 짧게 공유",
          evidence: ev(ctx, "tenGods.month"),
        },
      ],
      lifeScenes: [
        "회의에서는 끝까지 듣지만, 집에서 결론을 다시 씁니다.",
        "구매 전 ‘필요·대안·한도’ 세 줄을 적습니다.",
        "부탁에는 가능 범위부터 답합니다.",
        "‘느낌상 다시’ 수정 요청에 에너지가 급락합니다.",
        "공동비용은 대화 전 금액을 먼저 보냅니다.",
        "싸울 때 큰소리보다 말수가 줄어듭니다.",
        "스트레스가 쌓이면 정리·분류로 회복합니다.",
        "결정 후 방향 번복에 강한 저항이 있습니다.",
      ],
      actionItems: [
        {
          domain: "work",
          when: "혼자 일이 쌓일 때",
          what: "위임 1건/주",
          why: "과부하 예방",
          how: "검수 포인트만 남기고 넘김",
        },
        {
          domain: "work",
          when: "수정 요청이 모호할 때",
          what: "완료 조건 되물음",
          why: "기준 없는 재작업 방지",
          how: "‘완료 조건’을 한 문장으로 확인",
        },
        {
          domain: "money",
          when: "월말 소액이 놀랄 때",
          what: "소액 주간 합산",
          why: "누수 사각 제거",
          how: "15분 루틴",
        },
        {
          domain: "money",
          when: "공동비용이 애매할 때",
          what: "금액 선공유",
          why: "관계 돈 갈등 완화",
          how: "대화 전 전송",
        },
        {
          domain: "relationship",
          when: "부탁이 모호할 때",
          what: "범위 한 문장",
          why: "오해 감소",
          how: "가능/불가 경계를 먼저",
        },
        {
          domain: "relationship",
          when: "경청 후 오해가 생길 때",
          what: "결론 공유",
          why: "경청≠합의 오해 방지",
          how: "하루 안에 짧게",
        },
        {
          domain: "self",
          when: "결정을 계속 미룰 때",
          what: "보류 만료일",
          why: "과검토 차단",
          how: "달력에 D-day",
        },
        {
          domain: "self",
          when: "정리가 길어질 때",
          what: "회복 루틴 상한",
          why: "회피성 정리 과잉 방지",
          how: "25분 타이머",
        },
      ],
      finalSummary: {
        strengths: [
          "확인 후 추진하는 신뢰감",
          "선명한 목표가 있을 때의 실행력",
        ],
        cautions: [
          "위임 지연으로 과부하",
          "속내 결론 공유가 늦어 오해",
        ],
        changeHabits: [
          "결론 공유를 하루 안에",
          "위임을 주 1회 실행",
        ],
        keepHabits: [
          "결정 전 짧은 기준 메모",
          "완료 조건이 보이는 일 선택",
        ],
        closingLine: `운의결: ${dm}을 잘 쓰는 법은 ‘혼자 다 확인’이 아니라 ‘확인 포인트를 설계’하는 일입니다.`,
      },
      evidence: rootEv,
      disclaimer: USER_FACING_DISCLAIMER,
      scopeNotes: SCOPE_NOTES,
    };
  }

  throw new Error(`buildMockPaidResultV3: unsupported kind ${kind}`);
}
