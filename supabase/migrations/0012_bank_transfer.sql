-- PHASE 6.2 — Bank transfer (Hana) + matching
-- Toss schema preserved; BANK_TRANSFER added alongside.

-- -----------------------------------------------------------------------------
-- payments.provider: allow BANK_TRANSFER
-- -----------------------------------------------------------------------------
alter table public.payments drop constraint if exists payments_provider_check;
alter table public.payments
  add constraint payments_provider_check
  check (provider in ('TOSS', 'KAKAO', 'NAVER', 'BANK_TRANSFER'));

-- -----------------------------------------------------------------------------
-- orders: bank transfer fields + EXPIRED
-- -----------------------------------------------------------------------------
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders
  add constraint orders_status_check
  check (
    status in (
      'PENDING',
      'PAID',
      'GENERATING',
      'COMPLETED',
      'FAILED',
      'CANCELLED',
      'REFUNDED',
      'EXPIRED'
    )
  );

alter table public.orders
  add column if not exists payment_method text not null default 'BANK_TRANSFER'
    check (payment_method in ('BANK_TRANSFER', 'TOSS'));

alter table public.orders
  add column if not exists depositor_name text;

alter table public.orders
  add column if not exists depositor_name_normalized text;

alter table public.orders
  add column if not exists expires_at timestamptz;

create index if not exists orders_bank_pending_idx
  on public.orders (payment_method, status, amount, depositor_name_normalized)
  where status = 'PENDING' and payment_method = 'BANK_TRANSFER';

comment on column public.orders.depositor_name is
  'User-declared depositor name for bank transfer matching (server-side).';
comment on column public.orders.depositor_name_normalized is
  'Normalized depositor for exact match (trim + collapse whitespace).';

-- -----------------------------------------------------------------------------
-- bank_transactions — minimal fields only (no balances / raw dumps)
-- -----------------------------------------------------------------------------
create table if not exists public.bank_transactions (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'HANA'
    check (provider in ('HANA')),
  external_transaction_id text,
  fingerprint text not null unique,
  occurred_at timestamptz not null,
  amount integer not null check (amount > 0),
  depositor_name_masked text,
  match_status text not null default 'UNMATCHED'
    check (match_status in ('UNMATCHED', 'MATCHED', 'AMBIGUOUS', 'IGNORED')),
  matched_order_id uuid references public.orders (id) on delete set null,
  manual_approved_by text,
  manual_approved_at timestamptz,
  manual_reason text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint bank_transactions_matched_order_unique
    unique (matched_order_id)
);

create index if not exists bank_transactions_match_status_idx
  on public.bank_transactions (match_status);

create index if not exists bank_transactions_occurred_at_idx
  on public.bank_transactions (occurred_at desc);

create trigger bank_transactions_set_updated_at
before update on public.bank_transactions
for each row execute function public.set_updated_at();

alter table public.bank_transactions enable row level security;

create policy bank_transactions_admin_all
  on public.bank_transactions
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- Service role bypasses RLS; no anon/authenticated client access intended.

comment on table public.bank_transactions is
  'Minimal inbound bank tx for matching. No full statements or balances.';

-- -----------------------------------------------------------------------------
-- bank_poller_health — single-row ops status (no secrets)
-- -----------------------------------------------------------------------------
create table if not exists public.bank_poller_health (
  id text primary key default 'hana',
  status text not null default 'IDLE'
    check (status in ('IDLE', 'RUNNING', 'ERROR')),
  last_success_at timestamptz,
  last_error_safe text,
  last_fetched_count integer not null default 0,
  last_matched_count integer not null default 0,
  last_ambiguous_count integer not null default 0,
  updated_at timestamptz not null default timezone('utc', now())
);

insert into public.bank_poller_health (id)
values ('hana')
on conflict (id) do nothing;

alter table public.bank_poller_health enable row level security;

create policy bank_poller_health_admin_select
  on public.bank_poller_health
  for select
  using (public.is_admin());
