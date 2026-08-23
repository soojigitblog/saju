-- Allow explicit SESSION_EXPIRED health (distinct from empty fetch / IDLE)
alter table public.bank_poller_health
  drop constraint if exists bank_poller_health_status_check;

alter table public.bank_poller_health
  add constraint bank_poller_health_status_check
  check (status in ('IDLE', 'RUNNING', 'ERROR', 'SESSION_EXPIRED'));
