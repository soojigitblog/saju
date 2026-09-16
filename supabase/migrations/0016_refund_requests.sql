-- Customer refund requests (reason + screenshot). Admin reviews and decides
-- manually; the actual money refund is processed outside this app (Toss
-- dashboard / bank transfer), this table only tracks the request + decision.

create table public.refund_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  guest_session_id text,
  user_id uuid,
  reason text not null,
  screenshot_data_url text,
  status text not null default 'PENDING'
    check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  admin_note text,
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index refund_requests_order_idx
  on public.refund_requests (order_id);
create index refund_requests_status_idx
  on public.refund_requests (status);
create index refund_requests_created_at_idx
  on public.refund_requests (created_at desc);

alter table public.refund_requests enable row level security;

create policy refund_requests_admin_all
  on public.refund_requests for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert, update, delete on public.refund_requests
  to anon, authenticated, service_role;

comment on table public.refund_requests is
  'Customer refund requests (reason + screenshot). Writes only via server Route Handler (service role). Actual money refund is processed manually by the admin outside this app.';
