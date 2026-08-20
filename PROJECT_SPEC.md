# AI 운세 상품 자동판매 플랫폼 — PROJECT SPEC

당신은 이 프로젝트의 Lead Full-Stack Engineer입니다.

우리는 모바일 우선 AI 운세 자동판매 플랫폼을 개발합니다.

목표 사용자 흐름:

광고 → 랜딩 → 사주정보 입력 → 무료 결과 → 상품 선택 → Toss 결제 → AI 상세분석 → 웹 리포트 → PDF → 재구매

## 기술 스택

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase PostgreSQL
- Supabase Auth
- Supabase Storage
- OpenAI Responses API
- Zod
- Toss Payments
- Vercel

## RULES

### RULE 1
OpenAI API Key, Toss Secret Key, Supabase Secret Key를 클라이언트 코드에 포함하지 마십시오.

### RULE 2
금액과 결제 성공 여부를 클라이언트 값만으로 판단하지 마십시오. 서버에서 반드시 결제 승인 및 주문 금액을 검증하십시오.

### RULE 3
AI 출력은 자유 텍스트가 아니라 JSON Schema 기반 Structured Output을 사용하십시오.

### RULE 4
AI 결과 생성 전 사주 계산 데이터를 별도로 생성하고 저장하십시오. 사주 계산과 AI 자연어 해석을 분리하십시오.

### RULE 5
AI 호출마다 model, prompt_id, prompt_version, generation timestamp를 저장하십시오.

### RULE 6
결제 완료와 AI 결과 생성 상태를 분리하십시오. AI 생성 실패가 결제 상태를 변경해서는 안 됩니다.

### RULE 7
order_id를 기준으로 동일 Report가 중복 생성되지 않도록 idempotency를 구현하십시오.

### RULE 8
Supabase 모든 고객 데이터 테이블에 적절한 RLS 정책을 적용하십시오.

### RULE 9
모바일 360px 화면을 우선으로 디자인하십시오.

### RULE 10
코드 수정 없이 Admin에서 새로운 운세 상품을 추가할 수 있는 구조로 설계하십시오.

## 개발 방식

한 번에 전체를 구현하지 말고 Phase 단위로 진행한다.
임의로 다음 Phase로 진행하지 않는다.

상세 설계: `AI 운세 상품 자동판매 플랫폼 — 개발 설계서 v1.0.md`
