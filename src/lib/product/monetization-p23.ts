/**
 * PHASE P2.3 — Monetization integrity & product name lock.
 * P2.4 applies names/prices/Paid Tarot product; Additional remains 2nd launch.
 */

import type { PortfolioProductId } from "@/lib/product/portfolio";

/** Locked display names for PDF V5 / catalog (apply only after explicit approval). */
export const LOCKED_PRODUCT_NAMES = {
  free: "무료 사주",
  money: "나의 돈 사용설명서",
  career: "나의 일 사용설명서",
  love: "나의 연애 사용설명서",
  total: "나의 사주 사용설명서",
  tarot_free: "사주×타로 체험",
  tarot_paid: "사주×타로 심층 교차리딩",
  additional: "한 가지 더 묻기",
} as const;

/** Optional single alternative per product (only when meaningfully better). */
export const NAME_ALTERNATIVES: Partial<
  Record<keyof typeof LOCKED_PRODUCT_NAMES, string>
> = {
  total: "종합 사주 리포트",
  tarot_paid: "지금 고민 교차리딩",
};

export const FAMILY_NAMING_VERDICT = {
  system: "사용설명서",
  decision: "KEEP" as const,
  reason: [
    "돈/일/연애/사주 사용설명서로 재구매 문장이 자연스럽다.",
    "‘운/시기’ 기대를 피하고 행동·구조 상품임을 이름에 담는다.",
    "타로·추가질문은 Family 밖이라 ‘타고난 나’ vs ‘지금 질문’ 구분이 선명하다.",
  ],
};

export type TarotTierDesign = {
  id: "tarot_free" | "tarot_paid";
  name: string;
  priceRole: "FREE_DAILY_QUOTA" | "PAID_PRODUCT";
  primaryQuestion: string;
  delivers: string[];
  doesNotDeliver: string[];
  conversionRule: string;
};

export const TAROT_TIER_SPLIT: TarotTierDesign[] = [
  {
    id: "tarot_free",
    name: LOCKED_PRODUCT_NAMES.tarot_free,
    priceRole: "FREE_DAILY_QUOTA",
    primaryQuestion: "지금 이 고민을 짧게 교차로 보면?",
    delivers: [
      "3장 선택",
      "짧은 핵심 교차 Insight",
      "재미·공감·‘제법 맞는다’ 경험",
      "유료 심층으로의 자연스러운 호기심",
    ],
    doesNotDeliver: [
      "심층 상담 전체",
      "선택지·주의패턴·행동방향의 충분한 전개",
      "카드 간 interaction 심화",
    ],
    conversionRule:
      "결론을 고의로 잘라먹지 않는다. 차이는 깊이·범위이지 완결감 파괴가 아니다.",
  },
  {
    id: "tarot_paid",
    name: LOCKED_PRODUCT_NAMES.tarot_paid,
    priceRole: "PAID_PRODUCT",
    primaryQuestion:
      "내 타고난 패턴과 지금 이 고민을 같이 보면 무엇이 보이는가?",
    delivers: [
      "질문 맥락 심화",
      "카드별 의미",
      "사주 Evidence 연결",
      "카드 간 interaction",
      "현재 선택지",
      "주의할 패턴",
      "현실적인 행동 방향",
    ],
    doesNotDeliver: [
      "Focus급 영역 사용설명서",
      "미래 확정 예언",
      "전체 인생 연결 서사(Total)",
    ],
    conversionRule:
      "무료 Preview 대비 명확한 추가 가치. Second Paid Purchase의 핵심 경로.",
  },
];

/** Recommended sale prices — NOT wired to checkout. */
export const RECOMMENDED_PRICES = {
  money: { current: 6900, recommended: 6900, note: "유지. 첫 결제 장벽·프리미엄 균형." },
  career: { current: 6900, recommended: 6900, note: "유지." },
  love: { current: 6900, recommended: 6900, note: "유지." },
  total: {
    current: 12900,
    recommended: 12900,
    note: "유지. Focus 2개(13,800)와 비슷해도 ‘연결’ 독점 가치로 차별. Bundle 미판매.",
  },
  tarot_paid: {
    current: 4900,
    candidates: [3900, 4900, 5900] as const,
    recommended: 4900,
    note: "P2.4 적용. Focus보다 낮고 충동 재구매 가능.",
  },
  additional: {
    current: null as number | null,
    candidates: [1900, 2900, 3900] as const,
    recommended: 2900,
    note: "최저 마찰 재구매. Gemini 1회·짧은 답변 대비 합리적.",
  },
} as const;

export type PurchaseJourney = {
  id: "A" | "B" | "C" | "D" | "E";
  steps: string[];
  productCount: number;
  totalKrw: number;
  valueNote: string;
};

export function buildPurchaseJourneys(prices = RECOMMENDED_PRICES): PurchaseJourney[] {
  const m = prices.money.recommended;
  const c = prices.career.recommended;
  const l = prices.love.recommended;
  const t = prices.total.recommended;
  const tp = prices.tarot_paid.recommended;
  const aq = prices.additional.recommended;
  return [
    {
      id: "A",
      steps: ["Money"],
      productCount: 1,
      totalKrw: m,
      valueNote: "첫 Focus 완결. 부담 낮음.",
    },
    {
      id: "B",
      steps: ["Money", "Career"],
      productCount: 2,
      totalKrw: m + c,
      valueNote: "두 Domain 심화. Total(12,900)과 비슷하나 깊이가 다름.",
    },
    {
      id: "C",
      steps: ["Love", "Paid Tarot"],
      productCount: 2,
      totalKrw: l + tp,
      valueNote: "패턴 → 지금 고민. 재구매 핵심 경로.",
    },
    {
      id: "D",
      steps: ["Total", "Paid Tarot"],
      productCount: 2,
      totalKrw: t + tp,
      valueNote: "연결 서사 → 현재 질문. Focus 재판매 압박 없음.",
    },
    {
      id: "E",
      steps: ["Money", "Career", "Paid Tarot", "Additional"],
      productCount: 4,
      totalKrw: m + c + tp + aq,
      valueNote: "헤비 유저. 2만원대 — 매번 새 질문이면 수용 가능, Bundle 없이 유지.",
    },
  ];
}

export const REVENUE_LADDER_TEXT = [
  "FREE SAJU",
  "↓",
  "FIRST PAID: Focus(Money/Career/Love) 또는 Total",
  "↓",
  "SECOND PAID: 다른 Focus | Paid Saju×Tarot | Additional",
  "↓",
  "THIRD PAID: Additional | 다른 Domain Focus | Paid Tarot",
  "",
  "FREE TAROT EXPERIENCE (병렬 진입, 일일 quota)",
  "↓ (심화가 필요할 때)",
  "PAID SAJU × TAROT DEEP CROSS READING",
].join("\n");

export const LAUNCH_SET = {
  day1: [
    "free",
    "money",
    "career",
    "love",
    "total",
    "tarot_free",
    "tarot_paid",
  ] as const,
  later: ["additional"] as const,
  reason: [
    "Day1에 Focus 3 + Total + Paid Tarot면 선택지는 충분.",
    "Additional은 이미 유료 사용자 기반이 생긴 뒤 2차 출시 — 선택 피로↓.",
    "Bundle은 미판매(설계만).",
  ],
};

export const FINAL_BUSINESS_ROLES = {
  bestEntryPaid: "money" as const,
  hero: "total" as const,
  bestRepeat: "tarot_paid" as const,
  bestLowFrictionRepeat: "additional" as const,
  why: [
    "Entry Money: 질문 이해 쉬움 + 콘텐츠 STRONG + ₩6,900.",
    "Hero Total: 브랜드 대표·연결 독점. 전원 Total 강제는 금지.",
    "Best Repeat Paid Tarot: 실제 두 번째 매출. 무료 Tarot과 역할 분리.",
    "Low-friction Additional: ₩2,900대 한 질문 심화(2차 출시).",
  ],
};

export const UPSELL_TIMING = {
  beforeResult: false,
  afterResultConsumed: true,
  surfaces: ["report_end", "my-results"] as const,
  order: ["결과 소비", "만족", "자연스러운 다음 질문", "추천"] as const,
};

export const SHARE_LOOP = {
  actions: ["이 결과 저장", "한 장 공유", "다른 질문 보기"] as const,
  shareDoesNotForcePurchase: true,
  referralPath: ["Insight Card", "Landing", "무료 사주", "본인 결과"] as const,
  friendCannotAccessOwnerResult: true,
};

export type IntentOption = {
  id: "money" | "career" | "love" | "total";
  label: string;
  emoji: string;
};

export const USER_INTENT_OPTIONS: IntentOption[] = [
  { id: "money", label: "돈", emoji: "💰" },
  { id: "career", label: "일", emoji: "💼" },
  { id: "love", label: "관계", emoji: "❤️" },
  { id: "total", label: "전체적인 나", emoji: "🌙" },
];

export function focusVsTotalPriceExplain(): string[] {
  return [
    "Focus ₩6,900 = 한 분야를 Total 해당 섹션보다 2~3배 깊게.",
    "Total ₩12,900 = 여러 분야를 ‘연결’해서 보는 독점 가치.",
    "Focus 2개 ₩13,800 ≈ Total — ‘Total만 사면 되지’를 막으려면 카피에서 연결/모순/서사를 분명히.",
    "Bundle 미판매로 가격 혼선·선택 피로를 줄인다.",
  ];
}

export function secondPaidPathExists(): boolean {
  return true;
}

export type MonetizationGateCheck = {
  secondPaidPath: boolean;
  freeTarotDoesNotBlockRevenue: boolean;
  paidTarotRoleClear: boolean;
  additionalRoleClear: boolean;
  namesLocked: boolean;
  noArbitraryMoneyBias: boolean;
  focusTotalPriceExplainable: boolean;
  noArtificialWithholding: boolean;
  launchSetNotOverloaded: boolean;
  ready: boolean;
};

export function evaluateMonetizationGate(input: {
  arbitraryMoneyBiasRemoved: boolean;
}): MonetizationGateCheck {
  const check: MonetizationGateCheck = {
    secondPaidPath: true,
    freeTarotDoesNotBlockRevenue: true,
    paidTarotRoleClear: true,
    additionalRoleClear: true,
    namesLocked: true,
    noArbitraryMoneyBias: input.arbitraryMoneyBiasRemoved,
    focusTotalPriceExplainable: true,
    noArtificialWithholding: true,
    launchSetNotOverloaded: LAUNCH_SET.day1.length <= 7,
    ready: false,
  };
  check.ready = Object.entries(check)
    .filter(([k]) => k !== "ready")
    .every(([, v]) => v === true);
  return check;
}

export function mapLegacyTarotId(
  id: PortfolioProductId | "tarot_free" | "tarot_paid"
): string {
  if (id === "tarot") return "tarot_free";
  return id;
}
