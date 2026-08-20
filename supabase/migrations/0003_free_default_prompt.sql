-- =============================================================================
-- 0003_free_default_prompt — PHASE 5 free-default prompt definition
-- =============================================================================

insert into public.prompt_definitions (id, name, slug)
values (
  '11111111-1111-1111-1111-111111111110',
  '무료 사주 기본',
  'free-default'
)
on conflict (slug) do nothing;

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
  '22222222-2222-2222-2222-222222222210',
  '11111111-1111-1111-1111-111111111110',
  1,
  '당신은 구조화된 명리 데이터를 쉬운 한국어로 설명하는 무료 미리보기 작성 AI입니다. 확정적 예언과 공포 마케팅을 하지 마십시오.',
  '다음 명리 데이터로 무료 미리보기 결과를 작성하십시오.\n{{chart_json}}',
  '{"type":"object","required":["headline","summary","keywords","scores","personality","currentFlow","previews","evidence","disclaimer"]}'::jsonb,
  'ACTIVE',
  'gpt-5.6-luna'
)
on conflict (prompt_definition_id, version) do nothing;

-- Application policy: prefer a single ACTIVE version per definition.
-- Enforce via partial unique index when possible (Postgres).
create unique index if not exists prompt_versions_one_active_per_definition
  on public.prompt_versions (prompt_definition_id)
  where status = 'ACTIVE';
