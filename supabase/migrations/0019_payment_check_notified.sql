-- PHASE 6.4.2 — Telegram (admin) notified when user taps 입금했어요
alter table public.orders
  add column if not exists payment_check_notified_at timestamptz;

comment on column public.orders.payment_check_notified_at is
  'Admin push (e.g. Telegram) sent for deposit-check request; used for dedupe.';
