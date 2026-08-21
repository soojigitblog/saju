-- Profile life context for richer AI interpretation (user-declared only)

alter table public.profiles
  add column if not exists marital_status text
    check (
      marital_status is null
      or marital_status in ('unmarried', 'married', 'prefer_not')
    );

alter table public.profiles
  add column if not exists has_children text
    check (
      has_children is null
      or has_children in ('yes', 'no', 'prefer_not')
    );

comment on column public.profiles.marital_status is
  'User-declared marital status for interpretation context. Never invent if null.';
comment on column public.profiles.has_children is
  'User-declared children status; typically set when marital_status=married.';
