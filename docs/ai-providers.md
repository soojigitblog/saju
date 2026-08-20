# AI Providers

## Architecture

```text
                    ┌→ GeminiProvider   (@google/genai)
Fortune Interpreter → AIProvider
                    ├→ OpenAIProvider   (Responses API — preserved)
                    └→ MockInterpreter  (dev/test)
                         ↓
                 Shared Zod Schemas
                         ↓
                 Semantic Validator
```

Fortune calculation remains **fortune-engine v1.0.0** only. Providers never recalculate pillars.

## Switching

```env
AI_PROVIDER=gemini   # recommended for free-tier development
# AI_PROVIDER=openai
# AI_PROVIDER=mock
```

| Provider | Env key | Free model default |
|----------|---------|--------------------|
| gemini | `GEMINI_API_KEY` | `GEMINI_MODEL_FREE` → `gemini-2.5-flash` |
| openai | `OPENAI_API_KEY` | `AI_MODEL_FREE` → `gpt-5.6-luna` |
| mock | (none) | `mock` |

Unknown `AI_PROVIDER` → `CONFIGURATION_ERROR`.

## Free tier (Gemini)

- Structured JSON: `responseMimeType: application/json` + `responseJsonSchema` (from shared Zod via `z.toJSONSchema`)
- Free-tier quota/rate limits apply — app-level `FREE_FORTUNE_LIMIT` remains
- Public rate-limit message: “현재 분석 요청이 많습니다…”

## No automatic fallback

```env
AI_FALLBACK_PROVIDER=
```

Gemini free-tier exhaustion must **not** silently call OpenAI (unexpected billing).

## Generation key v2

```text
v2 | calculationHash | promptVersionId | provider | model | resultType | productSlug
```

Gemini and OpenAI results are distinct generations.

## Usage normalization

```ts
{ inputTokens?, outputTokens?, totalTokens? }
```

Do not invent missing token counts.

## Production rules

- `AI_PROVIDER=mock` → **blocked**
- Matching API key required for gemini/openai
- Keys are server-only (`import "server-only"`) — never `NEXT_PUBLIC_*`

## Tests

```bash
npm run test:ai
npm run test:ai:gemini   # requires GEMINI_API_KEY
```
