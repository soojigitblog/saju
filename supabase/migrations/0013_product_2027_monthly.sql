-- 2027 year-total product + prompt (idempotent for existing local DBs)

insert into public.prompt_definitions (id, name, slug)
values ('11111111-1111-1111-1111-111111111105', '2027 종합운세', '2027-total')
on conflict (id) do nothing;

insert into public.prompt_versions (
  id,
  prompt_definition_id,
  version,
  system_prompt,
  user_prompt_template,
  output_schema,
  status
) values (
  '22222222-2222-2222-2222-222222222205',
  '11111111-1111-1111-1111-111111111105',
  1,
  '당신은 동양 명리 데이터를 쉬운 한국어로 설명하는 콘텐츠 작성 AI입니다. 확정적 표현을 피하십시오. 월별 운세를 포함하십시오.',
  '다음 명리 데이터를 기반으로 2027 종합운세와 1~12월 월별 흐름을 작성하십시오.\n{{chart_json}}',
  '{"type":"object","required":["headline","summary","scores","sections","keywords","monthlyOutlook"]}'::jsonb,
  'ACTIVE'
)
on conflict (id) do nothing;

insert into public.products (
  id,
  name,
  slug,
  short_description,
  description,
  regular_price,
  sale_price,
  thumbnail_url,
  product_type,
  prompt_version_id,
  template_id,
  free_ratio,
  status,
  sort_order
) values (
  '33333333-3333-3333-3333-333333333305',
  '2027년 종합운세',
  '2027-total',
  '내년의 흐름과 월별 운세까지 미리 보기',
  '2027년 전체 흐름과 재물·직업·연애, 1~12월 월별 리듬을 상세히 풀어드립니다.',
  19900,
  12900,
  null,
  'fortune',
  '22222222-2222-2222-2222-222222222205',
  'standard-report',
  30,
  'ACTIVE',
  2
)
on conflict (id) do update set
  name = excluded.name,
  short_description = excluded.short_description,
  description = excluded.description,
  status = 'ACTIVE',
  sort_order = excluded.sort_order,
  prompt_version_id = excluded.prompt_version_id;

-- Keep 2026 total copy mentioning monthly; bump sibling sort orders
update public.products
set
  short_description = '올해의 흐름과 월별 운세까지 한눈에',
  description = '타고난 성향, 재물·직업·연애운, 1~12월 월별 흐름까지 2026년 전체를 상세히 풀어드립니다.',
  sort_order = 1
where id = '33333333-3333-3333-3333-333333333301';

update public.products set sort_order = 3 where id = '33333333-3333-3333-3333-333333333302';
update public.products set sort_order = 4 where id = '33333333-3333-3333-3333-333333333303';
update public.products set sort_order = 5 where id = '33333333-3333-3333-3333-333333333304';
