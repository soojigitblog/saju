# PHASE 5.1 — Live Supabase + AI Verification Checklist

이 문서는 **새 기능이 아니라** Live 검증 절차입니다.

PHASE 4.1 이후 AI 기본 Provider는 **Gemini**입니다. OpenAI도 동일 Flow로 검증 가능합니다.  
`AI_PROVIDER=mock`은 Live Gate에서 **금지**입니다.

## 차단 조건 (현재 workspace)

아래가 없으면 Live Gate는 **NOT READY**입니다.

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY

# Provider 중 하나 (AI_PROVIDER에 맞춤)
GEMINI_API_KEY   # AI_PROVIDER=gemini (권장)
# 또는
OPENAI_API_KEY   # AI_PROVIDER=openai
```

환경 프로브 (비밀값 미출력):

```bash
node --env-file=.env.local scripts/verify-phase51-env.cjs
```

## 1. Env 준비

```bash
cp .env.example .env.local
# Dashboard / Google AI Studio에서 실제 키 입력
```

권장:

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=...
GEMINI_MODEL_FREE=gemini-2.5-flash
AI_FALLBACK_PROVIDER=
```

OpenAI 경로:

```env
AI_PROVIDER=openai
OPENAI_API_KEY=...
AI_MODEL_FREE=gpt-5.6-luna
```

## 2. Supabase 연결 + Migration

```bash
npx supabase login
npx supabase link --project-ref <REF>
npx supabase db push
# seed (products / prompts)
# Dashboard SQL 또는 supabase db reset --linked (주의: 데이터 삭제)
```

로컬 Docker 경로:

```bash
# Docker Desktop 기동 후
npx supabase start
npx supabase db reset
```

적용 확인 테이블: `profiles`, `fortune_charts`, `free_results`, `ai_generations`(+ `provider`), `prompt_*`, `products`, `analytics_*`, …

Migration `0004_ai_provider.sql` 포함 여부 확인.

## 3. AI smoke

```bash
# Gemini
npm run test:ai:gemini

# OpenAI
npm run test:ai:integration
```

## 4. Live Free Fortune (가상 fixture만)

가상 입력 예:

- A 균형: `1990-05-15 10:30`
- B 편중: `1988-03-15 09:00`
- C unknown-time: `1995-06-01` + `birthTimeUnknown`

흐름: `/fortune` → loading → `/result/[id]`

검증:

- Guest A own ALLOW / Guest B DENY
- generation_key dedupe / double submit
- loading·result refresh 시 AI 재호출 없음
- token usage / provider / provider_request_id 저장
- Public DTO에 secret·raw chart 미노출
- Gemini 실패 시 OpenAI 자동 전환 **없음**

## 5. Analytics / UTM

`/?utm_source=test&utm_medium=integration&utm_campaign=phase5_1` 진입 후  
`analytics_sessions` / `analytics_events` 확인.  
`fortune_guest_session` ≠ analytics session cookie.

## 6. Production mock 차단

Production runtime에서 Supabase 또는 AI key 제거 시 **명시적 failure** (silent mock 금지).

## Local quick path (Docker)

```bash
# Docker Desktop running
npx supabase start
npm run env:local-from-supabase
# edit .env.local → set GEMINI_API_KEY=
node --env-file=.env.local scripts/verify-phase51-env.cjs
node --env-file=.env.local scripts/phase51-live-db.cjs
npm run test:ai:gemini
```

```text
PHASE 5.1 Release Gate = READY
PHASE 6 진입 = YES
```
