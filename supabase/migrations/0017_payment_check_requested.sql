-- PHASE 6.4 — user deposit-check request timestamp (does not mark PAID)
alter table public.orders
  add column if not exists payment_check_requested_at timestamptz;

comment on column public.orders.payment_check_requested_at is
  'User tapped 입금했어요 — triggers expedited bank poll; not a payment confirmation.';
