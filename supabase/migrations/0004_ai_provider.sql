-- =============================================================================
-- 0004_ai_provider — PHASE 4.1 AI vendor column on ai_generations
-- =============================================================================

alter table public.ai_generations
  add column if not exists provider text;

-- Backfill existing rows as openai (PHASE 4 default) when null
update public.ai_generations
set provider = 'openai'
where provider is null;

alter table public.ai_generations
  alter column provider set default 'openai';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ai_generations_provider_check'
  ) then
    alter table public.ai_generations
      add constraint ai_generations_provider_check
      check (provider in ('openai', 'gemini', 'mock'));
  end if;
end $$;
