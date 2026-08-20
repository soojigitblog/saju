# Supabase setup

로컬/원격 Supabase를 이 프로젝트에 연결하는 절차입니다.

## 1. 프로젝트 생성

1. [Supabase Dashboard](https://supabase.com/dashboard)에서 새 프로젝트 생성
2. Project Settings → API Keys
   - **Publishable key** (`sb_publishable_...`)
   - **Secret key** (`sb_secret_...`)

> Legacy `anon` / `service_role` JWT 명칭은 이 프로젝트의 기본 설계에서 사용하지 않습니다.

## 2. 환경변수

```bash
cp .env.example .env.local
```

```text
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
```

규칙:

- Publishable key만 browser / Client Component에서 사용
- Secret key는 server-only (`import "server-only"` + `admin.ts`)
- `.env.local`은 Git에 커밋하지 않음

### Data mode

| 환경 | Supabase env | 동작 |
|------|--------------|------|
| development | 없음 | mock 허용 |
| `next build` | 없음 | mock 허용 (컴파일용) |
| production runtime | 없음 | **에러** (자동 mock 금지) |
| any | 있음 | Supabase (실패 시 mock 폴백 없음) |

## 3. CLI

```bash
npx supabase login
npx supabase link --project-ref <YOUR_PROJECT_REF>
```

## 4. Migration

```bash
npx supabase db push
# or local:
npx supabase db reset
```

### Migration history

- Remote **미적용** 상태에서는 `0001_initial_schema.sql` 수정 가능 (PHASE 2.1까지 해당)
- Remote **적용 이후**에는 기존 파일을 고치지 말고 `0002_*.sql`을 추가
- `0005_table_grants.sql`: `anon` / `authenticated` / `service_role`에 SELECT·INSERT·UPDATE·DELETE 부여 (RLS는 그대로). 없으면 PostgREST가 `permission denied for table`를 반환합니다.

## 5. Seed

`supabase/seed.sql` — 샘플 상품/프롬프트 4종

## 6. Types

```bash
npm run db:types          # local
npm run db:types:linked   # linked remote
```

## 7. 관리자 계정

```sql
insert into public.user_roles (user_id, role)
values ('<AUTH_USER_UUID>', 'ADMIN')
on conflict (user_id) do update set role = excluded.role;
```

관리자 여부는 DB `user_roles` + `is_admin()`만 사용합니다.

## 8. Storage

- `product-images` — public read
- `reports` — private, object path `reports/{orderId}/{reportId}.pdf`, Signed URL only

## 9. 앱 실행

```bash
npm run dev
```
