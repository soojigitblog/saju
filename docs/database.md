# Database design

AI 운세 상품 자동판매 플랫폼의 PostgreSQL / Supabase 스키마 문서입니다.

## Migration history 원칙

- **Remote 미적용:** `0001_initial_schema.sql`을 직접 수정해도 됩니다 (현재 PHASE 2.1).
- **Remote 적용 이후:** 기존 migration 파일을 수정하지 말고 `0002_*.sql` 등 새 파일을 추가합니다.

## ERD (logical)

```text
auth.users
    │
    ├── user_roles (1:1 role)
    │
    └── profiles (user_id and/or guest_session_id)
            │
            ├── fortune_charts (1:n versions)
            │       │
            │       └── free_results
            │
            ├── orders ─── products
            │      │
            │      ├── payments (server-only payment secrets)
            │      └── reports (UNIQUE order_id)
            │
prompt_definitions ── prompt_versions ── products.prompt_version_id

analytics_sessions ── analytics_events
  (writes via /api/analytics → secret client; no anon INSERT)
```

## Guest ownership

MVP는 회원가입을 강제하지 않습니다.

| Table | Ownership fields |
|-------|------------------|
| `profiles` | `user_id` nullable, `guest_session_id` nullable — **최소 하나 필수** (둘 다 허용) |
| `orders` | 동일 |
| `reports` | order/profile 관계로 소유권 판단 (user_id 중복 저장 안 함) |

`guest_session_id`는 cryptographically random UUID여야 하며, **결제 리포트 인증 수단이 아닙니다.**

유료 리포트 조회는 PHASE 6에서 `orders.access_token_hash`(원문 토큰은 DB에 저장하지 않음) + 서버 검증으로 처리합니다.

### Guest → 회원 전환 (향후)

```text
Guest
 ↓
구매 (guest_session_id로 profile/order 생성)
 ↓
나중에 로그인 (카카오/이메일 등)
 ↓
본인 확인
 ↓
profiles.user_id / orders.user_id 연결
 (guest_session_id는 유지 가능 — UNIQUE가 전환을 막지 않음)
```

실제 연결 로직은 이번 Phase에서 구현하지 않습니다. `attachProfileToUser` / `attachOrderToUser` 스텁만 준비되어 있습니다.

## 테이블 역할

| Table | Role |
|-------|------|
| `user_roles` | USER / ADMIN. 클라이언트 플래그로 관리자 판단 금지 |
| `prompt_definitions` / `prompt_versions` | Prompt 버전 보존 |
| `products` | 판매 상품. ACTIVE만 공개 조회 |
| `profiles` | 사주 입력 (guest/auth) |
| `fortune_charts` | deterministic 사주 계산 JSON |
| `free_results` | 무료 AI 결과 |
| `orders` | 고객용 주문 상태 (`amount`, `status`, `paid_at` 등) |
| `payments` | Provider 결제 비밀 (`payment_key` 등) — Client SELECT 금지 |
| `reports` | 유료 리포트. `order_id` UNIQUE |
| `analytics_*` | Funnel. 서버 API 경유 기록 |

## Payment 보안 (선택 A)

`payment_key`를 `orders`에서 분리해 `payments`로 옮겼습니다.

이유:
- RLS는 row 단위라 orders SELECT 시 payment_key가 함께 노출될 수 있음
- Provider 확장(TOSS/KAKAO/NAVER)과 환불 이력에 유리
- 고객 DTO에는 `OrderPublicDTO`만 반환

## 상태 표현: CHECK vs ENUM

**선택: `text` + `CHECK`** — 운영 중 상태 확장 시 ENUM보다 변경 비용이 낮음.

## is_admin()

```sql
security definer
set search_path = ''
```

- relation 완전 수식 (`public.user_roles`)
- `EXECUTE`는 `authenticated`에만 부여 (`anon` 제외)
- RLS helper 용도. 외부 공개 RPC로 확장하지 않음

## Analytics 정책

Browser → `/api/analytics`(예정) → 서버 검증 → secret client INSERT

anon/authenticated의 analytics 직접 INSERT 정책은 **제거**했습니다 (spam/비용/지표 오염 방지).

## Storage

| Bucket | Public | Path |
|--------|--------|------|
| `product-images` | Yes | 상품 썸네일 |
| `reports` | **No** | `reports/{orderId}/{reportId}.pdf` |

- public read / end-user listing 없음
- Signed URL은 server-side에서만 발급, expiration 필수 (PHASE 7)
- 파일명만으로 타 사용자 객체 추측·접근 불가 (UUID path + private bucket)

## 주문 / Report 상태

`PENDING → PAID → GENERATING → COMPLETED` (+ FAILED/CANCELLED/REFUNDED)

결제 성공과 AI 완료는 분리. `reports.order_id` UNIQUE로 중복 생성 방지.

## profiles birth_time

```text
birth_time_unknown = true  → birth_time IS NULL
birth_time_unknown = false → birth_time IS NOT NULL
```

## 개인정보 삭제 / FK

거래 데이터(`orders`, `payments`, `reports`)는 CASCADE로 즉시 삭제하지 않습니다.  
탈퇴 시 PII 익명화 + `user_id` NULL 후 법정 보관 기간 뒤 배치 삭제를 권장합니다.

## 금액 신뢰

`orders.amount`는 클라이언트 값을 믿지 않습니다. PHASE 6에서 `products.sale_price`로 서버 검증합니다.
