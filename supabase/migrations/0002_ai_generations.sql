-- =============================================================================
-- 0002_ai_generations — PHASE 4 AI interpretation tracking
-- =============================================================================

-- Extend free_results with operational fields (safe additive)
alter table public.free_results
  add column if not exists error_code text,
  add column if not exists attempt_count integer not null default 0
    check (attempt_count >= 0),
  add column if not exists input_tokens integer,
  add column if not exists output_tokens integer,
  add column if not exists total_tokens integer,
  add column if not exists provider_request_id text,
  add column if not exists generation_key text;

create unique index if not exists free_results_generation_key_uidx
  on public.free_results (generation_key)
  where generation_key is not null;

alter table public.reports
  add column if not exists error_code text,
  add column if not exists attempt_count integer not null default 0
    check (attempt_count >= 0),
  add column if not exists input_tokens integer,
  add column if not exists output_tokens integer,
  add column if not exists total_tokens integer,
  add column if not exists provider_request_id text,
  add column if not exists generation_key text;

create unique index if not exists reports_generation_key_uidx
  on public.reports (generation_key)
  where generation_key is not null;

-- Optional model column on prompt_versions (configurable per version)
alter table public.prompt_versions
  add column if not exists model text;

-- -----------------------------------------------------------------------------
-- ai_generations — cost / failure / idempotency ledger
-- -----------------------------------------------------------------------------
create table if not exists public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  generation_key text not null,
  result_type text not null check (result_type in ('free', 'paid')),
  profile_id uuid references public.profiles (id) on delete set null,
  chart_id uuid references public.fortune_charts (id) on delete set null,
  order_id uuid references public.orders (id) on delete set null,
  prompt_version_id uuid references public.prompt_versions (id) on delete restrict,
  engine_version text not null,
  provider_version text,
  model text not null,
  status text not null default 'PENDING'
    check (status in ('PENDING', 'GENERATING', 'COMPLETED', 'FAILED')),
  input_tokens integer,
  output_tokens integer,
  total_tokens integer,
  provider_request_id text,
  error_code text,
  error_message text,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (generation_key)
);

create index if not exists ai_generations_status_idx
  on public.ai_generations (status);

create index if not exists ai_generations_result_type_idx
  on public.ai_generations (result_type);

create index if not exists ai_generations_prompt_version_idx
  on public.ai_generations (prompt_version_id);

create trigger ai_generations_set_updated_at
before update on public.ai_generations
for each row execute function public.set_updated_at();

alter table public.ai_generations enable row level security;

create policy ai_generations_admin_all
  on public.ai_generations for all
  using (public.is_admin())
  with check (public.is_admin());
