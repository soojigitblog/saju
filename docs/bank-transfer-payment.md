# Bank Transfer Payment (PHASE 6.2)

Default checkout for 운의결 pre-PG validation: **하나은행 계좌이체 + 자동 입금 매칭**.

Toss Payments code remains intact for post-business-registration activation.

## Matching strategy (chosen)

**입금자명(정규화 정확 일치) + 주문 금액 정확 일치 + 시간창**

Why not unique-cent pricing (12,913원 등):

- Listed sale price vs charged amount confuses users
- Friend-test volume is low enough that name+amount+time is practical
- Ambiguous duplicates → `AMBIGUOUS` → admin manual review (safer than wrong PAID)

Normalization: Unicode NFC, trim, collapse whitespace. **No fuzzy / partial match.**

## Architecture

```text
Product CTA (depositor name)
→ POST /api/orders (BANK_TRANSFER, server price)
→ /payment/bank/{orderId} (account DTO from server)
→ Bank Poller (npm run bank:poll)
→ processInboundBankTransaction
→ payments(BANK_TRANSFER) + orders PAID
→ startPaidReportJob (same as Toss)
```

## Providers

| Layer | Options |
|-------|---------|
| Checkout payment method | `BANK_TRANSFER` (default), `TOSS` (blocked in UI for now) |
| Bank scraper | `BANK_PROVIDER=mock` \| Hana adapter (fails closed → manual) |
| Card | Toss (PHASE 6) preserved |

## Security

- Account number only via `getBankTransferPublicAccount()` server DTO
- No CAPTCHA/MFA/security-media bypass
- Credentials: `HANA_BANK_CREDENTIAL_REF` only (never git / client / logs)
- Bank rows store fingerprint + masked depositor — no balances / full statements

## Idempotency

- `bank_transactions.fingerprint` UNIQUE
- `matched_order_id` UNIQUE (one tx → one order)
- `payments.payment_key` = `bank:{fingerprint}`
- Report: `reports.order_id` UNIQUE

## Manual fallback

`POST /api/admin/bank/manual-match` with `x-admin-manual-token`.  
Requires existing bank tx + amount re-check. No “PAID without transaction”.

## Poller

```bash
BANK_PROVIDER=mock npm run bank:poll
```

Min interval 60s (default 120s). Browser never scrapes the bank.

## Env

See `.env.example` — `BANK_TRANSFER_*`, `BANK_PROVIDER`, `ADMIN_MANUAL_TOKEN`.
