-- PHASE 6 — Order/payment hardening for Toss Payments
-- Snapshot fields, source free_result link, payment_key uniqueness.

-- -----------------------------------------------------------------------------
-- orders: source linkage + price/name snapshot
-- -----------------------------------------------------------------------------
alter table public.orders
  add column if not exists source_result_id uuid
    references public.free_results (id) on delete restrict;

alter table public.orders
  add column if not exists currency text not null default 'KRW'
    check (currency = 'KRW');

alter table public.orders
  add column if not exists product_name_snapshot text;

create index if not exists orders_source_result_id_idx
  on public.orders (source_result_id);

create index if not exists orders_pending_reuse_idx
  on public.orders (guest_session_id, product_id, source_result_id, status)
  where status = 'PENDING';

comment on column public.orders.source_result_id is
  'Free result that seeded this paid order; ownership re-checked at create.';
comment on column public.orders.product_name_snapshot is
  'Product name at order creation; does not change if product is renamed.';

-- -----------------------------------------------------------------------------
-- payments: provider_order_id + unique payment_key
-- amount remains the approved/charged amount (equals order.amount on success).
-- -----------------------------------------------------------------------------
alter table public.payments
  add column if not exists provider_order_id text;

alter table public.payments
  add column if not exists requested_amount integer
    check (requested_amount is null or requested_amount >= 0);

alter table public.payments
  add column if not exists approved_amount integer
    check (approved_amount is null or approved_amount >= 0);

-- One payment_key globally (Toss uniqueness); nulls allowed for incomplete rows.
create unique index if not exists payments_payment_key_unique
  on public.payments (payment_key)
  where payment_key is not null;

create index if not exists payments_provider_order_id_idx
  on public.payments (provider_order_id);

comment on column public.payments.payment_key is
  'Toss paymentKey — server/admin only; never expose in public DTOs or logs.';
comment on column public.payments.provider_order_id is
  'Provider-facing order id (Toss orderId = orders.order_no).';
comment on column public.payments.raw_response is
  'Redacted provider payload only; strip card numbers and secrets before insert.';
