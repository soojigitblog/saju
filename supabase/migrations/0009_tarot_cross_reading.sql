-- =============================================================================
-- 0009_tarot_cross_reading — PHASE T1 Saju × Tarot MVP
-- =============================================================================

-- Extend ai_generations.result_type for cross readings
alter table public.ai_generations
  drop constraint if exists ai_generations_result_type_check;

alter table public.ai_generations
  add constraint ai_generations_result_type_check
  check (result_type in ('free', 'paid', 'tarot_cross'));

-- ---------------------------------------------------------------------------
-- tarot_readings
-- ---------------------------------------------------------------------------
create table public.tarot_readings (
  id uuid primary key default gen_random_uuid(),
  guest_session_id text not null,
  profile_id uuid references public.profiles (id) on delete set null,
  fortune_chart_id uuid not null references public.fortune_charts (id) on delete restrict,
  free_result_id uuid references public.free_results (id) on delete set null,
  question_category text not null
    check (question_category in ('money', 'career', 'love', 'relationships', 'advice', 'custom')),
  question_text text,
  spread_type text not null default 'THREE_ADVICE'
    check (spread_type = 'THREE_ADVICE'),
  shuffled_deck jsonb not null,
  presentation_slots jsonb not null,
  generation_status text not null default 'PENDING'
    check (generation_status in ('PENDING', 'DRAWN', 'GENERATING', 'COMPLETED', 'FAILED')),
  result_json jsonb,
  model text,
  prompt_version text,
  prompt_version_id uuid,
  generation_key text,
  error_code text,
  error_message text,
  attempt_count integer not null default 0,
  feedback_score integer check (feedback_score is null or (feedback_score between 1 and 5)),
  feedback_label text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint tarot_readings_custom_question check (
    (question_category <> 'custom' and question_text is null)
    or (question_category = 'custom' and question_text is not null)
    or (question_category <> 'custom')
  )
);

create unique index tarot_readings_generation_key_uidx
  on public.tarot_readings (generation_key)
  where generation_key is not null;

create index tarot_readings_guest_idx on public.tarot_readings (guest_session_id);
create index tarot_readings_free_result_idx on public.tarot_readings (free_result_id);
create index tarot_readings_status_idx on public.tarot_readings (generation_status);

create trigger tarot_readings_set_updated_at
before update on public.tarot_readings
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- tarot_draws
-- ---------------------------------------------------------------------------
create table public.tarot_draws (
  id uuid primary key default gen_random_uuid(),
  reading_id uuid not null references public.tarot_readings (id) on delete cascade,
  position_index smallint not null check (position_index between 1 and 3),
  position text not null check (position in ('CURRENT', 'BLOCK', 'DIRECTION')),
  card_id text not null,
  card_slug text not null,
  orientation text not null check (orientation in ('UPRIGHT', 'REVERSED')),
  created_at timestamptz not null default timezone('utc', now()),
  unique (reading_id, position_index)
);

create index tarot_draws_reading_idx on public.tarot_draws (reading_id);

-- ---------------------------------------------------------------------------
-- RLS: service_role / server admin only for guest-owned rows
-- ---------------------------------------------------------------------------
alter table public.tarot_readings enable row level security;
alter table public.tarot_draws enable row level security;

create policy tarot_readings_admin_all
  on public.tarot_readings for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy tarot_draws_admin_all
  on public.tarot_draws for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert, update, delete on public.tarot_readings to anon, authenticated, service_role;
grant select, insert, update, delete on public.tarot_draws to anon, authenticated, service_role;
