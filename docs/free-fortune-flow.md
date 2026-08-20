# Free Fortune End-to-End Flow (PHASE 5)

## Flow diagram

```text
Landing (/)
  → analytics landing_view (best effort)
/fortune
  → ensure HttpOnly guest cookie
  → POST /api/fortune/free
       validate → rate limit → profile → engine → chart
       → generation_key dedupe → AI free → free_results
  → /fortune/loading/{id} (poll status)
  → /result/{id} (owner-only Public DTO)
  → /product/{slug}?result={id} (ownership re-check)
```

## Guest ownership

- Cookie: `fortune_guest_session` (HttpOnly, Secure in production, SameSite=Lax)
- Value: cryptographically random UUID
- Used for profile / free_result ownership only
- **Not** paid-report credential (PHASE 6 uses `access_token_hash`)

## Profile lifecycle

- One guest session may own many profiles (family / friends)
- Reuse when same guest + canonical birth facts match
- Nickname can update on reuse

## Chart dedupe

- Reuse `fortune_charts` row when same profile + `calculationHash` + engine version

## AI generation flow

1. Insert/find free_result by `generation_key`
2. Mark GENERATING
3. Call free interpreter (outside DB transaction)
4. COMPLETED / FAILED update + usage fields

`generation_key = SHA-256(calculationHash | promptVersionId | model | free)`

UNIQUE collision → treat as dedupe success.

## Generation state / loading recovery

Statuses: PENDING | GENERATING | COMPLETED | FAILED

Loading page polls `GET /api/fortune/free/{id}/status` (~1.5s).
Refresh reuses DB state — does not start a new OpenAI call.

Failed → user Retry via `POST .../retry` increments `attempt_count` on same row.

## Result authorization

Server checks `profile.guest_session_id === cookie`.
Client never queries `free_results` directly.
Public DTO excludes ids, hashes, tokens, raw chart.

## Rate limit

Env:

- `FREE_FORTUNE_LIMIT` default **5**
- `FREE_FORTUNE_WINDOW_SECONDS` default **3600**

Key: guest session (+ optional hashed IP). Raw IP is not stored.

## Analytics

- Separate cookie: `fortune_analytics_session`
- First-touch UTM: `fortune_attribution` (30 days)
- `POST /api/analytics` whitelist only
- Failures never break fortune flow

## Orchestration choice (MVP)

**Synchronous request orchestration** in `createFreeFortune`:

- Simpler than queue for MVP
- Loading id is allocated before/during completion; poll recovers on refresh
- **Limitation:** serverless request timeout may cut long OpenAI calls; service is separated for future queue workers

Same-origin check on mutation POSTs + SameSite cookies.

## Retention (policy)

MVP: keep free results for operational reuse; automatic purge job **not** implemented.
Suggested future: 90–180 days soft retention.

## Security headers

`X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`.
Result routes: `Cache-Control: private, no-store`.

## Known limitations

- LIVE DB / LIVE AI not verified without env credentials
- In-process rate limit / mock store (not Redis)
- No background job queue yet
- Checkout still PHASE 6
