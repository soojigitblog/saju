-- Additive only: historical rows remain TOSS and no existing payment is rewritten.
alter table public.payments drop constraint if exists payments_provider_check;
alter table public.payments add constraint payments_provider_check check (provider in ('TOSS','PORTONE','KAKAO','NAVER','BANK_TRANSFER'));
comment on column public.payments.provider is 'Original payment provider. Existing records are TOSS; PORTONE is verified server-side before fulfillment.';
