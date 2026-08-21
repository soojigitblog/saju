-- =============================================================================
-- seed.sql — development sample data (no real AI prompts required)
-- =============================================================================

-- Fixed UUIDs for reproducible local/dev seeds
-- prompt definitions
insert into public.prompt_definitions (id, name, slug) values
  ('11111111-1111-1111-1111-111111111101', '2026 종합운세', '2026-total'),
  ('11111111-1111-1111-1111-111111111102', '재물운 집중분석', 'money'),
  ('11111111-1111-1111-1111-111111111103', '직장·이직운', 'career'),
  ('11111111-1111-1111-1111-111111111104', '연애운', 'love'),
  ('11111111-1111-1111-1111-111111111105', '2027 종합운세', '2027-total');

insert into public.prompt_versions (
  id,
  prompt_definition_id,
  version,
  system_prompt,
  user_prompt_template,
  output_schema,
  status
) values
(
  '22222222-2222-2222-2222-222222222201',
  '11111111-1111-1111-1111-111111111101',
  1,
  '당신은 동양 명리 데이터를 쉬운 한국어로 설명하는 콘텐츠 작성 AI입니다. 확정적 표현을 피하십시오.',
  '다음 명리 데이터를 기반으로 2026 종합운세를 작성하십시오.\n{{chart_json}}',
  '{"type":"object","required":["headline","summary","scores","sections","keywords"]}'::jsonb,
  'ACTIVE'
),
(
  '22222222-2222-2222-2222-222222222202',
  '11111111-1111-1111-1111-111111111102',
  1,
  '당신은 재물 흐름을 현실적으로 설명하는 콘텐츠 작성 AI입니다. 투자 권유를 하지 마십시오.',
  '다음 명리 데이터를 기반으로 재물운을 작성하십시오.\n{{chart_json}}',
  '{"type":"object","required":["headline","summary","sections","keywords"]}'::jsonb,
  'ACTIVE'
),
(
  '22222222-2222-2222-2222-222222222203',
  '11111111-1111-1111-1111-111111111103',
  1,
  '당신은 직업·이직 흐름을 설명하는 콘텐츠 작성 AI입니다.',
  '다음 명리 데이터를 기반으로 직장·이직운을 작성하십시오.\n{{chart_json}}',
  '{"type":"object","required":["headline","summary","sections","keywords"]}'::jsonb,
  'ACTIVE'
),
(
  '22222222-2222-2222-2222-222222222204',
  '11111111-1111-1111-1111-111111111104',
  1,
  '당신은 연애·관계 흐름을 설명하는 콘텐츠 작성 AI입니다.',
  '다음 명리 데이터를 기반으로 연애운을 작성하십시오.\n{{chart_json}}',
  '{"type":"object","required":["headline","summary","sections","keywords"]}'::jsonb,
  'ACTIVE'
),
(
  '22222222-2222-2222-2222-222222222205',
  '11111111-1111-1111-1111-111111111105',
  1,
  '당신은 동양 명리 데이터를 쉬운 한국어로 설명하는 콘텐츠 작성 AI입니다. 확정적 표현을 피하십시오. 월별 운세를 포함하십시오.',
  '다음 명리 데이터를 기반으로 2027 종합운세와 1~12월 월별 흐름을 작성하십시오.\n{{chart_json}}',
  '{"type":"object","required":["headline","summary","scores","sections","keywords","monthlyOutlook"]}'::jsonb,
  'ACTIVE'
);

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
) values
(
  '33333333-3333-3333-3333-333333333301',
  '2026년 종합운세',
  '2026-total',
  '올해의 흐름과 중요한 시기를 한눈에',
  '타고난 성향, 재물·직업·연애운, 월별 흐름까지 2026년 전체를 상세히 풀어드립니다.',
  19900,
  12900,
  null,
  'fortune',
  '22222222-2222-2222-2222-222222222201',
  'standard-report',
  30,
  'ACTIVE',
  1
),
(
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
),
(
  '33333333-3333-3333-3333-333333333302',
  '재물운 집중분석',
  '2026-money',
  '돈의 흐름과 새는 패턴을 집중 분석',
  '돈이 들어오는 방식, 새기 쉬운 습관, 상·하반기 차이를 현실적으로 안내합니다.',
  9900,
  6900,
  null,
  'fortune',
  '22222222-2222-2222-2222-222222222202',
  'standard-report',
  30,
  'ACTIVE',
  3
),
(
  '33333333-3333-3333-3333-333333333303',
  '직장·이직운',
  '2026-career',
  '이직·승진·직업 선택의 타이밍',
  '직장운의 흐름과 이직하기 좋은 시기, 피해야 할 시기를 중심으로 분석합니다.',
  9900,
  6900,
  null,
  'fortune',
  '22222222-2222-2222-2222-222222222203',
  'standard-report',
  30,
  'ACTIVE',
  4
),
(
  '33333333-3333-3333-3333-333333333304',
  '연애운',
  '2026-love',
  '만남과 관계의 흐름',
  '연애 성향과 올해의 인연 흐름, 관계에서 주의할 포인트를 풀어드립니다.',
  9900,
  6900,
  null,
  'fortune',
  '22222222-2222-2222-2222-222222222204',
  'standard-report',
  30,
  'ACTIVE',
  5
);
