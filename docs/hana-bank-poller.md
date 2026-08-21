# Hana Bank Poller

## Role

Periodic inbound-transfer fetch → normalize → match → PAID.

Does **not** generate AI reports itself (delegates to `startPaidReportJob` once on first PAID).

## Run

```bash
npm run bank:poll
```

Env:

- `BANK_PROVIDER=mock` — fixture / E2E
- `BANK_PROVIDER=hana` + `HANA_BANK_AUTOMATION_ENABLED=1` — real adapter (currently fails closed if unsupported)
- `BANK_POLL_INTERVAL_MS` ≥ 60000

## Failure mode

On bank error: orders stay `PENDING`, health `ERROR` with safe code only (`BANK_NOT_CONFIGURED`, etc.). Admin uses `/admin/bank-deposits` + manual match.

## Limitations

- No CAPTCHA/MFA bypass
- Personal banking automation may be blocked by the bank — treat as expected, use manual review
- Do not store full account statements
