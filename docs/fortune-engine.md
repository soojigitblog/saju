# Fortune Engine

Deterministic 사주 원국 계산 모듈 (`src/lib/fortune-engine`). AI 해석과 분리됩니다.

Release identity: `src/lib/fortune-engine/release-manifest.ts` (single source of truth).

## Architecture

```text
BirthInput
  → normalize (YYYY-MM-DD / HH:mm, no ambiguous Date parsing)
  → CalendarProvider (manseryeok adapter only)
  → pillars + solar terms
  → fiveElements / tenGods (our calculators)
  → FortuneChart JSON (versioned + calculationHash)
```

외부 라이브러리는 `providers/manseryeok-provider.ts`에서만 import합니다.

## Provider

| Item | Value |
|------|-------|
| Package | `manseryeok` |
| Version | **2.0.0** (exact pin in package.json + lockfile) |
| License | MIT |

### Provider upgrade policy

`manseryeok`를 자동 upgrade하지 않습니다.

절차:

1. 별도 branch
2. 전체 Golden / Release Gate 테스트 실행
3. 기존 fixture 결과 diff
4. 변경 이유 확인 (KASI 정합 포함)
5. 계산값이 바뀌면 `engineVersion` bump 필수
6. 승인 후 반영

계산값이 바뀌었는데 `engineVersion`을 유지하면 안 됩니다.

## 지원 날짜 범위 (제품)

**1900–2050** — `FORTUNE_RELEASE_MANIFEST.supportYear`  
UI / Zod / Engine normalize가 동일 constant를 사용합니다.

## Timezone

유일 지원: `Asia/Seoul`  
절기·출생 시각은 `+09:00` 명시 ISO로 구성하여 OS timezone에 의존하지 않습니다.

## Calculation Convention

| 항목 | 값 |
|------|----|
| 연주 | `lichun` |
| 월주 | `solar_term` |
| 일주 | provider 60갑자 |
| 자시 | `dayBoundary = midnight` |
| 진태양시 | `timeCorrection = none` |

### Solar-term boundary rule (`gte_enters_new`)

```text
birthInstant <  termInstant  → 이전 절기 구간
birthInstant >= termInstant  → 새 절기 구간 진입
```

즉 절입 **정각 분**부터 새 연주/월주가 적용됩니다. (2024-02-04 17:27 KST 입춘으로 검증)

### midnight (자시) convention — 사용자/내부 동일

현재 시스템의 `midnight`에서는:

```text
23:00–23:59
  일주: 달력상 당일
  시주 천간 기준 일간: 당일 일간
  시지: 子

00:00 이후
  civil calendar date가 바뀜
  01:00 미만까지는 여전히 子시 (당일 일간 기준)
01:00
  丑시 시작
```

암묵적 jasi/야자시 관법을 사용하지 않습니다.

## 음력 / 윤달

- 한국/KASI 음력 기준
- 평달/윤달 UI + `lunarLeapMonth`
- Regression: 1997 설날 = 양력 1997-02-08 (중국 표기 2/7과 다름)

## 오행 / 십성

- 오행: `visible_stems_branches_count` (시간 알면 합=8, 모르면 합=6)
- 십성: 자체 구현 유지, 지지=본기. Provider 십성과 test에서만 교차검증

## Engine metadata / hash

차트에서 추적:

```text
engineName, engineVersion, providerName, providerVersion
yearBoundary, monthBoundary, dayBoundary, timeCorrection, timezone
calculationHash (SHA-256)
```

Hash 입력: normalized birth + conventions + engine/provider identity  
제외: `calculatedAt`, nickname, profileId

## KASI validation (Release Gate)

공식 근거: [KASI 달력자료(월력요항)](https://astro.kasi.re.kr/kor/life/post/calendarData)

Fixture 위치 (연도별 분리, 라이브러리 출력 금지):

- `tests/fixtures/kasi/2024.ts` — 입춘 `2024-02-04 17:27` KST
- `tests/fixtures/kasi/2026.ts` — 24절기 / 12절 (예: 입춘 `2026-02-04 05:02` KST)
- `tests/fixtures/kasi/2028.ts` — 입춘 `2028-02-04 16:31` KST (연도 혼입 sanity)

참고: PHASE 3.1에서 2028 입춘 `16:31`을 2026 fixture로 잘못 넣은 적이 있음.  
교정 후 `manseryeok@2.0.0`과 2026 12절 **분 단위 일치**.

## API / Debug

- `POST /api/fortune/calculate` — body size 제한, Zod object only, 표준 Error Code만 반환 (stack/raw provider 비노출)
- `/fortune/debug` — `NODE_ENV !== "development"` 이면 `notFound()` (직접 URL 포함)

## 제외 기능

대운·세운·신살·12운성·용신·합충·AI·결제·PDF 등 (Provider가 제공해도 Scope 확장 금지)

## 알려진 제한

- timezone = Asia/Seoul only
- 진태양시 없음
- 1900–2050만 제품 지원
