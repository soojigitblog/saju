-- =============================================================================
-- 0010_feedbacks — PHASE T1.2 Friend Test Feedback Gate
-- Generalized feedback for FORTUNE / TAROT / CROSS_READING (IDs + choices only)
-- =============================================================================

create table public.feedbacks (
  id uuid primary key default gen_random_uuid(),
  guest_session_id text not null,
  user_id uuid references auth.users (id) on delete set null,
  target_type text not null
    check (target_type in ('FORTUNE', 'TAROT', 'CROSS_READING')),
  target_id uuid not null,
  rating integer
    check (rating is null or (rating between 1 and 5)),
  tags text[] not null default '{}',
  more_fun_than_saju_alone text
    check (
      more_fun_than_saju_alone is null
      or more_fun_than_saju_alone in ('YES', 'NO')
    ),
  most_resonant text
    check (
      most_resonant is null
      or most_resonant in ('SAJU', 'TAROT', 'CROSS', 'SIMILAR')
    ),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint feedbacks_guest_target_uidx
    unique (guest_session_id, target_type, target_id)
);

create index feedbacks_guest_idx on public.feedbacks (guest_session_id);
create index feedbacks_target_idx on public.feedbacks (target_type, target_id);

create trigger feedbacks_set_updated_at
before update on public.feedbacks
for each row execute function public.set_updated_at();

alter table public.feedbacks enable row level security;

create policy feedbacks_admin_all
  on public.feedbacks for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert, update, delete on public.feedbacks
  to anon, authenticated, service_role;
