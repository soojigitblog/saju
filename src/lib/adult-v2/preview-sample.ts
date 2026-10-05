/**
 * Development-only editorial data for the isolated V2 preview route.
 *
 * This shape deliberately mirrors the presentation layer, not the calculation
 * engine. Production wiring must map CalculatedFortuneData + validated copy
 * into this model; this literal must never be persisted, sent to AI, or used
 * as a paid-report result.
 */
export type AdultV2PreviewData = {
  subject: string;
  year: number;
  subtitle: string;
  coreWords: readonly string[];
  portrait: { lead: string; outward: string; inward: string; context: string };
  tendencies: {
    primary: { title: string; body: string };
    supporting: readonly { title: string; body: string }[];
  };
  lifeFlow: readonly {
    ageRange: string;
    theme: string;
    change: string;
    prominence: "quiet" | "steady" | "rising" | "focused" | "turning";
    current?: boolean;
  }[];
  years: readonly {
    year: string;
    headline: string;
    primaryTheme: string;
    secondaryTheme: string;
    changePressure: string;
    keywords: readonly string[];
    interpretation: string;
    current?: boolean;
  }[];
  themes: readonly {
    label: string;
    level: "강하게 드러남" | "비교적 드러남" | "평균적" | "잔잔함";
    width: string;
  }[];
  relationship: { opening: string; insights: readonly { title: string; body: string }[] };
  lifeMap: {
    axes: readonly { label: string; x: number; y: number }[];
    strongestThemes: string;
  };
  crossReading: readonly { label: string; body: string }[];
};

export const ADULT_V2_PREVIEW_SAMPLE: AdultV2PreviewData = {
  subject: "김결",
  year: 2026,
  subtitle: "현재의 선택을 더 또렷하게 바라보는 인생 지도",
  coreWords: ["흐름을 읽는 사람", "기준을 세우는 사람", "조용히 완성하는 사람"],
  portrait: {
    lead: "빠르게 결론을 내리기보다, 충분히 살핀 뒤 스스로 납득하는 방식으로 움직이는 사람입니다.",
    outward: "쉽게 흔들리지 않고 신중한 사람처럼 보입니다. 중요한 자리에서는 말을 아끼고, 먼저 분위기와 사람을 읽는 편입니다.",
    inward: "실제로는 기준이 정해지면 생각보다 빠르게 움직입니다. 오래 망설이는 이유는 느려서가 아니라, 내 선택에 책임질 준비를 하기 때문입니다.",
    context: "이 리포트는 한 문장으로 사람을 규정하지 않습니다. 반복해서 보이는 선택의 방식과 지금의 신호를 함께 살펴봅니다.",
  },
  tendencies: {
    primary: {
      title: "관찰한 뒤, 내 방식으로 결정하는 사람",
      body: "처음부터 앞서기보다 상황의 구조를 읽고 필요한 순간에 움직입니다. 남들이 정한 속도보다 내가 확인한 기준이 있을 때 판단이 선명해집니다.",
    },
    supporting: [
      { title: "작은 기준의 힘", body: "사소한 약속과 생활 리듬을 지킬 때 큰 선택에서도 흔들림이 줄어듭니다." },
      { title: "정리하는 실행", body: "복잡한 일을 내 방식으로 나눠 볼수록, 다음 행동을 시작하기가 쉬워집니다." },
    ],
  },
  lifeFlow: [
    { ageRange: "24–33", theme: "기반을 만드는 시기", change: "테마 형성", prominence: "steady" },
    { ageRange: "34–43", theme: "역할을 넓히는 시기", change: "활성 증가", prominence: "rising" },
    { ageRange: "44–53", theme: "관계와 자원을 고르는 시기", change: "변화 집중", prominence: "focused", current: true },
    { ageRange: "54–63", theme: "표현 방식을 바꾸는 시기", change: "테마 전환", prominence: "turning" },
    { ageRange: "64–73", theme: "내 페이스를 되찾는 시기", change: "잔잔한 재정비", prominence: "quiet" },
  ],
  years: [
    { year: "2026", headline: "내 기준을 다시 세우고, 일의 우선순위를 정하는 해", primaryTheme: "자원·선택 테마가 강하게 드러남", secondaryTheme: "역할·책임 테마가 비교적 드러남", changePressure: "변화 압력 보통", keywords: ["#우선순위", "#일의방식", "#기준"], interpretation: "새로운 일을 무작정 늘리기보다, 이미 하고 있는 일 가운데 오래 가져갈 것을 가려보는 시간이 됩니다.", current: true },
    { year: "2027", headline: "사람을 늘리기보다 관계의 기준을 다시 세우는 해", primaryTheme: "관계·경쟁 테마가 강하게 드러남", secondaryTheme: "표현·실행 테마가 평균적으로 드러남", changePressure: "변화 압력 보통", keywords: ["#관계", "#선택", "#재조정"], interpretation: "가까운 사람과의 약속, 함께 일하는 방식, 내가 감당할 수 있는 거리를 구체적으로 정해볼 필요가 있습니다." },
    { year: "2028", headline: "생각해온 것을 밖으로 보여주는 일이 늘어나는 해", primaryTheme: "표현·실행 테마가 강하게 드러남", secondaryTheme: "배움·지원 테마가 비교적 드러남", changePressure: "변화 압력 높음", keywords: ["#발표", "#시도", "#확장"], interpretation: "말과 결과물로 내 생각을 보여줄 기회가 늘 수 있습니다. 완성도를 기다리기보다 작은 형태로 먼저 내놓는 연습이 도움이 됩니다." },
    { year: "2029", headline: "돈·시간·에너지를 어디에 쓸지 선택이 중요해지는 해", primaryTheme: "자원·선택 테마가 강하게 드러남", secondaryTheme: "관계·경쟁 테마가 평균적으로 드러남", changePressure: "변화 압력 보통", keywords: ["#자원", "#시간", "#선택"], interpretation: "쓸 수 있는 것과 지켜야 하는 것을 나눠 보면, 당장의 부담보다 다음 선택의 폭이 더 또렷해집니다." },
    { year: "2030", headline: "익숙한 방식에서 한 걸음 물러나 방향을 다시 보는 해", primaryTheme: "배움·지원 테마가 비교적 드러남", secondaryTheme: "역할·책임 테마가 평균적으로 드러남", changePressure: "변화 압력 높음", keywords: ["#전환", "#배움", "#재설계"], interpretation: "빠르게 답을 정하기보다, 어떤 역할을 계속 가져가고 싶은지 돌아보며 다음 시기의 기준을 마련하게 됩니다." },
  ],
  themes: [
    { label: "자원과 선택", level: "강하게 드러남", width: "76%" },
    { label: "역할과 책임", level: "비교적 드러남", width: "57%" },
    { label: "배움과 지원", level: "강하게 드러남", width: "68%" },
    { label: "표현과 실행", level: "비교적 드러남", width: "52%" },
  ],
  relationship: {
    opening: "관계에서 중요한 것은 정답을 빨리 찾는 일이 아니라, 나의 기준을 잃지 않고 서로의 속도를 살피는 일입니다.",
    insights: [
      { title: "관계에서 중요하게 여기는 것", body: "말보다 약속이 지켜지는 경험에서 신뢰를 느낍니다. 자주 보지 않아도 서로의 경계와 시간을 존중하는 관계를 편하게 여깁니다." },
      { title: "반복하기 쉬운 관계 패턴", body: "상대의 사정을 이해하려다 내 요구를 뒤로 미룰 수 있습니다. 쌓인 뒤에 한 번에 말하기보다, 작은 불편부터 짧게 표현하는 편이 관계를 가볍게 만듭니다." },
      { title: "지금 관계에서 필요한 태도", body: "도움을 주기 전에 내가 가능한 범위를 먼저 정해보세요. 관계를 지키는 일과 모든 요청을 받아들이는 일은 다를 수 있습니다." },
    ],
  },
  lifeMap: {
    axes: [
      { label: "자원", x: 150, y: 27 }, { label: "역할", x: 272, y: 116 }, { label: "표현", x: 225, y: 260 }, { label: "관계", x: 75, y: 260 }, { label: "변화", x: 28, y: 116 },
    ],
    strongestThemes: "자원과 선택, 그리고 배움과 지원이 현재 가장 강하게 움직이는 두 가지 주제입니다. 무엇을 더할지보다 어떤 선택에 시간과 에너지를 둘지 살펴보세요.",
  },
  crossReading: [
    { label: "사주에서 확인되는 장기 신호", body: "자원과 역할의 배치를 다시 보는 흐름이 이어집니다. 오래 가져갈 일과 관계의 기준을 세우는 일이 중심에 놓입니다." },
    { label: "타로에서 확인되는 현재 신호", body: "The Star는 서두른 확답보다, 내가 회복하고 싶은 방향을 다시 바라보는 장면을 비춥니다." },
    { label: "두 결과가 만나는 지점", body: "바깥의 요구에 바로 반응하기보다, 내 생활에 맞는 속도와 기준을 먼저 정하는 데 두 신호가 만납니다." },
    { label: "지금의 행동 제안", body: "이번 주에는 계속할 일 한 가지와 내려놓을 일 한 가지를 적어, 실제 일정표에서 자리를 바꿔보세요." },
  ],
};
