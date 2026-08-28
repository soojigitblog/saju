-- =============================================================================
-- seed.sql — development sample data (no real AI prompts required)
-- =============================================================================

-- Fixed UUIDs for reproducible local/dev seeds
-- prompt definitions
insert into public.prompt_definitions (id, name, slug) values
  ('11111111-1111-1111-1111-111111111101', '나의 사주 사용설명서', '2026-total'),
  ('11111111-1111-1111-1111-111111111102', '나의 돈 사용설명서', 'money'),
  ('11111111-1111-1111-1111-111111111103', '나의 일 사용설명서', 'career'),
  ('11111111-1111-1111-1111-111111111104', '나의 연애 사용설명서', 'love'),
  ('11111111-1111-1111-1111-111111111105', '2027 종합운세 (비활성)', '2027-total'),
  ('11111111-1111-1111-1111-111111111106', '사주×타로 심층 교차리딩', 'saju-tarot-deep')
on conflict (id) do update set name = excluded.name;

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
  '당신은 동양 명리 데이터를 쉬운 한국어로 설명하는 콘텐츠 작성 AI입니다. 확정적 표현을 피하십시오. 대운·세운이 없으면 연월 길흉을 만들지 마십시오.',
  '다음 명리 데이터를 기반으로 종합 사주 리포트를 작성하십시오. 월별 운세·올해 타이밍 예언은 하지 마십시오.\n{{chart_json}}',
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
),
(
  '22222222-2222-2222-2222-222222222206',
  '11111111-1111-1111-1111-111111111106',
  1,
  '당신은 사주 구조와 타로 장면을 교차해 현재 고민을 깊게 읽는 편집자입니다. 대운·세운·월운 예언과 미래 확정 단정을 하지 마십시오.',
  '다음 컨텍스트로 PaidCrossReadingV1을 작성하십시오.\n{{context_json}}',
  '{"type":"object","required":["questionSummary","sajuBaseline","cards","crossConnections","hiddenTension"]}'::jsonb,
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
) values
(
  '33333333-3333-3333-3333-333333333301',
  '나의 사주 사용설명서',
  '2026-total',
  '판단·관계·일·돈·사랑이 한 사람 안에서 어떻게 연결되는지',
  '타고난 성향과 결정 방식, 일·돈·관계에서 반복되는 패턴을 영역 간 연결과 모순·강점→그림자까지 묶어 풀어 드립니다. 각 Focus 리포트를 단순 합친 것이 아닙니다. 대운·세운 기반의 연도/월별 길흉 예언은 포함하지 않습니다.',
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
  '2027년 종합운세 (준비중)',
  '2027-total',
  '대운·세운 엔진 준비 후 오픈 예정',
  '연도/월별 운세는 대운·세운 데이터가 필요합니다. 현재 엔진에서는 제공하지 않아 판매를 일시 중지했습니다.',
  19900,
  12900,
  null,
  'fortune',
  '22222222-2222-2222-2222-222222222205',
  'standard-report',
  30,
  'INACTIVE',
  2
),
(
  '33333333-3333-3333-3333-333333333302',
  '나의 돈 사용설명서',
  '2026-money',
  '벌고 쓰고 판단하고 관리할 때 반복되는 돈의 패턴',
  '돈이 들어오는 시기를 맞히는 운세가 아닙니다. 돈을 벌고 쓰고 판단하고 관리할 때 반복되는 나의 패턴을 행동 중심으로 깊게 읽습니다. 특정 월·상하반기 길흉 타이밍 예언은 포함하지 않습니다.',
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
  '나의 일 사용설명서',
  '2026-career',
  '직업명이 아니라, 능력이 살아나는 일의 조건과 패턴',
  '이직 시기를 예언하지 않습니다. 일할 때 능력이 살아나는 조건, 조직·책임·인정·과부하·변화 욕구를 행동 중심으로 분석합니다. 이직 월·승진 시기 예언은 포함하지 않습니다.',
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
  '나의 연애 사용설명서',
  '2026-love',
  '관계가 깊어질수록 달라지는 나의 패턴',
  '새 인연 시기를 예언하지 않습니다. 호감·확신 전후·표현·서운함·갈등·거리·회복까지 관계가 깊어질수록 달라지는 나를 행동 중심으로 분석합니다. 올해 인연·만남 시기 예언은 포함하지 않습니다.',
  9900,
  6900,
  null,
  'fortune',
  '22222222-2222-2222-2222-222222222204',
  'standard-report',
  30,
  'ACTIVE',
  5
),
(
  '33333333-3333-3333-3333-333333333306',
  '사주×타로 심층 교차리딩',
  'saju-tarot-deep',
  '타고난 패턴과 지금 이 고민을 깊게 교차로 읽기',
  '무료 체험의 긴 버전이 아닙니다. 내 타고난 패턴과 지금 이 고민을 함께 놓고, 카드별 의미·교차 연결·숨은 긴장·선택 관점·현실 행동까지 깊게 분석합니다. 미래 확정 예언은 포함하지 않습니다.',
  6900,
  4900,
  null,
  'tarot_paid',
  '22222222-2222-2222-2222-222222222206',
  'paid-tarot-cross',
  20,
  'ACTIVE',
  6
)
on conflict (id) do update set
  name = excluded.name,
  short_description = excluded.short_description,
  description = excluded.description,
  regular_price = excluded.regular_price,
  sale_price = excluded.sale_price,
  product_type = excluded.product_type,
  prompt_version_id = excluded.prompt_version_id,
  template_id = excluded.template_id,
  free_ratio = excluded.free_ratio,
  status = excluded.status,
  sort_order = excluded.sort_order;
