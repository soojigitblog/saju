-- Adult Report V2: additive storage only. Existing report JSON, records,
-- ownership rules, and RLS policies remain untouched.
alter table public.reports
  add column if not exists report_version text,
  add column if not exists engine_version text,
  add column if not exists score_data jsonb,
  add column if not exists calculation_data jsonb;
