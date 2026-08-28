# Zero-Cost Production Launch (P7)

P6.3 Zero-Cost Launch Gate가 **READY**인 상태에서, 동일한 정책을 **실제 배포 환경**에서 검증합니다.

## 필수 정책 (배포 runtime)

| 변수 | 값 |
|------|-----|
| `PAID_CHECKOUT_ENABLED` | `true` |
| `PAID_REPORT_GENERATION_ENABLED` | `false` |
| `GEMINI_API_KEY_PAID` | **미설정** |
| Paid Gemini calls | **0** |

`.env.local`만 보고 PASS 처리하지 않습니다. 배포 호스트 env 또는 원격 `launch-policy` API로 확인합니다.

## 검증 명령

### 1. 배포 환경 변수 (호스트에서)

```bash
DEPLOYMENT_ENV_CHECK=1 node scripts/verify-zero-cost-production-env.cjs
```

### 2. 원격 배포 URL

```bash
PRODUCTION_ORIGIN=https://your-domain.com node scripts/verify-zero-cost-production-env.cjs
```

### 3. 자동화 게이트 (공개 페이지·모바일·누출·정책)

```bash
PRODUCTION_ORIGIN=https://your-domain.com npx tsx --require ./scripts/shim-server-only.cjs scripts/phase-p7-zero-cost-production-gate.ts
```

### 4. Vitest

```bash
npm run test -- tests/p7-production-launch.test.ts tests/zero-cost-launch-operations.test.ts
```

## QA 드라이런 (실제 입금 없음)

1. 배포 URL에서 유료 상품 주문
2. 입금자명: `QA-홍길동` (접두사 `QA-`)
3. 관리자 **입금 확인** 화면에서 **QA 드라이런** 배지 확인
4. 실제 송금은 하지 않음
5. 필요 시 관리자가 confirm → `WAITING_FOR_AI` 확인

## 첫 실제 고객 런북

관리자 `/admin/runbook` 참고.

1. 하나은행 실제 입금 확인
2. 정확한 주문 PAID 처리
3. 고객 「결제 확인됨 · 리포트 준비 중」 확인
4. **첫 실제 결제 확인 후에만** `GEMINI_API_KEY_PAID` 설정
5. Admin QA Money Live Smoke 1건
6. Human Review
7. 해당 고객 report generation
8. PDF 확인
9. 고객 결과 활성화

## Launch policy API

`GET /api/ops/launch-policy` — 시크릿 없이 정책 스냅샷만 반환 (스모크용).
