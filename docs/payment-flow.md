# Payment Flow (PHASE 6)

운의결 유료 사주 리포트 결제 흐름입니다. **Toss Payments** (TEST 키) + Mock Provider(E2E).

## Order lifecycle

```text
PENDING  →  (Toss confirm + amount match)  →  PAID
PAID     →  (paid report job start)        →  GENERATING
GENERATING → (AI ok)                       →  COMPLETED
GENERATING → (AI fail)                     →  FAILED   (paid_at 유지, 재결제 금지)
PENDING  →  CANCELLED / (미래) REFUNDED
```

결제 사실(`paid_at`, `payments` row)과 AI 이행 상태를 분리합니다.  
AI 실패 시에도 결제 성공은 유지되며, 동일 주문으로 생성만 재시도합니다.

## Toss integration

| 단계 | 주체 | 설명 |
|------|------|------|
| 상품 CTA | Client | `POST /api/orders` (productId + sourceResultId만) |
| Order 생성 | Server | ACTIVE 상품 · DB `sale_price` · guest ownership |
| Checkout | `/checkout/[orderId]` | ownership + PENDING + price re-check |
| Widget | Toss SDK | `orderId = order_no`, `orderName = product_name_snapshot` |
| successUrl | `/payment/success` | query의 paymentKey/orderId/amount는 **증거일 뿐** |
| Confirm | `POST /api/payments/toss/confirm` | DB amount 기준 승인 |
| Fail | `/payment/fail` | PENDING 유지, 재시도 가능 |

Provider 코드 위치:

```text
src/lib/payments/
  provider.ts
  index.ts
  mock-provider.ts
  toss/
    client.ts   # NEXT_PUBLIC_TOSS_CLIENT_KEY only
    server.ts   # server-only + TOSS_SECRET_KEY
    types.ts
    mapper.ts   # redact
```

## Client / server responsibilities

**Client may send:** `productId`, `sourceResultId`, Toss callback query params.  
**Client must never be trusted for:** `amount`, `price`, `salePrice`, payment success flags.

**Server owns:** product ACTIVE check, price snapshot, ownership, Toss confirm, `payments` insert, `orders.status=PAID`, paid report trigger.

## Amount validation

Confirm requires all equal:

1. `orders.amount` (DB snapshot at create)
2. Callback `amount`
3. Provider `totalAmount` / mock approved amount

Mismatch → `PAYMENT_AMOUNT_MISMATCH`, **no PAID**.

## Idempotency

- `payments.payment_key` UNIQUE (partial index)
- Confirm by same `payment_key` → return existing success (no second Toss charge path)
- `markOrderPaidIfPending` uses `status = PENDING` filter (atomic)
- `reports.order_id` UNIQUE → one paid report row per order
- Success page refresh reuses confirm idempotency; does not re-start AI if already COMPLETED

## Guest ownership

- Cookie: `fortune_guest_session` (기존 무료 사주와 동일 — 결제용 쿠키 신규 발급 없음)
- Order: `guest_session_id` + `source_result_id` ownership 재검증
- Paid report: guest cookie match **or** `access_token_hash` (confirm 시 1회 raw token 발급)
- Order number / UUID alone is **not** auth

## Payment security

- Secret: `TOSS_SECRET_KEY` only in server files (`import "server-only"`)
- Never `NEXT_PUBLIC_TOSS_SECRET_KEY`
- Live keys (`live_sk_` / `live_gsk_`) blocked when `NODE_ENV !== production` or `APP_ENV` not production
- Same-origin on order create / confirm
- Soft rate limits on create/confirm
- `payment_key` never in public DTOs or analytics metadata
- `raw_response` redacted (no full card numbers / paymentKey)

## Failure recovery

| 상황 | 동작 |
|------|------|
| Widget 닫음 | Order PENDING 유지, 동일 checkout 재진입 |
| 가격 변경 | PENDING amount ≠ 현재 sale_price → 새 주문 필요 (`PRICE_CHANGED`) |
| Confirm 실패 | PENDING, fail UX |
| AI 실패 | `FAILED` + 결제 유지 + retry API (`POST /api/payments/status`) |
| 다른 guest의 orderId | 403 |

## Paid report trigger

```text
confirm success → PAID persisted → startPaidReportJob({ runGeneration: true })
```

Client `paymentSuccess=true` 로는 AI를 실행하지 않습니다.

## Pending order reuse

Same guest + product + source_result + **same amount** → reuse PENDING order.  
If product price changed → do not mutate old amount; create a new order after abandoning old PENDING (user re-clicks buy).

## Test vs production

| Env | Keys | Provider |
|-----|------|----------|
| local/test without Toss | none | `MockPaymentProvider` |
| QA with Toss TEST | `test_ck_` / `test_sk_` | Toss |
| production | live keys + `APP_ENV=production` | Toss only (mock forbidden) |

CI E2E uses Mock — no real Toss calls.

## Refund future flow

Schema supports `REFUNDED`, `cancelled_at`, `refunded_at`.  
Admin refund UI + Toss cancel API → later phase. Do not implement here.

## Analytics (non-sensitive)

`checkout_start`, `payment_request`, `payment_success`, `payment_fail`, `paid_report_start`, `paid_report_completed`  
Metadata may include `productId`, `amount`, `orderId` — never `paymentKey`.
