-- Public read-only share links (one token → one result snapshot)
create table if not exists shared_results (
  id uuid primary key default gen_random_uuid(),
  share_token text not null,
  resource_type text not null check (resource_type in ('FREE_RESULT', 'TAROT_READING')),
  resource_id uuid not null,
  snapshot_json jsonb not null,
  display_nickname text,
  display_birth_year_label text,
  revoked_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists shared_results_share_token_key
  on shared_results (share_token);

create index if not exists shared_results_resource_idx
  on shared_results (resource_type, resource_id);

alter table shared_results enable row level security;

-- No anon/authenticated direct access; server uses service role only.
revoke all on table shared_results from anon, authenticated;
