# 운의결 — AI 운세 상품 자동판매 플랫폼

모바일 우선 AI 운세 자동판매 플랫폼입니다.

광고 → 랜딩 → 사주 입력 → 무료 결과 → 상품 → 결제 → AI 리포트 → PDF

자세한 규칙은 `PROJECT_SPEC.md`, 설계서는 루트의 개발 설계서 문서를 참고하십시오.

## Quick start

```bash
npm install
cp .env.example .env.local   # optional until Supabase is ready
npm run dev
```

Supabase 환경변수가 없어도 PHASE 1 Mock UI로 `npm run build`가 가능합니다.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run test` | Unit / integration (Vitest) |
| `npm run test:ai` | AI engine + provider contract tests |
| `npm run test:ai:gemini` | Live Gemini API (requires `GEMINI_API_KEY`) |
| `npm run test:e2e` | Free fortune mock E2E |
| `npm run db:types` | Generate TS types from local Supabase |
| `npm run db:types:linked` | Generate TS types from linked remote project |
| `npm run db:reset` | Local `supabase db reset` (migration + seed) |

## AI Providers

해석만 AI가 담당합니다. 사주 계산은 `fortune-engine`만 수행합니다.

| `AI_PROVIDER` | 용도 |
|---------------|------|
| `gemini` | 개발/초기 운영 기본 (무료 티어) |
| `openai` | 유료·A/B 보존 |
| `mock` | 로컬 UI/E2E (production 금지) |

상세: [`docs/ai-providers.md`](docs/ai-providers.md), [`docs/ai-engine.md`](docs/ai-engine.md)

Gemini→OpenAI 자동 fallback은 **비활성** (`AI_FALLBACK_PROVIDER=`).

## Supabase

- Setup: [`docs/setup-supabase.md`](docs/setup-supabase.md)
- Schema / RLS / retention: [`docs/database.md`](docs/database.md)

### Data mode

- Env configured → repositories use Supabase (no silent mock fallback on errors)
- Env missing + development / `next build` → mock
- Env missing + **production runtime** → hard error (mock 자동 실행 금지)

`DATA_SOURCE=mock` 같은 운영 위험 flag는 사용하지 않습니다.

## 개인정보 / 거래 데이터 보존

회원 탈퇴 시에도 `orders` / `reports`는 즉시 CASCADE 삭제하지 않습니다.

권장 절차:

1. `profiles` PII 익명화, `user_id` NULL
2. `orders.user_id` / analytics `user_id` NULL
3. 법정 보관 기간 후 배치 삭제

FK 전략 상세는 `docs/database.md`를 참고하십시오.

## Phase status

- PHASE 1: UI Shell + Mock — done
- PHASE 2 / 2.1: Supabase schema / security — done
- PHASE 3 / 3.1: Fortune calculation engine — done (`docs/fortune-engine.md`)
- PHASE 4: AI Interpretation Engine (OpenAI) — done (`docs/ai-engine.md`)
- PHASE 4.1: Gemini Free Provider + AI abstraction — done (`docs/ai-providers.md`)
- PHASE 5: Free fortune E2E (mock) — done
- PHASE 5.1: Live Supabase + AI verification — blocked until `.env.local` + DB
