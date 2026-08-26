/**
 * Consulting-grade Discovery prompt skeleton.
 * Live Gemini must NOT be called until Human Value Gate passes.
 */

export const CONSULTING_DISCOVERY_SKELETON = `
CONSULTING DISCOVERY UNIT (repeat per Core Discovery — do NOT batch as shallow 10 sections):

QUESTION:
- 고객이 상담에서 실제로 묻는 한 문장.

WHY THIS IS NEW:
- 무료/Level1(“이런 경향”)과 무엇이 다른지 1줄.
- “맞는 말”이 아니라 “그래서 그랬구나”가 나와야 함.

REQUIRED DEPTH (Level 3):
- A 패턴 / B 왜 생기는가 / C 언제 강해지는가
- D 행동 순서 / E 타인에게 보이는 모습 / F 본인 느낌
- G 장점 작동 / H 문제 순간 / I 예외 조건 / J 짧게 바꿀 행동
- 모든 항목을 억지로 채우지 말 것. 단 주요 Discovery는 성격 설명으로 끝내지 말 것.

REQUIRED BEHAVIOR CHAIN:
TRIGGER → FIRST REACTION → INTERNAL PROCESS → VISIBLE BEHAVIOR → OTHER'S INTERPRETATION → RESULT
- 예문 하드코딩 금지. Evidence/Context가 지지할 때만.

COUNTER CONDITION:
- 같은 사람이 반대로 행동하는 조건 1개.

MISINTERPRETATION:
- selfMisread: 성격 문제로 오해하기 쉬운 점
- outsideInterpretation: 타인이 읽기 쉬운 오해

EVIDENCE:
- 쉬운 의미 먼저 → 용어는 Evidence 상자에서만.
- 대운/세운/용신/신강신약 창작 HARD FAIL.

FORBIDDEN GENERIC OUTPUT:
- 계획적으로 하세요 / 대화를 많이 하세요 / 자신을 믿으세요
- 긍정적으로 생각하세요 / 균형을 찾으세요 / 꼼꼼함을 활용하세요
- 같은 Insight를 다른 제목으로 반복
- Behavior 예시만 늘리기 / Evidence 박스 도배

ROLE:
- 사주 계산자 X
- 문장 늘리는 사람 X
- 이미 계산된 Evidence로 한 사람의 행동 구조를 깊게 설명하는 상담형 Editor

FOCUS TARGET:
- Level3 Discovery ≥4, INTERESTING+, SURPRISING 후보 ≥2 (자동 확정 금지)

TOTAL TARGET:
- Level3 ≥7, Cross-domain ≥4, Pattern chains ≥3, Contradictions ≥4
`.trim();

export function consultingDiscoveryPromptBlock(): string {
  return CONSULTING_DISCOVERY_SKELETON;
}
