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
    name: "종합 사주 리포트",
    slug: "2026-total",
    shortDescription: "성향·일·돈·관계를 하나의 리포트로",
    description:
      "타고난 성향과 결정 방식, 일·돈·관계에서 반복되는 패턴을 행동 중심으로 풀어 드립니다. 대운·세운 기반의 연도/월별 길흉 예언은 포함하지 않습니다.",
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
    name: "2027년 종합운세 (준비중)",
    slug: "2027-total",
    shortDescription: "대운·세운 엔진 준비 후 오픈 예정",
    description:
      "연도/월별 운세는 대운·세운 데이터가 필요합니다. 현재 엔진에서는 제공하지 않아 판매를 일시 중지했습니다.",
    regularPrice: 19900,
    salePrice: 12900,
    thumbnailUrl: "/images/product-total.svg",
    freeRatio: 30,
    promptName: "2027-total@v1",
    templateId: "standard-report",
    status: "INACTIVE",
    sortOrder: 2,
  },
  {
    id: MOCK_PRODUCT_IDS.money,
    name: "재물운 집중분석",
    slug: "2026-money",
    shortDescription: "돈의 성향·새는 패턴·활용법을 깊게",
    description:
      "돈을 대하는 기본 성향, 벌고 새는 패턴, 판단이 흔들릴 때, 안정적으로 만드는 방식과 현실적인 행동 가이드를 집중 분석합니다. 특정 월·상하반기 길흉 타이밍 예언은 포함하지 않습니다.",
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
    shortDescription: "잘 맞는 업무·조직 환경 집중 분석",
    description:
      "일할 때의 캐릭터, 능력이 살아나는 업무, 답답해지는 조직, 갈등·과부하·인정 방식과 변화 신호를 행동 중심으로 분석합니다. 이직 월·승진 시기 예언은 포함하지 않습니다.",
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
    shortDescription: "끌림·갈등·거리의 행동 패턴 분석",
    description:
      "마음이 가는 방식, 관계가 깊어진 뒤의 패턴, 싸움과 거리, 잘 맞는 관계 방식을 실제 행동 중심으로 풀어 드립니다. 올해 인연·만남 시기 예언은 포함하지 않습니다.",
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
  productName: "종합 사주 리포트",
  headline: "확인 후에야 속도가 나는 손",
  signatureStatement:
    "확인 후에야 속도가 나는 기질 — 그 손이 일과 관계와 돈을 관통합니다.",
  freeBridge: "무료 한 줄은 입구일 뿐입니다. 아래는 영역이 맞물리는 사용법입니다.",
  summary:
    "결정·관계·일·돈이 같은 확인 습관으로 연결됩니다. 대운·세운은 포함하지 않습니다.",
  profileDashboard: [
    { label: "가장 강한 기질", value: "기준 확인 후 추진" },
    { label: "판단 방식", value: "수집 → 확정 2단" },
    { label: "관계 방식", value: "범위 선언 후 챙김" },
    { label: "일 방식", value: "선명 목표 + 자율" },
    { label: "돈 방식", value: "통제·검수 가능한 흐름" },
  ],
  fiveElementsSnapshot: [
    { key: "wood", label: "木", count: 0 },
    { key: "fire", label: "火", count: 3 },
    { key: "earth", label: "土", count: 1 },
    { key: "metal", label: "金", count: 4 },
    { key: "water", label: "水", count: 0 },
  ],
  keywords: ["확인", "경계", "위임", "통제감"],
  chapters: [
    {
      number: "01",
      title: "Decision Profile",
      question: "나는 어떻게 결정하는가?",
      coreInsight: "정보가 부족할수록 속도를 늦추고, 책임질 결정일수록 번복을 싫어합니다.",
      body: "타인이 재촉하면 보류를 확보한 뒤 자료를 더 모읍니다.",
      behaviorScenes: [
        "타인이 재촉하면 일단 보류를 확보한 뒤 자료를 더 모읍니다.",
      ],
      evidenceExplanation: [
        "일간의 경계와 검증 성향이 결정을 2단 절차로 만듭니다.",
      ],
      evidence: ["dayMaster"],
    },
  ],
  contradictions: [
    {
      poleA: "남의 이야기를 들음",
      poleB: "최종은 자기 기준",
      howItShows: "자리에서는 경청하지만 결론 문장은 혼자 다시 씁니다.",
      upside: "충동 합의를 줄입니다.",
      downside: "이미 정한 것처럼 보일 수 있습니다.",
      whenStronger: "책임이 큰 결정",
    },
  ],
  strengthShadows: [
    {
      strength: "끝까지 확인",
      overuse: "모든 단계를 직접 검수",
      problem: "위임 지연",
    },
  ],
  lifeScenes: [
    "회의 경청 후 집에서 결론 재작성",
    "구매 전 기준 3줄 메모",
  ],
  actionItems: [
    {
      domain: "work",
      what: "위임 1건/주",
      why: "과부하 예방",
      how: "검수 포인트만 남기고 넘김",
    },
  ],
  finalSummary: {
    strengths: ["확인 후 추진", "선명한 목표에서의 실행"],
    cautions: ["위임 지연", "공유 지연"],
    changeHabits: ["결론을 하루 안에 공유"],
    keepHabits: ["결정 전 짧은 기준 메모"],
    closingLine: "운의결: 확인 포인트를 설계하는 것이 강점을 쓰는 법입니다.",
  },
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
    { name: "종합 사주 리포트", purchases: 21, revenue: 270900 },
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
