# Hana Bank Poller (PHASE 6.4)

## Role

Authenticated Playwright session → fetch recent IN transactions → normalize → match → PAID → existing Paid Report pipeline.

Does **not** bypass CAPTCHA/MFA/OTP/security media.

## One-time login

```bash
npm run bank:hana:login
```

1. Browser opens https://banking.kebhana.com/
2. You log in normally (including OTP if the bank requires it)
3. Navigate to **조회 → 계좌조회 → 거래내역조회** for the 운의결 deposit account
4. Press Enter in the terminal — saves session profile + inquiry URL under `.playwright-hana/`

Never commit `.playwright-hana/` or `.bank-session/`.

## Poll

```bash
# Continuous (60–180s interval)
npm run bank:poll

# Single cycle smoke test
npm run bank:hana:poll
```

Env:

- `BANK_PROVIDER=hana`
- `HANA_BANK_AUTOMATION_ENABLED=1`
- `BANK_TRANSFER_ACCOUNT_NUMBER` / `HOLDER` — must match the account you open in the bank UI
- `BANK_POLL_INTERVAL_SECONDS` (default 120)

## User 「입금했어요」

Records `payment_check_requested_at` and triggers one poll when automation is enabled. Does **not** mark PAID.

## Failure modes

| Code | Meaning |
|------|---------|
| `HANA_SESSION_EXPIRED` | Re-run `bank:hana:login` |
| `AUTH_REQUIRED` | Bank asks for extra auth — manual step required |
| `BANK_CHECK_FAILED` | Transient error — orders stay PENDING, admin fallback |

Admin: `/admin/bank-deposits` + manual confirm still available.

## Security

- No internet banking passwords in env/git/logs
- Account numbers masked in logs
- Mock provider only for tests (`BANK_PROVIDER=mock`)
