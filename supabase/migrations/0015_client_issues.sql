-- Friend-test bug reports + client error capture (server API insert only)

create table public.client_issues (
  id uuid primary key default gen_random_uuid(),
  kind text not null
    check (kind in ('BUG_REPORT', 'CLIENT_ERROR')),
  guest_session_id text,
  analytics_session_id text,
  path text,
  user_agent text,
  message text not null,
  details text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index client_issues_created_at_idx
  on public.client_issues (created_at desc);
create index client_issues_kind_idx
  on public.client_issues (kind);
create index client_issues_guest_idx
  on public.client_issues (guest_session_id);

alter table public.client_issues enable row level security;

create policy client_issues_admin_all
  on public.client_issues for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert, update, delete on public.client_issues
  to anon, authenticated, service_role;

comment on table public.client_issues is
  'Bug reports and client errors. Writes only via server Route Handler (service role).';
