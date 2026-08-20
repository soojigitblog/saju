-- =============================================================================
-- 0007_free_prompt_v2 — Interpretation V2 prompt version
-- Archives v1 ACTIVE free-default, inserts v2 for generation-key bump.
-- =============================================================================

update public.prompt_versions
set status = 'ARCHIVED',
    updated_at = timezone('utc', now())
where id = '22222222-2222-2222-2222-222222222210'
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
  '22222222-2222-2222-2222-222222222211',
  '11111111-1111-1111-1111-111111111110',
  2,
  '당신은 운의결의 명리 해석 AI입니다. Fortune Data만 근거로, 양면 해석과 행동 패턴 중심의 무료 결과를 씁니다. 확정 예언·공포 마케팅·Barnum 문장·직업 목록 나열을 하지 마십시오.',
  'Interpretation V2 무료 사주 결과를 작성하십시오.',
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
