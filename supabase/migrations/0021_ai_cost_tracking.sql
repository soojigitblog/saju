-- PHASE 6.6 — AI cost / latency tracking for paid report margin guard
alter table public.ai_generations
  add column if not exists latency_ms integer,
  add column if not exists estimated_ai_cost_usd numeric(12, 6);

alter table public.reports
  add column if not exists estimated_ai_cost_usd numeric(12, 6);
