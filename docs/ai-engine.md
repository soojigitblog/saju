# AI Interpretation Engine

## Architecture

```text
FortuneChart (PHASE 3 — only calculation source)
      ↓
buildFortuneAiContext (strip PII / ids)
      ↓
Prompt composition (system + product + fortune JSON)
      ↓
OpenAI Responses API + Structured Outputs
      ↓
Zod parse
      ↓
Semantic validator (evidence / safety / unknown-hour)
      ↓
InterpretationResult + meta (prompt version, generationKey, usage)
```

AI **never** recalculates pillars, five elements, ten gods, solar terms, or lunar dates.

## Responses API

- SDK: `openai` (exact pin in package.json / lockfile)
- Call path: `client.responses.parse` with `zodTextFormat(schema, name)`
- Format: `text.format` JSON Schema (`strict`)
- Module: `src/lib/ai/wrapper/generate-structured.ts`
- Client: `src/lib/ai/client.ts` (`import "server-only"`)

## Model strategy

Configurable via env (never hardcode at call sites):

| Tier | Env | Default |
|------|-----|---------|
| Provider | `AI_PROVIDER` | `gemini` (dev recommendation) |
| FREE (Gemini) | `GEMINI_MODEL_FREE` | `gemini-2.5-flash` |
| FREE (OpenAI) | `AI_MODEL_FREE` | `gpt-5.6-luna` |
| PAID (OpenAI) | `AI_MODEL_PAID` | `gpt-5.6-terra` |

See also: [ai-providers.md](./ai-providers.md)

Also: `OPENAI_API_KEY` / `GEMINI_API_KEY` (server-only), `AI_TIMEOUT_MS`, `AI_MAX_RETRIES`.  
`AI_FALLBACK_PROVIDER` must stay empty (no silent Gemini→OpenAI billing).

## Prompt composition

```text
BASE SYSTEM PROMPT
+ SAFETY RULES
+ PRODUCT SYSTEM NOTES (prompt_versions.system_prompt)
+ PRODUCT INSTRUCTION (user_prompt_template / productInstruction)
+ FORTUNE DATA JSON
+ PRODUCT CONFIG JSON
+ PRESENTATION DATA JSON (nickname as data only)
+ OUTPUT CONTRACT
```

Modules: `src/lib/ai/prompts/*`

## Structured Output

- Free: `src/lib/ai/schemas/free-result.ts`
- Paid: `src/lib/ai/schemas/paid-report.ts`
- Same Zod schemas drive OpenAI Structured Outputs and app validation.

## Free Schema (summary)

headline, summary, keywords, scores(1–5), personality, currentFlow, previews[], evidence[], disclaimer

`scoreSource` in meta: `ai_v1` (future deterministic scoring ready).

## Paid Schema (summary)

title, executiveSummary, keywords, sections[{key,title,summary,detail,evidence,cautions}], actionGuide[], evidence[], disclaimer

Required section keys: personality, overall, money, career, love, advice.

## Evidence strategy

Evidence entries must match a whitelist derived from `FortuneAiContext`  
(e.g. `dayMaster`, `fiveElements.wood`, `pillars.month.stem`, `tenGods.year.stem`, `hourUnknown`).

Invalid / invented keys → `SEMANTIC_VALIDATION_FAILED`.

## Semantic validation

- Score range 1–5
- Length bounds (free)
- Required paid sections / non-empty detail
- Evidence whitelist
- Forbidden prediction patterns (1st-line defense)
- Unknown hour: no concrete 시주/지지시 해석
- Duplicate sentence detection (basic)

## Safety rules

No medical/legal/investment directives; no deterministic pregnancy/divorce/accident claims; no fear-based upsell.

Disclaimer constant: `src/lib/ai/disclaimer.ts`.

## Retry policy

Retry (bounded, exponential backoff): 429, 5xx, timeout/network.

No retry: invalid API key, bad request, invalid model, schema/semantic failures.

## Generation key

```text
SHA-256(calculationHash | promptVersionId | model | resultType | productSlug)
```

In-memory cache scaffold: `generation-cache.ts`.  
DB uniqueness: `ai_generations.generation_key`, plus optional keys on `free_results` / `reports`.

## Usage logging

Stored on generation meta and DB columns:

`input_tokens`, `output_tokens`, `total_tokens`, `provider_request_id`.

Table: `ai_generations` (migration `0002_ai_generations.sql`).

## Prompt versioning

Every result meta records:

`promptDefinitionId`, `promptVersionId`, `promptVersionNumber`, `model`, `engineVersion`, `providerVersion`.

Existing reports keep their `prompt_version_id` even if ACTIVE prompt changes.

## Production mock policy

- Missing `OPENAI_API_KEY` in **production runtime** → explicit failure (no silent mock).
- development / test / `next build` → mock interpreter allowed.

## Dev endpoint

`POST /api/dev/fortune/interpret` — **development only** (`notFound()` otherwise).

## Tests

```bash
npm run test:ai
npm run test:ai:integration   # requires OPENAI_API_KEY
```

## Known limitations

- No PHASE 5/6 UX wiring (payment / free-result page flow)
- No Admin Prompt Editor
- No PDF / email / alimtalk
- Semantic forbidden list is heuristic, not complete safety
- Cost dashboards not built yet (schema ready)
- Live OpenAI integration tests are optional
