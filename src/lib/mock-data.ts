import type {
  AdminDashboardStats,
  FreeResult,
  PaidReport,
  Product,
} from "@/types";

/** Demo IDs aligned with supabase/seed.sql where possible */
export const MOCK_PRODUCT_IDS = {
  total: "33333333-3333-3333-3333-333333333301",
  money: "33333333-3333-3333-3333-333333333302",
  career: "33333333-3333-3333-3333-333333333303",
  love: "33333333-3333-3333-3333-333333333304",
  total2027: "33333333-3333-3333-3333-333333333305",
} as const;

export const mockProducts: Product[] = [
  {
    id: MOCK_PRODUCT_IDS.total,
    name: "2026년 종합운세",
    slug: "2026-total",
    shortDescription: "올해의 흐름과 월별 운세까지 한눈에",
    description:
      "타고난 성향, 재물·직업·연애운, 1~12월 월별 흐름까지 2026년 전체를 상세히 풀어드립니다. 지금 내게 중요한 시기와 행동을 확인하세요.",
    regularPrice: 19900,
    salePrice: 12900,
    thumbnailUrl: "/images/product-total.svg",
    freeRatio: 30,
    promptName: "2026-total@v1",
    templateId: "standard-report",
    status: "ACTIVE",
    sortOrder: 1,
  },
  {
    id: MOCK_PRODUCT_IDS.total2027,
    name: "2027년 종합운세",
    slug: "2027-total",
    shortDescription: "내년의 흐름과 월별 운세까지 미리 보기",
    description:
      "2027년 전체 흐름과 재물·직업·연애, 1~12월 월별 리듬을 상세히 풀어드립니다. 한 해 앞을 준비할 때 참고하세요.",
    regularPrice: 19900,
    salePrice: 12900,
    thumbnailUrl: "/images/product-total.svg",
    freeRatio: 30,
    promptName: "2027-total@v1",
    templateId: "standard-report",
    status: "ACTIVE",
    sortOrder: 2,
  },
  {
    id: MOCK_PRODUCT_IDS.money,
    name: "재물운 집중분석",
    slug: "2026-money",
    shortDescription: "돈의 흐름과 새는 패턴을 집중 분석",
    description:
      "돈이 들어오는 방식, 새기 쉬운 습관, 상·하반기 차이, 기회를 활용하기 좋은 시기를 현실적으로 안내합니다.",
    regularPrice: 9900,
    salePrice: 6900,
    thumbnailUrl: "/images/product-money.svg",
    freeRatio: 30,
    promptName: "money@v1",
    templateId: "standard-report",
    status: "ACTIVE",
    sortOrder: 3,
  },
  {
    id: MOCK_PRODUCT_IDS.career,
    name: "직장·이직운",
    slug: "2026-career",
    shortDescription: "이직·승진·직업 선택의 타이밍",
    description:
      "직장운의 흐름과 이직하기 좋은 시기, 피해야 할 시기를 중심으로 분석합니다.",
    regularPrice: 9900,
    salePrice: 6900,
    thumbnailUrl: "/images/product-career.svg",
    freeRatio: 30,
    promptName: "career@v1",
    templateId: "standard-report",
    status: "ACTIVE",
    sortOrder: 4,
  },
  {
    id: MOCK_PRODUCT_IDS.love,
    name: "연애운",
    slug: "2026-love",
    shortDescription: "만남과 관계의 흐름",
    description:
      "연애 성향과 올해의 인연 흐름, 관계에서 주의할 포인트를 풀어드립니다.",
    regularPrice: 9900,
    salePrice: 6900,
    thumbnailUrl: "/images/product-love.svg",
    freeRatio: 30,
    promptName: "love@v1",
    templateId: "standard-report",
    status: "ACTIVE",
    sortOrder: 5,
  },
];

export const mockFreeResult: FreeResult = {
  id: "demo",
  nickname: "수지",
  headline: "변화를 준비해야 하는 해",
  summary:
    "당신은 겉으로 보기보다 내면의 기준이 강한 사람입니다. 올해는 기존 방식에서 벗어나 새로운 선택을 하게 될 가능성이 높은 시기입니다.",
  scores: {
    overall: 4,
    money: 4,
    career: 5,
    love: 3,
  },
  keywords: ["변화", "선택", "확장"],
  sections: [
    {
      key: "personality",
      title: "타고난 성향",
      summary: "겉보다 내면의 기준이 강한 사람",
      detail:
        "상황을 빠르게 판단하기보다, 자신만의 기준을 세운 뒤 움직이는 편입니다. 주변의 기대보다 스스로 납득할 수 있는 선택을 중시합니다.",
      locked: false,
    },
    {
      key: "overall_2026",
      title: "2026 전체운",
      summary: "새로운 선택을 하게 될 가능성이 높은 시기",
      detail:
        "올해는 기존 방식에서 벗어나 방향을 다시 잡는 흐름으로 해석할 수 있습니다. 작은 결정이 이후 확장으로 이어질 수 있습니다.",
      locked: false,
    },
    {
      key: "money",
      title: "재물운",
      summary: "돈의 흐름 자체는 나쁘지 않습니다. 다만...",
      detail:
        "수입의 통로는 열려 있으나, 지출 패턴을 점검하지 않으면 남는 돈이 줄어들 수 있습니다.",
      locked: true,
    },
    {
      key: "career_timing",
      title: "이직하기 좋은 시기",
      summary: "직장·이직의 타이밍이 중요해지는 해",
      detail: "상세 내용은 유료 리포트에서 확인할 수 있습니다.",
      locked: true,
    },
    {
      key: "avoid_timing",
      title: "피해야 할 시기",
      summary: "무리한 확장을 조심해야 하는 구간",
      detail: "상세 내용은 유료 리포트에서 확인할 수 있습니다.",
      locked: true,
    },
    {
      key: "money_up",
      title: "금전운이 올라가는 달",
      summary: "기회가 모이는 구간이 있습니다",
      detail: "상세 내용은 유료 리포트에서 확인할 수 있습니다.",
      locked: true,
    },
    {
      key: "relation_caution",
      title: "인간관계 주의 시기",
      summary: "말과 경계가 중요해지는 때",
      detail: "상세 내용은 유료 리포트에서 확인할 수 있습니다.",
      locked: true,
    },
  ],
  recommendedProductSlug: "2026-total",
};

export const mockPaidReport: PaidReport = {
  id: "demo",
  orderNo: "20260820-00031",
  nickname: "수지",
  productName: "2026년 종합운세",
  headline: "변화를 준비해야 하는 해",
  summary:
    "올해는 기존 리듬을 유지하기보다, 방향을 재설정하는 선택이 더 유리하게 작용할 수 있습니다. 성급함보다 기준을 세운 뒤 움직이는 흐름이 맞습니다.",
  keywords: ["변화", "선택", "확장"],
  chapters: [
    {
      number: "01",
      title: "나의 기본 성향",
      body: "당신은 겉으로 드러나는 인상보다 내면의 기준이 분명한 편입니다. 타인의 속도에 맞추기보다, 스스로 납득한 뒤에야 행동이 빨라집니다. 이 성향은 올해처럼 선택의 기로가 많은 해에 오히려 강점이 될 수 있습니다.",
    },
    {
      number: "02",
      title: "2026년 전체운",
      body: "전체적으로는 ‘정비 후 확장’의 흐름으로 해석할 수 있습니다. 상반기에는 정리와 기준 잡기, 하반기에는 그 기준을 바탕으로 한 실행이 더 잘 맞을 가능성이 있습니다.",
    },
    {
      number: "03",
      title: "재물운",
      body: "수입의 통로 자체는 막혀 있지 않습니다. 다만 지출이 감정적으로 커지는 패턴이 반복될 수 있어, 고정비와 변동비를 구분해 관리하는 편이 좋습니다. 투자나 큰 지출은 한 번에 결정하기보다 단계를 나누는 방식이 더 안정적입니다.",
    },
    {
      number: "04",
      title: "직업운",
      body: "올해 직업운은 비교적 활발합니다. 지금의 자리에서 역할을 넓히는 방향과, 환경 자체를 바꾸는 방향 모두 열려 있습니다. 중요한 것은 타이밍보다 ‘내가 무엇을 기준으로 옮기는가’입니다.",
    },
    {
      number: "05",
      title: "연애운",
      body: "관계에서는 속도보다 신뢰가 더 크게 작용할 수 있습니다. 새로운 만남이 있다면 초반의 호감만으로 판단하기보다, 생활 리듬이 맞는지 살펴보는 편이 좋습니다.",
    },
    {
      number: "06",
      title: "주의할 시기",
      body: "결정을 서두르거나, 주변의 기대에 맞춰 방향을 바꾸는 구간에서는 피로가 커질 수 있습니다. 특히 감정적으로 흔들릴 때는 큰 금전·계약 결정을 하루 미뤄보는 것이 도움이 됩니다.",
    },
    {
      number: "07",
      title: "기회를 잡을 시기",
      body: "준비가 끝난 뒤의 실행 구간에서 기회가 더 잘 열릴 수 있습니다. 혼자 판단하기 어렵다면, 신뢰하는 사람의 조언을 ‘결정’이 아니라 ‘관점’으로 활용하는 방식이 맞습니다.",
    },
    {
      number: "08",
      title: "나를 위한 행동 가이드",
      body: "1) 이번 달의 우선순위 3가지만 적어두기 2) 지출 패턴을 한 줄로 기록하기 3) 이직·관계·투자 중 한 번에 하나만 크게 움직이기. 운세는 참고이며, 선택은 언제나 본인의 기준에서 시작됩니다.",
    },
  ],
  monthlyOutlook: [
    { month: 1, title: "2026년 1월 · 정비", summary: "기준 잡기", detail: "무리한 확장보다 정리와 방향 설정에 무게를 두는 달이 될 수 있습니다.", focus: ["정비", "기준"] },
    { month: 2, title: "2026년 2월 · 관계 점검", summary: "소통", detail: "약속과 일정을 다시 맞추며 관계 온도를 점검하기 좋은 흐름입니다.", focus: ["관계", "소통"] },
    { month: 3, title: "2026년 3월 · 실행 준비", summary: "작은 시도", detail: "큰 결정보다 작은 루틴을 만들어 실행력을 키우는 달이 될 수 있습니다.", focus: ["준비", "루틴"] },
    { month: 4, title: "2026년 4월 · 재정 점검", summary: "고정비", detail: "지출 패턴을 돌아보고 고정비·변동비를 나누어 보면 안정감이 커질 수 있습니다.", focus: ["재정", "점검"] },
    { month: 5, title: "2026년 5월 · 외부 활동", summary: "네트워크", detail: "정보 수집과 외부 만남이 도움이 될 수 있으나, 과한 약속은 줄이는 편이 좋습니다.", focus: ["활동", "정보"] },
    { month: 6, title: "2026년 6월 · 중간 점검", summary: "페이스 조절", detail: "상반기 성과를 정리하고 과로를 경계하며 페이스를 맞추는 달이 될 수 있습니다.", focus: ["점검", "휴식"] },
    { month: 7, title: "2026년 7월 · 재정비", summary: "우선순위", detail: "불필요한 약속을 줄이고 우선순위를 다시 세우는 흐름이 잘 맞을 수 있습니다.", focus: ["정리", "우선순위"] },
    { month: 8, title: "2026년 8월 · 실행 가속", summary: "선택 좁히기", detail: "결정을 미루기보다 근거를 적고 선택지를 좁혀 가는 달이 될 수 있습니다.", focus: ["실행", "선택"] },
    { month: 9, title: "2026년 9월 · 성과 확인", summary: "피드백", detail: "결과와 관계 온도를 함께 확인하며 피드백을 반영하기 좋은 시기입니다.", focus: ["성과", "피드백"] },
    { month: 10, title: "2026년 10월 · 수확 준비", summary: "문서화", detail: "다음 분기를 위해 기록을 남기고 계획을 스케치하는 달이 될 수 있습니다.", focus: ["수확", "계획"] },
    { month: 11, title: "2026년 11월 · 정리·마감", summary: "정산", detail: "신규 착수보다 마감과 감사·정산에 무게를 두는 편이 안정적일 수 있습니다.", focus: ["마감", "정리"] },
    { month: 12, title: "2026년 12월 · 내년 준비", summary: "방향 스케치", detail: "휴식과 함께 내년 방향을 가볍게 스케치하는 달이 될 수 있습니다.", focus: ["휴식", "준비"] },
  ],
};

export const mockAdminStats: AdminDashboardStats = {
  visitors: 1203,
  freeFortune: 482,
  payments: 37,
  revenue: 477300,
  conversionRate: 3.07,
  funnel: [
    { label: "방문", value: 1203 },
    { label: "사주입력", value: 674 },
    { label: "무료결과", value: 603 },
    { label: "결제화면", value: 91 },
    { label: "구매", value: 37 },
  ],
  productPerformance: [
    { name: "2026년 종합운세", purchases: 21, revenue: 270900 },
    { name: "재물운 집중분석", purchases: 8, revenue: 55200 },
    { name: "직장·이직운", purchases: 5, revenue: 34500 },
    { name: "연애운", purchases: 3, revenue: 20700 },
  ],
};

export const birthPlaces = [
  "서울",
  "경기",
  "인천",
  "부산",
  "대구",
  "광주",
  "대전",
  "울산",
  "세종",
  "강원",
  "충북",
  "충남",
  "전북",
  "전남",
  "경북",
  "경남",
  "제주",
  "해외",
];

export function getMockProductBySlug(slug: string) {
  return mockProducts.find((p) => p.slug === slug);
}

export function getMockProductById(id: string) {
  return mockProducts.find((p) => p.id === id);
}

/** @deprecated use repository helpers */
export const getProductBySlug = getMockProductBySlug;
/** @deprecated use repository helpers */
export const getProductById = getMockProductById;
