import type { FortuneAiContext, PresentationInput, ProductConfig } from "@/lib/ai/types";
import {
  resolvePaidProductKind,
  targetLengthForPaidProduct,
  type PaidProductKind,
} from "@/lib/ai/schemas/paid-report";

function moneyOutline(): string {
  return [
    "상품: 재물 사용설명서 (6,900). 무료 긴 버전 금지. 90% 이상 돈 장면.",
    "PAGE2 profileDashboard 5항 + profileScales(규칙 기반 low/mid/high, 임의 점수 금지).",
    "필수 section key 10개:",
    "money_p01_profile — MONEY PROFILE 한눈 요약",
    "money_p02_criteria — 돈을 움직이는 기준",
    "money_p03_earn — 버는 방식 강점",
    "money_p04_leak — 돈이 새는 진짜 이유",
    "money_p05_shake — 돈 앞에서 흔들리는 순간",
    "money_p06_work — 일·부업과 돈",
    "money_p07_people — 사람과 돈",
    "money_p08_mistake — 반복 실수",
    "money_p09_style — 맞는 관리 방식",
    "money_p10_manual — 재물 사용설명서 (WHEN/DO/WHY)",
    "각 section: narrativeBridge(앞 장 연결), behaviorScenes(헐 나인데 moment), paradoxNote≥2개 리포트 전체",
    "includeWhyBox는 3–5개 chapter만 true. WHY=명리→쉬운말→생활 3단.",
    "scopeNotes는 report 말미 1회. section 본문에 대운·세운 반복 금지.",
    "actionItems ≥5 with when/what/why/how",
  ].join("\n");
}

function totalOutline(): string {
  return [
    "상품: 사주 사용설명서 (12,900). 17개 약한 chapter 금지. 10 PART narrative.",
    "profileDashboard 8항 + blueprint + lifeScenes 6–10(이런 장면 spread)",
    "필수 section key 10개: total_p01_structure … total_p10_playbook",
    "contradictions ≥3 with result field. strengthShadows ≥3 with balancePoint.",
    "includeWhyBox 5–8개. paradox/contradiction ≥4.",
    "narrativeBridge로 PART 연결. scopeNotes 말미 1회.",
    "actionItems ≥8 WHEN/DO/WHY/HOW",
  ].join("\n");
}

function careerOutline(): string {
  return [
    "직장·이직 FOCUS — career_* 10 keys, 환경·마찰·인정 중심. 직업명 나열 금지.",
    "각 section: coreInsight, behaviorScenes, evidenceExplanation(고유), evidence",
  ].join("\n");
}

function loveOutline(): string {
  return [
    "연애 FOCUS — love_* 10 keys, 행동·거리·갈등 중심. ‘따뜻한 사람’ 금지.",
  ].join("\n");
}

function chapterOutline(kind: PaidProductKind): string {
  switch (kind) {
    case "money":
      return moneyOutline();
    case "total":
      return totalOutline();
    case "career":
      return careerOutline();
    case "love":
      return loveOutline();
    default:
      return "legacy keys personality/overall/money/career/love/advice — V2 section fields 사용.";
  }
}

const QUALITY_RULES = [
  "ROLE: FREE=공감 / 6900=한 영역 심층 / 12900=영역 연결 사용설명서",
  "VOICE: 형용사 금지, 행동 장면. 동일 slogan 리포트 전체 최대 1회.",
  "WHY: evidenceExplanation은 chapter마다 다른 근거 서술. ‘일간+오행·십성 상대분포’ 복붙 금지.",
  "Evidence: insight에 쓴 키만. 오행 전부 나열 금지. 대운/세운/월운/용신/신강신약 창작 HARD FAIL.",
  "Korean: ‘정체은/구조은/관계은/스트레스은/정리은’ 등 조사 오류 HARD FAIL.",
  "Schema fields: coreInsight, behaviorScenes[], evidenceExplanation[], actionItems[{domain,what,why,how}],",
  "profileDashboard, fiveElementsSnapshot(FORTUNE DATA 숫자 그대로), finalSummary(strengths/cautions/changeHabits?/keepHabits?/closingLine)",
].join("\n");

export function buildPaidUserPrompt(input: {
  fortuneContext: FortuneAiContext;
  product: ProductConfig;
  presentation?: PresentationInput;
  productInstruction?: string;
}): string {
  const kind = resolvePaidProductKind(input.product.slug);
  const target =
    input.product.targetLengthChars ??
    targetLengthForPaidProduct(input.product.slug);

  const blocks: string[] = [
    "TASK: 운의결 Paid Report V3를 1회 Structured Output으로 생성.",
    `상품 종류: ${kind}`,
    `분량 목표 ≈${target}자. 빈 문장으로 페이지를 늘리지 말 것. 밀도 있는 insight.`,
    chapterOutline(kind),
    QUALITY_RULES,
    "reportKind는 상품 kind와 맞출 것. monthlyOutlook은 넣지 말 것.",
  ];

  if (input.productInstruction?.trim()) {
    blocks.push("PRODUCT INSTRUCTION:\n" + input.productInstruction.trim());
  }

  blocks.push(
    "FORTUNE DATA (JSON):\n" +
      JSON.stringify(input.fortuneContext, null, 2)
  );

  blocks.push(
    "PRODUCT CONFIG (JSON):\n" +
      JSON.stringify(
        {
          slug: input.product.slug,
          name: input.product.name,
          kind,
          targetLengthChars: target,
        },
        null,
        2
      )
  );

  if (input.presentation?.nickname || input.presentation?.maritalStatus) {
    blocks.push(
      "LIFE CONTEXT (user-declared only):\n" +
        JSON.stringify(
          {
            nickname: input.presentation?.nickname,
            maritalStatus: input.presentation?.maritalStatus,
            hasChildren: input.presentation?.hasChildren ?? null,
          },
          null,
          2
        )
    );
  }

  if (input.fortuneContext.birthTimeUnknown) {
    blocks.push(
      "NOTE: birthTimeUnknown=true. 시주 창작 금지. 한계를 명시."
    );
  }

  return blocks.join("\n\n");
}

export function buildPaidProductInstruction(input: {
  slug: string;
  name: string;
}): string {
  const kind = resolvePaidProductKind(input.slug);
  switch (kind) {
    case "money":
      return `${input.name}: 돈의 운영·수입·누수·판단·일연결·부업성향·사람/돈·사용설명서.`;
    case "career":
      return `${input.name}: 업무 환경·마찰·인정·변화 신호.`;
    case "love":
      return `${input.name}: 끌림·갈등·거리의 행동 패턴.`;
    case "total":
      return `${input.name}: 사주 사용설명서. 영역 연결·모순·Strength→Shadow. 연도 길흉 아님.`;
    default:
      return `${input.name}: Premium V2.`;
  }
}
