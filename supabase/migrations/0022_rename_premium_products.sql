-- PHASE P1.1 — Rename premium product copy; remove unsupported 대운/세운 year-luck claims.
-- Does NOT change product ids or slugs (preserves order/report FK integrity).
-- Future year-luck products can be added when Daeun/Saeun engine exists.

-- 12,900: 종합 사주 리포트 (was "2026년 종합운세")
update public.products
set
  name = '종합 사주 리포트',
  short_description = '성향·일·돈·관계를 하나의 리포트로',
  description =
    '타고난 성향과 결정 방식, 일·돈·관계에서 반복되는 패턴을 행동 중심으로 풀어 드립니다. '
    || '대운·세운 기반의 연도/월별 길흉 예언은 포함하지 않습니다.',
  sort_order = 1
where slug = '2026-total';

-- Prompt definition label (slug unchanged)
update public.prompt_definitions
set name = '종합 사주 리포트'
where slug = '2026-total';

update public.prompt_versions
set
  system_prompt =
    '당신은 동양 명리 데이터를 쉬운 한국어로 설명하는 콘텐츠 작성 AI입니다. '
    || '확정적 표현을 피하십시오. 대운·세운이 없으면 연월 길흉을 만들지 마십시오.',
  user_prompt_template =
    '다음 명리 데이터를 기반으로 종합 사주 리포트를 작성하십시오. '
    || '월별 운세·올해 타이밍 예언은 하지 마십시오.\n{{chart_json}}'
where id = '22222222-2222-2222-2222-222222222201';

-- 6,900 money — remove timing claims
update public.products
set
  short_description = '돈의 성향·새는 패턴·활용법을 깊게',
  description =
    '돈을 대하는 기본 성향, 벌고 새는 패턴, 판단이 흔들릴 때, '
    || '안정적으로 만드는 방식과 현실적인 행동 가이드를 집중 분석합니다. '
    || '특정 월·상하반기 길흉 타이밍 예언은 포함하지 않습니다.'
where slug = '2026-money';

-- career — environment over timing
update public.products
set
  short_description = '잘 맞는 업무·조직 환경 집중 분석',
  description =
    '일할 때의 캐릭터, 능력이 살아나는 업무, 답답해지는 조직, '
    || '갈등·과부하·인정 방식과 변화 신호를 행동 중심으로 분석합니다. '
    || '이직 월·승진 시기 예언은 포함하지 않습니다.'
where slug = '2026-career';

-- love — behavior over year flow
update public.products
set
  short_description = '끌림·갈등·거리의 행동 패턴 분석',
  description =
    '마음이 가는 방식, 관계가 깊어진 뒤의 패턴, 싸움과 거리, '
    || '잘 맞는 관계 방식을 실제 행동 중심으로 풀어 드립니다. '
    || '올해 인연·만남 시기 예언은 포함하지 않습니다.'
where slug = '2026-love';

-- 2027 year-luck product: unsupported without Daeun/Saeun → deactivate (keep row for integrity)
update public.products
set
  status = 'INACTIVE',
  name = '2027년 종합운세 (준비중)',
  short_description = '대운·세운 엔진 준비 후 오픈 예정',
  description =
    '연도/월별 운세는 대운·세운 데이터가 필요합니다. '
    || '현재 엔진에서는 제공하지 않아 판매를 일시 중지했습니다.'
where slug = '2027-total';

update public.prompt_definitions
set name = '2027 종합운세 (비활성)'
where slug = '2027-total';
