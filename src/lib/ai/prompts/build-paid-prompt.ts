import type { FortuneAiContext, PresentationInput, ProductConfig } from "@/lib/ai/types";
import {
  resolvePaidProductKind,
  targetLengthForPaidProduct,
  type PaidProductKind,
} from "@/lib/ai/schemas/paid-report";
import { consultingDiscoveryPromptBlock } from "@/lib/ai/prompts/consulting-discovery-skeleton";

function moneyOutline(): string {
  return [
    "상품: 나의 돈 사용설명서 (6,900). 무료 긴 버전 금지. 90% 이상 돈 장면.",
    "profileDashboard ≥5 + fiveElementsSnapshot(FORTUNE DATA 숫자 그대로).",
    "필수 section key 6개 (정확히 이 key만):",
    "money_v4_structure — 큰돈/작은돈 구조",
    "money_v4_earn_spend — 벌 때와 쓸 때",
    "money_v4_blindspot — 결정 지연·사각",
    "money_v4_work — 수입 구조",
    "money_v4_people — 사람과 돈",
    "money_v4_playbook — 돈 사용설명서",
    "각 section: coreInsight, behaviorScenes, evidenceExplanation(고유), evidence,",
    "  discoveryLevel(주요≥3), whyDeeper, reactionChain(TRIGGER→…→RESULT),",
    "  selfInterpretation, outsideInterpretation, selfMisread, counterPattern",
    "actionItems ≥5 with when/what/why/how (임의 일수 ‘사흘’ 등 금지, 시간 비특정)",
    "scopeNotes는 report 말미 1회. 대운·세운·용신·신강신약 창작 HARD FAIL.",
  ].join("\n");
}

function totalOutline(): string {
  return [
    "상품: 나의 사주 사용설명서 (12,900). 약한 chapter 나열 금지.",
    "profileDashboard ≥6 + fiveElementsSnapshot.",
    "필수 section key 9개:",
    "total_v4_decision, total_v4_relationship, total_v4_work, total_v4_money_link,",
    "total_v4_love, total_v4_stress, total_v4_paradox, total_v4_shadow, total_v4_playbook",
    "contradictions ≥4 with result. strengthShadows ≥3 with balancePoint.",
    "crossDomainLinks ≥4. patternChains ≥3.",
    "주요 Discovery: discoveryLevel 3, whyDeeper, reactionChain, self/outside/selfMisread",
    "actionItems ≥8 WHEN/DO/WHY/HOW. scopeNotes 말미 1회.",
  ].join("\n");
}

function careerOutline(): string {
  return [
    "상품: 나의 일 사용설명서 (6,900). 직업명 나열 금지. 환경·마찰·인정 중심.",
    "필수 section key 10개:",
    "career_character, career_strength_work, career_org_friction, career_conflict,",
    "career_overload, career_recognition, career_path_type, career_change_signal,",
    "career_check, career_closing",
    "각 section: coreInsight, behaviorScenes, evidenceExplanation(고유), evidence,",
    "  주요 항목은 discoveryLevel 3 + whyDeeper + reactionChain + misread 필드",
    "actionItems ≥5 with when/what/why/how",
  ].join("\n");
}

function loveOutline(): string {
  return [
    "상품: 나의 연애 사용설명서 (6,900). ‘따뜻한 사람’ 금지. 행동·거리·갈등 중심.",
    "필수 section key 10개:",
    "love_attraction, love_before, love_after, love_expression, love_needs,",
    "love_fight, love_breaking, love_distance, love_fit, love_closing",
    "주요 Discovery(love_before/after/needs/fight): Level3 + chain + misread",
    "strengthShadows에 overuse(위험/그림자) 포함 — Snapshot 주의 조건용",
    "actionItems ≥5 with when/what/why/how",
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
  "fiveElementsSnapshot.label은 반드시 木/火/土/金/水 (각 1글자, 영문 Wood 등 금지).",
  "discoveryLevel은 정수 1|2|3만 (문자열/레벨명 금지).",
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
    consultingDiscoveryPromptBlock(),
    "reportKind는 상품 kind와 맞출 것. monthlyOutlook은 넣지 말 것.",
    "NOTE: Human Value Gate PASSED — Live Gemini Acceptance 허용. Mock enrich 금지.",
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
