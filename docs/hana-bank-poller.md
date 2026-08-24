# Hana Bank Poller (PHASE 6.4 / 6.4.1)

## Role

Windows Credential Manager → Playwright ID/password UI login (when needed) → fetch IN txs → match → PAID → Paid Report.

Does **not** bypass CAPTCHA/MFA/OTP/security media / certificate modules.

## One-time credential registration

```bash
npm run bank:hana:credentials
```

Stores username/password in **Windows Credential Manager** (`wiro-hana-bank`).
Never put bank passwords in `.env`, DB, or source.

Delete:

```bash
npm run bank:hana:credentials:delete
```

## Recommended worker

```bash
# .env.local: BANK_PROVIDER=hana, HANA_BANK_AUTOMATION_ENABLED=1
npm run bank:hana:start
```

Flow: credential check → session check → auto ID login if expired → poll loop → re-login on expiry (bounded backoff).

First-time tip: after a successful login, open **거래내역조회** once so the inquiry URL is saved (auto-login also tries to navigate there).

## Manual login (fallback)

```bash
npm run bank:hana:login
```

Use when auto-login returns `AUTO_LOGIN_UNSUPPORTED` / `AUTH_REQUIRED` / `CAPTCHA_REQUIRED`.

## Failure modes

| Code | Meaning |
|------|---------|
| `HANA_SESSION_EXPIRED` | Session gone — auto-login will retry if enabled |
| `LOGIN_REQUIRED` | No credentials or auto-login disabled |
| `LOGIN_FAILED` | ID/password login failed |
| `CAPTCHA_REQUIRED` | CAPTCHA shown — no auto-solve |
| `AUTH_REQUIRED` | OTP/MFA/security media — no bypass |
| `AUTO_LOGIN_UNSUPPORTED` | Cert-only / TouchEn blocks unattended ID login |
| `AUTO_LOGIN_DISABLED_TEMPORARILY` | Too many failures — account protection |

Admin: `/admin/bank-deposits` → **HANA AUTO CHECK** (never shows credentials).

## Security

- No internet banking passwords in env/git/logs
- Account numbers masked in logs
- Mock provider only for tests (`BANK_PROVIDER=mock`)
