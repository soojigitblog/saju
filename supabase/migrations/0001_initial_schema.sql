-- =============================================================================
-- 0001_initial_schema.sql
-- AI 운세 상품 자동판매 플랫폼 — initial schema, RLS, storage, triggers
--
-- Migration history:
-- - Remote에 아직 적용하지 않았다면 이 파일을 수정해도 됩니다.
-- - Remote에 한 번이라도 적용한 뒤에는 이 파일을 수정하지 말고
--   supabase/migrations/0002_*.sql 등 새 파일을 추가하십시오.
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- updated_at helper
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- user_roles (must exist before is_admin — SQL functions validate relations)
-- -----------------------------------------------------------------------------
create table public.user_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('USER', 'ADMIN')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger user_roles_set_updated_at
before update on public.user_roles
for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- is_admin()
-- SECURITY DEFINER with empty search_path; relations fully qualified.
-- Intended as an RLS helper — execute granted to authenticated only (not anon).
-- -----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = (select auth.uid())
      and ur.role = 'ADMIN'
  );
$$;

revoke all on function public.is_admin() from public;
revoke all on function public.is_admin() from anon;
grant execute on function public.is_admin() to authenticated;

-- -----------------------------------------------------------------------------
-- prompt_definitions + prompt_versions
-- -----------------------------------------------------------------------------
create table public.prompt_definitions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger prompt_definitions_set_updated_at
before update on public.prompt_definitions
for each row execute function public.set_updated_at();

create table public.prompt_versions (
  id uuid primary key default gen_random_uuid(),
  prompt_definition_id uuid not null
    references public.prompt_definitions (id) on delete restrict,
  version integer not null check (version > 0),
  system_prompt text not null,
  user_prompt_template text not null,
  output_schema jsonb not null default '{}'::jsonb,
  status text not null default 'DRAFT'
    check (status in ('DRAFT', 'ACTIVE', 'ARCHIVED')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (prompt_definition_id, version)
);

create index prompt_versions_definition_idx
  on public.prompt_versions (prompt_definition_id);

create index prompt_versions_status_idx
  on public.prompt_versions (status);

create trigger prompt_versions_set_updated_at
before update on public.prompt_versions
for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- products
-- -----------------------------------------------------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  short_description text not null default '',
  description text not null default '',
  regular_price integer not null check (regular_price >= 0),
  sale_price integer not null check (sale_price >= 0),
  thumbnail_url text,
  product_type text not null default 'fortune',
  prompt_version_id uuid
    references public.prompt_versions (id) on delete restrict,
  template_id text not null default 'standard-report',
  free_ratio integer not null default 30
    check (free_ratio >= 0 and free_ratio <= 100),
  status text not null default 'DRAFT'
    check (status in ('DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED')),
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint products_sale_lte_regular check (sale_price <= regular_price)
);

create index products_status_idx on public.products (status);
create index products_sort_order_idx on public.products (sort_order);

create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- profiles (auth user and/or guest ownership)
-- guest_session_id: cryptographically random UUID/token (not a sequential id)
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  guest_session_id text,
  nickname text not null,
  gender text not null check (gender in ('male', 'female')),
  birth_date date not null,
  birth_time time,
  birth_time_unknown boolean not null default false,
  calendar_type text not null check (calendar_type in ('solar', 'lunar')),
  birth_place text not null,
  contact_email text,
  contact_phone text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint profiles_birth_date_not_future
    check (birth_date <= (timezone('utc', now()))::date),
  constraint profiles_birth_time_consistency
    check (
      (birth_time_unknown = true and birth_time is null)
      or
      (birth_time_unknown = false and birth_time is not null)
    ),
  constraint profiles_owner_present
    check (user_id is not null or guest_session_id is not null)
);

create index profiles_user_id_idx on public.profiles (user_id);
create index profiles_guest_session_id_idx on public.profiles (guest_session_id);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- fortune_charts
-- -----------------------------------------------------------------------------
create table public.fortune_charts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null
    references public.profiles (id) on delete cascade,
  chart_version text not null default 'v1',
  raw_chart_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index fortune_charts_profile_id_idx
  on public.fortune_charts (profile_id);

create trigger fortune_charts_set_updated_at
before update on public.fortune_charts
for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- free_results
-- -----------------------------------------------------------------------------
create table public.free_results (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null
    references public.profiles (id) on delete cascade,
  chart_id uuid not null
    references public.fortune_charts (id) on delete restrict,
  prompt_version_id uuid
    references public.prompt_versions (id) on delete restrict,
  result_json jsonb,
  model text,
  prompt_version text,
  generation_status text not null default 'PENDING'
    check (generation_status in ('PENDING', 'GENERATING', 'COMPLETED', 'FAILED')),
  error_message text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index free_results_profile_id_idx on public.free_results (profile_id);
create index free_results_chart_id_idx on public.free_results (chart_id);

create trigger free_results_set_updated_at
before update on public.free_results
for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- orders
-- Customer-facing payment fields only. Provider secrets live in payments.
-- access_token_hash: store hash only (PHASE 6 issues raw token to client).
-- guest_session_id is NOT an authentication substitute for paid reports.
-- -----------------------------------------------------------------------------
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null unique,
  user_id uuid references auth.users (id) on delete set null,
  guest_session_id text,
  profile_id uuid not null
    references public.profiles (id) on delete restrict,
  product_id uuid not null
    references public.products (id) on delete restrict,
  amount integer not null check (amount >= 0),
  status text not null default 'PENDING'
    check (
      status in (
        'PENDING',
        'PAID',
        'GENERATING',
        'COMPLETED',
        'FAILED',
        'CANCELLED',
        'REFUNDED'
      )
    ),
  access_token_hash text,
  paid_at timestamptz,
  cancelled_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint orders_owner_present
    check (user_id is not null or guest_session_id is not null)
);

create index orders_user_id_idx on public.orders (user_id);
create index orders_guest_session_id_idx on public.orders (guest_session_id);
create index orders_created_at_idx on public.orders (created_at desc);
create index orders_status_idx on public.orders (status);
create index orders_profile_id_idx on public.orders (profile_id);
create index orders_access_token_hash_idx on public.orders (access_token_hash);

create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- payments (server/admin only — never exposed via client DTO)
-- -----------------------------------------------------------------------------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null
    references public.orders (id) on delete restrict,
  provider text not null default 'TOSS'
    check (provider in ('TOSS', 'KAKAO', 'NAVER')),
  payment_key text,
  payment_method text,
  provider_status text,
  amount integer not null check (amount >= 0),
  approved_at timestamptz,
  cancelled_at timestamptz,
  raw_response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index payments_order_id_idx on public.payments (order_id);
create index payments_provider_idx on public.payments (provider);
create index payments_payment_key_idx on public.payments (payment_key);

create trigger payments_set_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- reports — one report per order (idempotency)
-- Ownership is derived via orders/profiles; external reads via server API.
-- -----------------------------------------------------------------------------
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique
    references public.orders (id) on delete restrict,
  profile_id uuid not null
    references public.profiles (id) on delete restrict,
  product_id uuid not null
    references public.products (id) on delete restrict,
  prompt_version_id uuid
    references public.prompt_versions (id) on delete restrict,
  prompt_version text,
  model text,
  result_json jsonb,
  html_url text,
  pdf_url text,
  generation_status text not null default 'PENDING'
    check (generation_status in ('PENDING', 'GENERATING', 'COMPLETED', 'FAILED')),
  error_message text,
  generated_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index reports_profile_id_idx on public.reports (profile_id);
create index reports_generation_status_idx on public.reports (generation_status);

create trigger reports_set_updated_at
before update on public.reports
for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- analytics
-- No direct anon INSERT — write only via server API + secret client (PHASE 9+)
-- -----------------------------------------------------------------------------
create table public.analytics_sessions (
  id uuid primary key default gen_random_uuid(),
  session_id text not null unique,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  referrer text,
  landing_path text,
  first_seen_at timestamptz not null default timezone('utc', now()),
  last_seen_at timestamptz not null default timezone('utc', now())
);

create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  session_id text not null
    references public.analytics_sessions (session_id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  event_name text not null,
  product_id uuid references public.products (id) on delete set null,
  order_id uuid references public.orders (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index analytics_events_session_id_idx
  on public.analytics_events (session_id);
create index analytics_events_event_name_idx
  on public.analytics_events (event_name);
create index analytics_events_created_at_idx
  on public.analytics_events (created_at desc);

-- -----------------------------------------------------------------------------
-- RLS enable
-- -----------------------------------------------------------------------------
alter table public.user_roles enable row level security;
alter table public.prompt_definitions enable row level security;
alter table public.prompt_versions enable row level security;
alter table public.products enable row level security;
alter table public.profiles enable row level security;
alter table public.fortune_charts enable row level security;
alter table public.free_results enable row level security;
alter table public.orders enable row level security;
alter table public.payments enable row level security;
alter table public.reports enable row level security;
alter table public.analytics_sessions enable row level security;
alter table public.analytics_events enable row level security;

-- -----------------------------------------------------------------------------
-- RLS: user_roles
-- -----------------------------------------------------------------------------
create policy user_roles_select_own
  on public.user_roles for select
  to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

create policy user_roles_admin_all
  on public.user_roles for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- RLS: prompts (no public read)
-- -----------------------------------------------------------------------------
create policy prompt_definitions_admin_all
  on public.prompt_definitions for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy prompt_versions_admin_all
  on public.prompt_versions for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- RLS: products
-- -----------------------------------------------------------------------------
create policy products_select_active
  on public.products for select
  to anon, authenticated
  using (status = 'ACTIVE' or public.is_admin());

create policy products_admin_all
  on public.products for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- RLS: profiles
-- Authenticated users manage own rows (user_id).
-- Guest rows (guest_session_id) are written/read via server Route Handlers
-- using the secret client after validating guest cookie / access token.
-- -----------------------------------------------------------------------------
create policy profiles_select_own
  on public.profiles for select
  to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

create policy profiles_insert_own
  on public.profiles for insert
  to authenticated
  with check (user_id = (select auth.uid()) or public.is_admin());

create policy profiles_update_own
  on public.profiles for update
  to authenticated
  using (user_id = (select auth.uid()) or public.is_admin())
  with check (user_id = (select auth.uid()) or public.is_admin());

create policy profiles_admin_all
  on public.profiles for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- RLS: fortune_charts / free_results
-- -----------------------------------------------------------------------------
create policy fortune_charts_select_own
  on public.fortune_charts for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.profiles p
      where p.id = fortune_charts.profile_id
        and p.user_id = (select auth.uid())
    )
  );

create policy fortune_charts_insert_own
  on public.fortune_charts for insert
  to authenticated
  with check (
    public.is_admin()
    or exists (
      select 1 from public.profiles p
      where p.id = fortune_charts.profile_id
        and p.user_id = (select auth.uid())
    )
  );

create policy fortune_charts_admin_all
  on public.fortune_charts for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy free_results_select_own
  on public.free_results for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.profiles p
      where p.id = free_results.profile_id
        and p.user_id = (select auth.uid())
    )
  );

create policy free_results_insert_own
  on public.free_results for insert
  to authenticated
  with check (
    public.is_admin()
    or exists (
      select 1 from public.profiles p
      where p.id = free_results.profile_id
        and p.user_id = (select auth.uid())
    )
  );

create policy free_results_admin_all
  on public.free_results for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- RLS: orders (no payment_key on this table)
-- -----------------------------------------------------------------------------
create policy orders_select_own
  on public.orders for select
  to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

create policy orders_insert_own
  on public.orders for insert
  to authenticated
  with check (user_id = (select auth.uid()) or public.is_admin());

create policy orders_update_own_limited
  on public.orders for update
  to authenticated
  using (user_id = (select auth.uid()) or public.is_admin())
  with check (user_id = (select auth.uid()) or public.is_admin());

create policy orders_admin_all
  on public.orders for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- RLS: payments — no anon/authenticated client access (service role only)
-- Admin may select via is_admin for ops UI.
-- -----------------------------------------------------------------------------
create policy payments_admin_select
  on public.payments for select
  to authenticated
  using (public.is_admin());

create policy payments_admin_all
  on public.payments for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- RLS: reports
-- -----------------------------------------------------------------------------
create policy reports_select_own
  on public.reports for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.orders o
      where o.id = reports.order_id
        and o.user_id = (select auth.uid())
    )
  );

create policy reports_admin_all
  on public.reports for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- RLS: analytics — admin read only; writes via secret client (no anon insert)
-- -----------------------------------------------------------------------------
create policy analytics_sessions_admin_select
  on public.analytics_sessions for select
  to authenticated
  using (public.is_admin());

create policy analytics_events_admin_select
  on public.analytics_events for select
  to authenticated
  using (public.is_admin());

-- -----------------------------------------------------------------------------
-- Storage buckets
-- product-images: public read for catalog thumbnails
-- reports: private — path reports/{orderId}/{reportId}.pdf ; Signed URL only
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'product-images',
    'product-images',
    true,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  ),
  (
    'reports',
    'reports',
    false,
    20971520,
    array['application/pdf', 'text/html']
  )
on conflict (id) do nothing;

create policy storage_product_images_public_read
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'product-images');

create policy storage_product_images_admin_write
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());

create policy storage_product_images_admin_update
  on storage.objects for update
  to authenticated
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());

create policy storage_product_images_admin_delete
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'product-images' and public.is_admin());

-- reports: no public read, no listing for end users
create policy storage_reports_admin_select
  on storage.objects for select
  to authenticated
  using (bucket_id = 'reports' and public.is_admin());

create policy storage_reports_admin_insert
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'reports' and public.is_admin());

create policy storage_reports_admin_update
  on storage.objects for update
  to authenticated
  using (bucket_id = 'reports' and public.is_admin())
  with check (bucket_id = 'reports' and public.is_admin());

create policy storage_reports_admin_delete
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'reports' and public.is_admin());

-- -----------------------------------------------------------------------------
-- Table / sequence grants (RLS still applies; service_role bypasses RLS)
-- Without these, PostgREST returns "permission denied for table …"
-- -----------------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema public
  to anon, authenticated, service_role;

grant usage, select on all sequences in schema public
  to anon, authenticated, service_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables
  to anon, authenticated, service_role;

alter default privileges in schema public
  grant usage, select on sequences
  to anon, authenticated, service_role;
