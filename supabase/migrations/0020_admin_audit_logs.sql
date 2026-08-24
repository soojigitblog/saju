-- =============================================================================
-- 0020_admin_audit_logs — PHASE A1 admin action audit
-- =============================================================================

create table public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references auth.users (id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index admin_audit_logs_created_idx
  on public.admin_audit_logs (created_at desc);

create index admin_audit_logs_action_idx
  on public.admin_audit_logs (action);

alter table public.admin_audit_logs enable row level security;

create policy admin_audit_logs_admin_select
  on public.admin_audit_logs for select
  to authenticated
  using (public.is_admin());

-- Inserts only via service role (Next server after requireAdmin)
grant select on public.admin_audit_logs to authenticated;
grant select, insert on public.admin_audit_logs to service_role;
