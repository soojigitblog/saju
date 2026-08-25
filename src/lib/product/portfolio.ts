/**
 * PHASE P2.2 — Product Portfolio & Repurchase Architecture (design source of truth).
 *
 * Does NOT mutate products DB, payment, bank, Telegram, or PDF.
 * Name recommendations are proposals only until explicitly approved.
 */

export type PortfolioProductId =
  | "free"
  | "money"
  | "career"
  | "love"
  | "total"
  | "tarot"
  | "tarot_paid"
  | "additional";

/** @deprecated alias — prefer tarot for free experience, tarot_paid for revenue */
export type TarotFreeProductId = "tarot";

export type ConflictLevel = "CLEAR" | "MINOR OVERLAP" | "CONFLICT";

export type ProductRole = {
  id: PortfolioProductId;
  primaryQuestion: string;
  role: string;
  whatUserGets: string[];
  whatUserDoesNotGet: string[];
  whyWorthPaying: string;
  naturalNextQuestions: string[];
  nextProductCandidates: PortfolioProductId[];
  uvp: string;
  /** Current catalog name if it exists in products DB / UX; null if not a DB product yet */
  currentName: string | null;
  currentSlug: string | null;
  currentSalePrice: number | null;
  currentRegularPrice: number | null;
  currentStatus: "ACTIVE" | "INACTIVE" | "FREE_FLOW" | "DESIGN_ONLY";
  nameCandidates: [string, string, string];
  recommendedName: string;
  nameNotes: string;
};

/** Current ACTIVE fortune products from seed / migration 0022 (read-only mirror). */
export const CURRENT_ACTIVE_PRODUCT_AUDIT = [
  {
    slug: "2026-total",
    name: "나의 사주 사용설명서",
    shortDescription: "판단·관계·일·돈·사랑이 한 사람 안에서 어떻게 연결되는지",
    salePrice: 12900,
    regularPrice: 19900,
    productType: "fortune",
    promptVersionLabel: "2026-total@v1",
    timingRisk: "LOW" as const,
    notes: "P2.4 LOCK 적용.",
  },
  {
    slug: "2026-money",
    name: "나의 돈 사용설명서",
    shortDescription: "벌고 쓰고 판단하고 관리할 때 반복되는 돈의 패턴",
    salePrice: 6900,
    regularPrice: 9900,
    productType: "fortune",
    promptVersionLabel: "money@v1",
    timingRisk: "LOW" as const,
    notes: "P2.4 LOCK 적용. ‘운’ 제거.",
  },
  {
    slug: "2026-career",
    name: "나의 일 사용설명서",
    shortDescription: "직업명이 아니라, 능력이 살아나는 일의 조건과 패턴",
    salePrice: 6900,
    regularPrice: 9900,
    productType: "fortune",
    promptVersionLabel: "career@v1",
    timingRisk: "LOW" as const,
    notes: "P2.4 LOCK 적용. ‘이직운’ 제거.",
  },
  {
    slug: "2026-love",
    name: "나의 연애 사용설명서",
    shortDescription: "관계가 깊어질수록 달라지는 나의 패턴",
    salePrice: 6900,
    regularPrice: 9900,
    productType: "fortune",
    promptVersionLabel: "love@v1",
    timingRisk: "LOW" as const,
    notes: "P2.4 LOCK 적용. ‘연애운’ 제거.",
  },
  {
    slug: "saju-tarot-deep",
    name: "사주×타로 심층 교차리딩",
    shortDescription: "타고난 패턴과 지금 이 고민을 깊게 교차로 읽기",
    salePrice: 4900,
    regularPrice: 6900,
    productType: "tarot_paid",
    promptVersionLabel: "saju-tarot-deep@v1",
    timingRisk: "LOW" as const,
    notes: "P2.4 Paid Tarot ACTIVE.",
  },
] as const;

export const CURRENT_INACTIVE_PRODUCT_AUDIT = [
  {
    slug: "2027-total",
    name: "2027년 종합운세 (준비중)",
    salePrice: 12900,
    status: "INACTIVE" as const,
    reason: "대운·세운 엔진 미지원 → 판매 중지 유지 권고.",
  },
] as const;

export const PRODUCT_ROLES: Record<PortfolioProductId, ProductRole> = {
  free: {
    id: "free",
    primaryQuestion: "나는 어떤 사람인가?",
    role: "빠른 공감 + 신뢰 형성. 모든 해석을 끝내지 않되, 일부러 부실하게 만들지 않는다.",
    whatUserGets: [
      "일간·오행·십성 기반의 핵심 성향 요약",
      "공감 가능한 한 줄 훅",
      "유료로 이어질 수 있는 미리보기",
    ],
    whatUserDoesNotGet: [
      "영역별 심층 행동 장면",
      "영역 간 연결 서사",
      "현재 고민에 대한 타로 교차 해석",
    ],
    whyWorthPaying: "무료 (진입 게이트)",
    naturalNextQuestions: [
      "돈 앞에서 나는 어떻게 움직이는가?",
      "일할 때 나는 어떤 조건에서 살아나는가?",
      "관계가 깊어질수록 나는 어떻게 달라지는가?",
    ],
    nextProductCandidates: ["money", "career", "love", "total"],
    uvp: "짧은 시간에, 내가 어떤 사람인지 납득할 수 있는 첫 그림을 줍니다.",
    currentName: "무료 사주",
    currentSlug: null,
    currentSalePrice: 0,
    currentRegularPrice: 0,
    currentStatus: "FREE_FLOW",
    nameCandidates: ["무료 사주", "나의 첫 사주 스케치", "운의결 무료 성향"],
    recommendedName: "무료 사주",
    nameNotes: "진입 장벽 최소. 변경 불필요.",
  },
  money: {
    id: "money",
    primaryQuestion: "나는 돈 앞에서 어떻게 움직이는가?",
    role: "Focus — 수입·지출·판단·사각·사람과 돈·관리까지 해당 주제 완결.",
    whatUserGets: [
      "돈 판단의 기준과 사각지대",
      "수입/지출/누수 행동 장면",
      "사람과 돈이 겹칠 때의 패턴",
      "관리 방식·행동 옵션",
    ],
    whatUserDoesNotGet: [
      "직업·조직 환경의 심층 분석",
      "연애 단계별 관계 패턴",
      "영역 간 연결 서사 (Total 독점)",
      "월별 재물 길흉 타이밍",
    ],
    whyWorthPaying: "돈 주제만으로 행동 단위까지 충분히 볼 수 있음.",
    naturalNextQuestions: [
      "돈에서는 이런데, 일할 때도 같은가?",
      "돈 판단과 관계 경계는 어떻게 연결되는가?",
      "지금 이 금전 고민을 사주×타로로 보면?",
    ],
    nextProductCandidates: ["career", "total", "tarot_paid"],
    uvp: "돈을 벌고 쓰는 순간마다, 나는 어떤 기준으로 움직이는지 읽습니다.",
    currentName: "나의 돈 사용설명서",
    currentSlug: "2026-money",
    currentSalePrice: 6900,
    currentRegularPrice: 9900,
    currentStatus: "ACTIVE",
    nameCandidates: ["나의 돈 사용설명서", "돈을 대하는 나", "재물 사주 분석"],
    recommendedName: "나의 돈 사용설명서",
    nameNotes: "‘재물운’의 시기 기대를 낮추고, Focus 완결성을 이름에 담음.",
  },
  career: {
    id: "career",
    primaryQuestion: "나는 어떤 방식으로 일할 때 가장 잘 살아나는가?",
    role: "Focus — 업무 시작·책임·자율·조직·인정·과부하·변화 욕구까지 완결.",
    whatUserGets: [
      "강점이 살아나는 업무 구조",
      "조직·상사·동료 마찰 패턴",
      "인정·과부하·변화 욕구 신호",
      "이직 ‘시기’가 아닌 ‘환경 신호’",
    ],
    whatUserDoesNotGet: [
      "직업명 추천",
      "이직/승진 월 예언",
      "돈·연애 심층",
      "영역 연결 서사",
    ],
    whyWorthPaying: "직업명이 아니라 일의 조건·조직 리듬을 깊게 본다.",
    naturalNextQuestions: [
      "일에서는 기준이 분명한데, 돈에서는 왜 다른가?",
      "지금 이직/제안 고민을 사주×타로로 보면?",
      "일 강점이 관계에서는 어떻게 보이는가?",
    ],
    nextProductCandidates: ["money", "tarot_paid", "total"],
    uvp: "직업명이 아니라, 내 능력이 살아나는 일의 조건을 읽습니다.",
    currentName: "나의 일 사용설명서",
    currentSlug: "2026-career",
    currentSalePrice: 6900,
    currentRegularPrice: 9900,
    currentStatus: "ACTIVE",
    nameCandidates: ["나의 일 사용설명서", "일할 때의 나", "직업·커리어 사주 분석"],
    recommendedName: "나의 일 사용설명서",
    nameNotes: "‘이직운’ 시기 기대가 가장 위험. rename 우선순위 1.",
  },
  love: {
    id: "love",
    primaryQuestion: "나는 관계가 깊어질수록 어떻게 달라지는가?",
    role: "Focus — 호감·확신 전후·표현·서운·갈등·거리·회복까지 완결.",
    whatUserGets: [
      "확신 전/후 속도 차이",
      "표현·서운·갈등·회복 장면",
      "관계 안정 조건",
      "궁합 단정 없는 관계 방식 설명",
    ],
    whatUserDoesNotGet: [
      "인연 시기·만남 예언",
      "상대 유형 단정 궁합",
      "이별/배신 공포 마케팅",
      "돈·일 심층",
    ],
    whyWorthPaying: "관계가 깊어질수록 달라지는 ‘나’를 단계별로 본다.",
    naturalNextQuestions: [
      "지금 이 사람과의 관계를 사주×타로로 보면?",
      "관계 거리 조절이 일에서는 어떻게 나타날까?",
      "전체 삶에서 이 패턴은 어떻게 연결되는가?",
    ],
    nextProductCandidates: ["tarot_paid", "total", "career"],
    uvp: "누구를 만날지가 아니라, 관계가 깊어질수록 달라지는 나를 읽습니다.",
    currentName: "나의 연애 사용설명서",
    currentSlug: "2026-love",
    currentSalePrice: 6900,
    currentRegularPrice: 9900,
    currentStatus: "ACTIVE",
    nameCandidates: ["나의 연애 사용설명서", "사랑할 때의 나", "연애·관계 사주 분석"],
    recommendedName: "나의 연애 사용설명서",
    nameNotes: "‘연애운’ → 행동 패턴 중심으로 rename 권고.",
  },
  total: {
    id: "total",
    primaryQuestion: "이 모든 모습이 나라는 사람 안에서 어떻게 연결되어 있는가?",
    role: "연결형 종합 — Focus 붙이기가 아니라 모순·강점→그림자·영역 상호작용.",
    whatUserGets: [
      "영역 간 연결",
      "Contradiction / Strength→Shadow",
      "전체 Personal Narrative",
      "삶의 운영 구조 한 장",
    ],
    whatUserDoesNotGet: [
      "Money/Career/Love 각각의 2~3배 심층",
      "현재 구체 고민의 타로 교차",
      "연도/월별 길흉",
    ],
    whyWorthPaying: "‘왜 영역마다 다른 사람이 되는지’를 연결해서 보여준다.",
    naturalNextQuestions: [
      "그중 가장 깊게 보고 싶은 Focus는?",
      "지금 이 고민을 사주×타로로 보면?",
    ],
    nextProductCandidates: ["money", "career", "love", "tarot_paid", "additional"],
    uvp: "각각의 성향을 넘어, 왜 내가 영역마다 다른 사람이 되는지 연결합니다.",
    currentName: "나의 사주 사용설명서",
    currentSlug: "2026-total",
    currentSalePrice: 12900,
    currentRegularPrice: 19900,
    currentStatus: "ACTIVE",
    nameCandidates: ["나의 사주 사용설명서", "종합 사주 리포트", "운의결 종합 분석서"],
    recommendedName: "나의 사주 사용설명서",
    nameNotes: "사용설명서 Family KEEP. 현재명도 대안 가능.",
  },
  tarot: {
    id: "tarot",
    primaryQuestion: "지금 이 고민을 짧게 교차로 보면?",
    role: "FREE TAROT EXPERIENCE — 재미·공감·짧은 교차 Insight. 심층은 tarot_paid.",
    whatUserGets: [
      "3장 선택",
      "짧은 핵심 교차 Insight",
      "재미·‘제법 맞는다’ 경험",
    ],
    whatUserDoesNotGet: [
      "심층 상담 전체",
      "선택지·주의패턴·행동방향의 충분한 전개",
      "Focus급 영역 사용설명서",
    ],
    whyWorthPaying: "무료 (일일 quota)",
    naturalNextQuestions: [
      "이 고민을 더 깊게 교차로 보면? (유료)",
      "관련 Focus를 아직 안 봤다면?",
    ],
    nextProductCandidates: ["tarot_paid", "additional", "money", "career", "love"],
    uvp: "타고난 나와 지금의 고민을 짧게 맛보는 교차 체험입니다.",
    currentName: "사주×타로 체험",
    currentSlug: null,
    currentSalePrice: 0,
    currentRegularPrice: 0,
    currentStatus: "FREE_FLOW",
    nameCandidates: ["사주×타로 체험", "사주×타로", "지금 이 고민 맛보기"],
    recommendedName: "사주×타로 체험",
    nameNotes:
      "P2.4 LOCK. 무료 체험 전용. 심층 교차는 tarot_paid. 결론을 고의로 잘지 않되 깊이·범위로 차별.",
  },
  tarot_paid: {
    id: "tarot_paid",
    primaryQuestion:
      "내 타고난 패턴과 지금 이 고민을 같이 보면 무엇이 보이는가?",
    role: "유료 심층 교차리딩. Second Paid Purchase의 핵심. Focus 대체재 아님.",
    whatUserGets: [
      "질문 맥락 심화",
      "카드별 의미",
      "사주 Evidence 연결",
      "카드 간 interaction",
      "현재 선택지·주의 패턴·행동 방향",
    ],
    whatUserDoesNotGet: [
      "Focus급 영역 사용설명서",
      "미래 확정 예언",
      "전체 인생 연결 서사",
    ],
    whyWorthPaying: "무료 Preview보다 한 고민을 충분히 깊게 분석.",
    naturalNextQuestions: [
      "이 한 장면만 더 깊게(한 가지 더 묻기)?",
      "관련 Focus를 아직 안 봤다면?",
    ],
    nextProductCandidates: ["additional", "money", "career", "love"],
    uvp: "타고난 나와 지금의 고민을 깊게 함께 읽습니다.",
    currentName: "사주×타로 심층 교차리딩",
    currentSlug: "saju-tarot-deep",
    currentSalePrice: 4900,
    currentRegularPrice: 6900,
    currentStatus: "ACTIVE",
    nameCandidates: [
      "사주×타로 심층 교차리딩",
      "지금 고민 교차리딩",
      "운의결 사주×타로 리딩",
    ],
    recommendedName: "사주×타로 심층 교차리딩",
    nameNotes: "P2.4 ACTIVE. 사용설명서 Family 밖 — ‘지금 고민’ 교차 심층.",
  },
  additional: {
    id: "additional",
    primaryQuestion: "이미 받은 결과에서 이 한 가지를 더 깊게 보면?",
    role: "단일 후속 질문. 새 종합 분석이 아님. InterpretationContextV2 재사용.",
    whatUserGets: [
      "기존 chart + paid context 재사용",
      "사용자 질문 1개 · Gemini 1회",
      "짧지만 구체적인 심화 답변",
    ],
    whatUserDoesNotGet: [
      "전체 리포트 재생성",
      "현재 선택의 타로 교차(→ tarot_paid)",
      "무관한 영역 확장",
    ],
    whyWorthPaying: "이미 산 결과의 신뢰를 바탕으로, 남은 한 점만 깊게.",
    naturalNextQuestions: [],
    nextProductCandidates: ["tarot_paid"],
    uvp: "이미 본 나를 바탕으로, 지금 남은 한 질문만 깊게 봅니다.",
    currentName: null,
    currentSlug: null,
    currentSalePrice: null,
    currentRegularPrice: null,
    currentStatus: "DESIGN_ONLY",
    nameCandidates: ["한 가지 더 묻기", "추가 질문", "후속 심화 질문"],
    recommendedName: "한 가지 더 묻기",
    nameNotes: "2차 출시 권고. 추천가 ₩2,900(미적용). 현재 선택/고민이면 tarot_paid로 유도.",
  },
};

/** Semantic conflict matrix — design judgment + P2 overlap evidence. */
export const PRODUCT_CONFLICT_MATRIX: Record<
  PortfolioProductId,
  Record<PortfolioProductId, ConflictLevel>
> = {
  free: {
    free: "CLEAR",
    money: "CLEAR",
    career: "CLEAR",
    love: "CLEAR",
    total: "CLEAR",
    tarot: "CLEAR",
    tarot_paid: "CLEAR",
    additional: "CLEAR",
  },
  money: {
    free: "CLEAR",
    money: "CLEAR",
    career: "CLEAR",
    love: "CLEAR",
    total: "MINOR OVERLAP",
    tarot: "CLEAR",
    tarot_paid: "CLEAR",
    additional: "CLEAR",
  },
  career: {
    free: "CLEAR",
    money: "CLEAR",
    career: "CLEAR",
    love: "CLEAR",
    total: "MINOR OVERLAP",
    tarot: "CLEAR",
    tarot_paid: "CLEAR",
    additional: "CLEAR",
  },
  love: {
    free: "CLEAR",
    money: "CLEAR",
    career: "CLEAR",
    love: "CLEAR",
    total: "MINOR OVERLAP",
    tarot: "CLEAR",
    tarot_paid: "CLEAR",
    additional: "CLEAR",
  },
  total: {
    free: "CLEAR",
    money: "MINOR OVERLAP",
    career: "MINOR OVERLAP",
    love: "MINOR OVERLAP",
    total: "CLEAR",
    tarot: "CLEAR",
    tarot_paid: "CLEAR",
    additional: "CLEAR",
  },
  tarot: {
    free: "CLEAR",
    money: "CLEAR",
    career: "CLEAR",
    love: "CLEAR",
    total: "CLEAR",
    tarot: "CLEAR",
    tarot_paid: "MINOR OVERLAP",
    additional: "CLEAR",
  },
  tarot_paid: {
    free: "CLEAR",
    money: "CLEAR",
    career: "CLEAR",
    love: "CLEAR",
    total: "CLEAR",
    tarot: "MINOR OVERLAP",
    tarot_paid: "CLEAR",
    additional: "MINOR OVERLAP",
  },
  additional: {
    free: "CLEAR",
    money: "CLEAR",
    career: "CLEAR",
    love: "CLEAR",
    total: "CLEAR",
    tarot: "CLEAR",
    tarot_paid: "MINOR OVERLAP",
    additional: "CLEAR",
  },
};

export type PriceLadderAudit = {
  free: number;
  focusSale: number;
  focusRegular: number;
  totalSale: number;
  totalRegular: number;
  tarotFree: "FREE_DAILY_QUOTA";
  tarotPaidRecommended: number;
  additionalRecommended: number;
  findings: string[];
  verdict: "PASS" | "WARN";
};

export function auditPriceLadder(): PriceLadderAudit {
  const focusSale = 6900;
  const focusRegular = 9900;
  const totalSale = 12900;
  const totalRegular = 19900;
  const tarotPaidRecommended = 4900;
  const additionalRecommended = 2900;
  const findings: string[] = [];

  findings.push("Entry Focus 6,900원 — 첫 결제 장벽·프리미엄 균형 유지.");
  findings.push(
    `Total(${totalSale}) / Focus(${focusSale}) ≈ ${(totalSale / focusSale).toFixed(2)}배 — 연결형 가치로 설명.`
  );
  findings.push(
    "Focus 2개(13,800) ≈ Total(12,900) — Bundle 없이 ‘연결 vs 깊이’ 카피로 차별."
  );
  findings.push(
    `Paid Tarot 추천 ₩${tarotPaidRecommended} — Focus보다 낮고 Second Paid에 적합.`
  );
  findings.push(
    `Additional 추천 ₩${additionalRecommended} — 최저 마찰 재구매(2차 출시).`
  );
  findings.push(
    "무료 Tarot은 체험 유지. 심층은 유료로 분리해 repeat revenue 차단을 해소."
  );

  return {
    free: 0,
    focusSale,
    focusRegular,
    totalSale,
    totalRegular,
    tarotFree: "FREE_DAILY_QUOTA",
    tarotPaidRecommended,
    additionalRecommended,
    findings,
    verdict: "PASS",
  };
}

export type PortfolioKpiDefinition = {
  id: string;
  name: string;
  definition: string;
  numerator: string;
  denominator: string;
};

export const PORTFOLIO_KPI_DEFINITIONS: PortfolioKpiDefinition[] = [
  {
    id: "first_paid_conversion_rate",
    name: "First Paid Conversion",
    definition: "무료 결과 완료 후 첫 유료 결제 비율",
    numerator: "첫 유료 결제 완료 사용자",
    denominator: "무료 결과 생성 완료 사용자",
  },
  {
    id: "focus_to_second_purchase_rate",
    name: "Focus → Second Purchase",
    definition: "Focus 구매 후 30일 내 두 번째 결제 비율",
    numerator: "Focus 구매 후 2회차 결제 사용자",
    denominator: "Focus 첫 구매 사용자",
  },
  {
    id: "total_to_focus_purchase_rate",
    name: "Total → Focus",
    definition: "Total 구매 후 Focus를 추가 구매한 비율",
    numerator: "Total 이후 Focus 구매",
    denominator: "Total 구매 사용자",
  },
  {
    id: "paid_to_tarot_rate",
    name: "Paid → Tarot",
    definition: "유료 사주 구매 후 사주×타로 이용 비율",
    numerator: "유료 후 tarot_reading_generated",
    denominator: "유료 결제 사용자",
  },
  {
    id: "additional_question_rate",
    name: "Additional Question",
    definition: "유료 사용자 중 추가 질문 구매/이용 비율 (상품 출시 후)",
    numerator: "추가 질문 완료",
    denominator: "유료 사용자",
  },
  {
    id: "repeat_purchase_rate",
    name: "Repeat Purchase",
    definition: "2회 이상 결제한 사용자 비율",
    numerator: "결제 횟수 ≥ 2 사용자",
    denominator: "결제 ≥ 1 사용자",
  },
  {
    id: "share_action_rate",
    name: "Share Action",
    definition: "유료/무료 결과에서 공유 액션 비율",
    numerator: "share 생성/클릭",
    denominator: "결과 조회 사용자",
  },
  {
    id: "referral_visit_rate",
    name: "Referral Visit",
    definition: "공유 링크 경유 신규 방문 비율",
    numerator: "share token 유입 방문",
    denominator: "전체 방문",
  },
  {
    id: "referred_paid_conversion_rate",
    name: "Referred Paid Conversion",
    definition: "공유 유입 방문자의 유료 전환",
    numerator: "공유 유입 후 결제",
    denominator: "공유 유입 방문",
  },
  {
    id: "revenue_per_paid_user",
    name: "Revenue Per Paid User",
    definition: "유료 사용자 1인당 매출",
    numerator: "총 결제액",
    denominator: "유료 사용자 수",
  },
  {
    id: "lifetime_revenue_per_user",
    name: "Lifetime Revenue Per User",
    definition: "방문 대비 장기 매출 (cohort)",
    numerator: "cohort 누적 결제액",
    denominator: "cohort 사용자 수",
  },
];

export type LaunchRecommendation = {
  entryPaidProduct: PortfolioProductId;
  heroProduct: PortfolioProductId;
  bestRepurchaseProduct: PortfolioProductId;
  bestLowFrictionRepeat: PortfolioProductId;
  why: string[];
};

export function getLaunchRecommendation(): LaunchRecommendation {
  return {
    entryPaidProduct: "money",
    heroProduct: "total",
    bestRepurchaseProduct: "tarot_paid",
    bestLowFrictionRepeat: "additional",
    why: [
      "Entry Money: 이해 쉬움 + P2 STRONG + ₩6,900.",
      "Hero Total: 연결 독점·브랜드 대표. 전원 Total 강제는 금지.",
      "Best Repeat: Paid Saju×Tarot — 실제 Second Paid Purchase.",
      "Low-friction: 한 가지 더 묻기(2차 출시, ₩2,900).",
      "무료 Tarot은 체험만 — repeat revenue를 막지 않도록 유료와 분리.",
    ],
  };
}

export function productLadderText(): string {
  return [
    "FREE SAJU",
    "│",
    "├ MONEY FOCUS",
    "├ CAREER FOCUS",
    "├ LOVE FOCUS",
    "└ TOTAL (연결)",
    "        │",
    "        ├ 다른 Focus / ADDITIONAL (2차)",
    "        └ PAID SAJU × TAROT",
    "",
    "FREE TAROT EXPERIENCE (병렬)",
    "        └ PAID SAJU × TAROT (심화)",
  ].join("\n");
}

export function hasConflictInMatrix(): boolean {
  for (const row of Object.values(PRODUCT_CONFLICT_MATRIX)) {
    for (const level of Object.values(row)) {
      if (level === "CONFLICT") return true;
    }
  }
  return false;
}
