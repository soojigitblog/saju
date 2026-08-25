-- PHASE P2.4 — Product name lock + Paid Saju×Tarot product
-- Does NOT rewrite historical orders.product_name_snapshot.

-- ---------------------------------------------------------------------------
-- 1) Rename ACTIVE fortune products (id/slug unchanged)
-- ---------------------------------------------------------------------------
update public.products
set
  name = '나의 사주 사용설명서',
  short_description = '판단·관계·일·돈·사랑이 한 사람 안에서 어떻게 연결되는지',
  description =
    '타고난 성향과 결정 방식, 일·돈·관계에서 반복되는 패턴을 '
    || '영역 간 연결과 모순·강점→그림자까지 묶어 풀어 드립니다. '
    || '각 Focus 리포트를 단순 합친 것이 아닙니다. '
    || '대운·세운 기반의 연도/월별 길흉 예언은 포함하지 않습니다.'
where slug = '2026-total';

update public.prompt_definitions
set name = '나의 사주 사용설명서'
where slug = '2026-total';

update public.products
set
  name = '나의 돈 사용설명서',
  short_description = '벌고 쓰고 판단하고 관리할 때 반복되는 돈의 패턴',
  description =
    '돈이 들어오는 시기를 맞히는 운세가 아닙니다. '
    || '돈을 벌고 쓰고 판단하고 관리할 때 반복되는 나의 패턴을 '
    || '행동 중심으로 깊게 읽습니다. '
    || '특정 월·상하반기 길흉 타이밍 예언은 포함하지 않습니다.'
where slug = '2026-money';

update public.prompt_definitions
set name = '나의 돈 사용설명서'
where slug in ('2026-money', 'money');

update public.products
set
  name = '나의 일 사용설명서',
  short_description = '직업명이 아니라, 능력이 살아나는 일의 조건과 패턴',
  description =
    '이직 시기를 예언하지 않습니다. '
    || '일할 때 능력이 살아나는 조건, 조직·책임·인정·과부하·변화 욕구를 '
    || '행동 중심으로 분석합니다. '
    || '이직 월·승진 시기 예언은 포함하지 않습니다.'
where slug = '2026-career';

update public.prompt_definitions
set name = '나의 일 사용설명서'
where slug in ('2026-career', 'career');

update public.products
set
  name = '나의 연애 사용설명서',
  short_description = '관계가 깊어질수록 달라지는 나의 패턴',
  description =
    '새 인연 시기를 예언하지 않습니다. '
    || '호감·확신 전후·표현·서운함·갈등·거리·회복까지 '
    || '관계가 깊어질수록 달라지는 나를 행동 중심으로 분석합니다. '
    || '올해 인연·만남 시기 예언은 포함하지 않습니다.'
where slug = '2026-love';

update public.prompt_definitions
set name = '나의 연애 사용설명서'
where slug in ('2026-love', 'love');

-- Keep prices locked (idempotent)
update public.products set sale_price = 6900, regular_price = 9900
where slug in ('2026-money', '2026-career', '2026-love');
update public.products set sale_price = 12900, regular_price = 19900
where slug = '2026-total';

-- ---------------------------------------------------------------------------
-- 2) Paid Tarot product + prompt
-- ---------------------------------------------------------------------------
insert into public.prompt_definitions (id, name, slug)
values (
  '11111111-1111-1111-1111-111111111106',
  '사주×타로 심층 교차리딩',
  'saju-tarot-deep'
)
on conflict (id) do update set name = excluded.name;

insert into public.prompt_versions (
  id,
  prompt_definition_id,
  version,
  system_prompt,
  user_prompt_template,
  output_schema,
  status
) values (
  '22222222-2222-2222-2222-222222222206',
  '11111111-1111-1111-1111-111111111106',
  1,
  '당신은 사주 구조와 타로 장면을 교차해 현재 고민을 깊게 읽는 편집자입니다. '
  || '대운·세운·월운 예언과 미래 확정 단정을 하지 마십시오. '
  || '사주와 타로를 나란히 나열하지 말고, 둘을 연결한 새 Insight를 만드십시오.',
  '다음 InterpretationContext subset, TarotContext, QuestionContext로 '
  || 'PaidCrossReadingV1을 작성하십시오.\n{{context_json}}',
  '{"type":"object","required":["questionSummary","sajuBaseline","cards","crossConnections","hiddenTension","choicePerspective","actionOptions","closingInsight"]}'::jsonb,
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
  '33333333-3333-3333-3333-333333333306',
  '사주×타로 심층 교차리딩',
  'saju-tarot-deep',
  '타고난 패턴과 지금 이 고민을 깊게 교차로 읽기',
  '무료 체험의 긴 버전이 아닙니다. '
  || '내 타고난 패턴과 지금 이 고민을 함께 놓고, '
  || '카드별 의미·교차 연결·숨은 긴장·선택 관점·현실 행동까지 깊게 분석합니다. '
  || '미래 확정 예언은 포함하지 않습니다.',
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
  status = 'ACTIVE',
  sort_order = excluded.sort_order;

-- ---------------------------------------------------------------------------
-- 3) Optional link from order → prior free tarot reading (cards/question)
-- ---------------------------------------------------------------------------
alter table public.orders
  add column if not exists source_tarot_reading_id uuid
    references public.tarot_readings (id) on delete set null;

create index if not exists orders_source_tarot_reading_idx
  on public.orders (source_tarot_reading_id);

-- ---------------------------------------------------------------------------
-- 4) ai_generations result_type for paid tarot
-- ---------------------------------------------------------------------------
alter table public.ai_generations
  drop constraint if exists ai_generations_result_type_check;

alter table public.ai_generations
  add constraint ai_generations_result_type_check
  check (result_type in ('free', 'paid', 'tarot_cross', 'paid_tarot_cross'));
