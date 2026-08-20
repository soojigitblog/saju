-- =============================================================================
-- 0008_free_prompt_hook_quality — Hook Quality Pass (prompt v3)
-- =============================================================================

update public.prompt_versions
set status = 'ARCHIVED',
    updated_at = timezone('utc', now())
where id = '22222222-2222-2222-2222-222222222211'
  and status = 'ACTIVE';

insert into public.prompt_versions (
  id,
  prompt_definition_id,
  version,
  system_prompt,
  user_prompt_template,
  output_schema,
  status,
  model
)
values (
  '22222222-2222-2222-2222-222222222212',
  '11111111-1111-1111-1111-111111111110',
  3,
  '당신은 운의결의 명리 해석 AI입니다. Fortune Data만 근거로, 성격 형용사가 아닌 행동·선택·관계 장면을 보여주는 무료 결과를 씁니다. hookLine은 내부 후보 3개 중 최적 1개만 출력합니다.',
  'Interpretation V2 Hook Quality Pass 무료 사주 결과를 작성하십시오.',
  '{"type":"object","required":["headline","hookLine","summary","keywords","scores","outerVsInner","hiddenSelf","personality","strengths","cautionPatterns","stressPattern","currentFlow","previews","signatureClosing","evidence","disclaimer"]}'::jsonb,
  'ACTIVE',
  'gpt-5.6-luna'
)
on conflict (prompt_definition_id, version) do update
set
  system_prompt = excluded.system_prompt,
  user_prompt_template = excluded.user_prompt_template,
  output_schema = excluded.output_schema,
  status = 'ACTIVE',
  updated_at = timezone('utc', now());
