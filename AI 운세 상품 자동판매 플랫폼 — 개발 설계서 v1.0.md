# AI 운세 상품 자동판매 플랫폼 — 개발 설계서 v1.0

## 0. 프로젝트 목표

광고에서 유입된 사용자가 별도 상담 없이 다음 과정을 완료할 수 있는 모바일 중심 웹서비스를 만든다.

**광고 → 랜딩 → 사주정보 입력 → 무료 결과 → 상품 추천 → 결제 → AI 상세 결과 생성 → 웹 리포트/PDF → 재구매**

핵심은 단순한 사주 사이트가 아니라 **관리자가 운세 상품을 계속 추가할 수 있는 플랫폼**으로 만드는 것이다.

---

# 1. MVP 목표

1차 버전에서는 아래 기능까지만 완성한다.

### 고객 기능

- 랜딩페이지
- 사주정보 입력
- 무료 사주 결과
- 상품 선택
- 토스페이먼츠 결제
- AI 상세 사주 생성
- 결과 웹페이지
- PDF 다운로드
- 주문번호 기반 결과 재조회

### 관리자 기능

- 상품 등록/수정
- 상품별 AI 프롬프트 관리
- 가격 설정
- 무료 공개 비율 설정
- 주문 조회
- 고객 조회
- 생성 결과 조회
- AI 재생성
- 매출/전환율 대시보드
- 상품 ON/OFF

---

# 2. 전체 사용자 흐름

```text
Instagram / YouTube / Naver / Blog
            ↓
       랜딩페이지
            ↓
      무료 사주 보기
            ↓
      사주정보 입력
            ↓
       기본 사주 계산
            ↓
       AI 무료 분석
            ↓
       무료 결과 공개
            ↓
      상세 상품 추천
            ↓
          결제
            ↓
     Toss 결제 승인
            ↓
     AI 상세 결과 생성
            ↓
     웹 결과 페이지 저장
            ↓
         PDF 생성
            ↓
   결과보기 / 다운로드
            ↓
      추가상품 추천
```

---

# 3. URL 구조

```text
/
└─ 메인 랜딩

/fortune
└─ 사주정보 입력

/fortune/loading
└─ 분석 중

/result/[resultId]
└─ 무료 결과

/products
└─ 전체 상품

/product/[slug]
└─ 상품 상세

/checkout/[productId]
└─ 결제

/payment/success
/payment/fail

/report/[orderId]
└─ 결제 완료 상세 결과

/my-results
└─ 결과 다시 찾기


/admin
├─ dashboard
├─ products
├─ products/new
├─ products/[id]
├─ orders
├─ customers
├─ reports
├─ prompts
├─ analytics
└─ settings
```

---

# 4. 랜딩페이지 UX

## SECTION 01 — HERO

```text
요즘 왜 이렇게
마음대로 안 풀릴까?

내 사주에는
이미 흐름이 있습니다.

생년월일로 확인하는
나의 운과 타이밍

[무료로 확인하기]

회원가입 없이 시작
약 1분 소요
```

CTA는 모바일 화면 하단에도 고정한다.

```text
[ 무료 사주 보기 ]
```

---

# 5. 공감 SECTION

```text
혹시 이런 고민을 하고 있나요?

돈은 버는데 왜 남지 않을까?

지금 이직해도 괜찮을까?

올해 새로운 사람을 만날 수 있을까?

언제쯤 일이 풀리기 시작할까?

내 인생에서 좋은 시기는 언제일까?
```

---

# 6. 분석 항목 소개

```text
한 번의 입력으로 분석합니다.

타고난 성향
재물운
직업운
연애운
대인관계
올해의 흐름
주의해야 할 시기
기회가 오는 시기
```

---

# 7. 결과 미리보기 SECTION

카드 UI.

```text
2026년 나의 흐름

전체운
★★★★☆

직업운
★★★★★

재물운
★★★★☆

연애운
★★★☆☆


올해의 핵심 키워드

"변화 · 선택 · 확장"


당신에게 중요한 변화가
다가오고 있습니다.

[내 사주 무료로 확인하기]
```

---

# 8. 사주 입력 화면

입력 항목:

```text
닉네임

성별
○ 남성
○ 여성

생년월일
YYYY / MM / DD

○ 양력
○ 음력

태어난 시간

○ 시간 알고 있음
○ 시간 모름

출생시간
00:00

출생지역
서울 / 경기 / 부산...

[결과 확인하기]
```

### 중요

출생시간을 모르는 사람도 이탈하지 않게 한다.

```text
태어난 시간을 몰라도
기본 분석은 가능합니다.
```

---

# 9. 입력 검증

### 생년월일

- 미래 날짜 금지
- 잘못된 날짜 금지
- 최소/최대 연도 제한
- 윤년 처리

### 출생시간

- 00:00 ~ 23:59
- 시간 모름 선택 시 NULL 허용

### 입력값

클라이언트 검증만 하지 않는다.

```text
Browser validation
       +
Server validation
```

둘 다 적용한다.

---

# 10. 분석 중 화면

바로 결과가 나타나는 것보다 짧은 분석 연출을 넣는다.

```text
사주를 분석하고 있어요.

✓ 생년월일 확인

✓ 타고난 기운 분석

✓ 올해 흐름 분석

● 중요한 시기 찾는 중...
```

실제 API 상태와 UI 애니메이션을 분리한다.

API가 빨리 끝나도 최소한 자연스러운 전환을 제공하되 불필요하게 사용자를 오래 기다리게 하지 않는다.

---

# 11. 무료 결과 페이지

무료 결과가 너무 빈약하면 결제가 안 된다.

반대로 너무 많이 보여줘도 결제가 안 된다.

권장:

**전체 콘텐츠의 약 25~35% 무료 제공**

예:

```text
수지님의 사주

당신은 겉으로 보기보다
내면의 기준이 강한 사람입니다.

────────────

타고난 성향

★★★★☆

[상세 풀이]

────────────

2026 전체운

★★★★☆

올해는 기존 방식에서 벗어나
새로운 선택을 하게 될 가능성이
높은 시기입니다.

────────────

재물운

★★★★☆

돈의 흐름 자체는 나쁘지 않습니다.

다만...

🔒 자세한 재물운

────────────

직장운

★★★★★

🔒 이직하기 좋은 시기

🔒 피해야 할 시기

🔒 금전운이 올라가는 달

🔒 인간관계 주의 시기
```

그리고 CTA.

```text
지금 내게 중요한 시기까지
확인해보세요.

2026년 종합운세

12,900원

[전체 사주 보기]
```

---

# 12. 상품 구조

관리자가 상품을 직접 추가할 수 있어야 한다.

예시 상품:

```text
2026 종합운세
12,900원

재물운 집중 분석
6,900원

직장·이직운
6,900원

연애운
6,900원

커플 궁합
9,900원

자녀 사주
9,900원

평생 종합사주
19,900원
```

상품은 코드 수정 없이 관리자에서 생성한다.

---

# 13. 관리자 상품 생성

```text
상품명
[2026년 재물운]

Slug
[2026-money]

정가
[9900]

판매가
[6900]

설명
[2026년 돈의 흐름과...]

상품 이미지
[UPLOAD]

무료 공개 %
[30]

사용 프롬프트
[fortune-money-v3]

결과 템플릿
[standard-report]

판매 상태
ON

[저장]
```

---

# 14. 가장 중요한 설계

## 사주 계산과 AI 해석을 분리한다.

AI에게

```text
1993년 1월 26일인데
사주 좀 봐줘.
```

만 보내면 안 된다.

구조는 다음과 같이 만든다.

```text
사용자 생년월일
      ↓
사주 계산 ENGINE
      ↓
구조화된 사주 데이터
      ↓
AI 해석
      ↓
사용자 친화적 콘텐츠
```

즉,

**계산 = deterministic**

**설명 = AI**

로 분리한다.

---

# 15. 사주 데이터 구조 예시

```json
{
  "profile": {
    "gender": "female",
    "calendarType": "solar",
    "birthDate": "1993-01-26",
    "birthTime": "19:31",
    "birthPlace": "KR"
  },

  "pillars": {
    "year": {},
    "month": {},
    "day": {},
    "hour": {}
  },

  "elements": {
    "wood": 0,
    "fire": 0,
    "earth": 0,
    "metal": 0,
    "water": 0
  },

  "analysis": {
    "dayMaster": "",
    "strength": "",
    "usefulElements": [],
    "unfavorableElements": []
  },

  "cycles": []
}
```

---

# 16. OpenAI 역할

OpenAI가 맡는 부분은

```text
사주 계산 X

사주 데이터 설명 O

문체 변환 O

사용자 맞춤 요약 O

상품별 상세 분석 O

PDF 콘텐츠 생성 O
```

---

# 17. AI 출력 방식

AI가 자유로운 텍스트를 반환하게 하지 않는다.

항상 구조화된 JSON을 반환한다.

예:

```json
{
  "headline": "변화를 준비해야 하는 해",
  "summary": "...",

  "scores": {
    "overall": 4,
    "money": 4,
    "career": 5,
    "love": 3
  },

  "sections": [
    {
      "key": "personality",
      "title": "타고난 성향",
      "summary": "...",
      "detail": "..."
    },
    {
      "key": "money",
      "title": "재물운",
      "summary": "...",
      "detail": "..."
    }
  ],

  "keywords": [
    "변화",
    "선택",
    "확장"
  ]
}
```

이렇게 해야 웹 화면과 PDF 디자인이 AI 문장 길이에 따라 무너지지 않는다.

---

# 18. AI System Prompt

관리자에서 버전 관리한다.

## SYSTEM

```text
당신은 동양 명리 데이터를 일반 사용자가 이해하기 쉽게
설명하는 콘텐츠 작성 AI입니다.

입력받은 구조화된 명리 데이터를 근거로만 해석하십시오.

절대로 특정 미래 사건이 확정적으로 발생한다고 표현하지 마십시오.

"반드시"
"무조건"
"100%"
"확실히"

같은 확정적인 표현을 피하십시오.

대신

"가능성이 있습니다"
"이러한 흐름으로 해석할 수 있습니다"
"이 시기에는 이런 선택을 고려할 수 있습니다"

같은 표현을 사용하십시오.

공포를 이용하여 구매를 유도하지 마십시오.

질병, 사고, 죽음, 투자 성공 등을 단정하지 마십시오.

전체 문장은 쉬운 한국어로 작성하십시오.

전문 명리 용어를 사용할 경우 반드시 일반적인 설명을 함께 제공하십시오.

같은 내용을 반복하지 마십시오.

사용자가 읽었을 때
"내 이야기 같다"고 느낄 정도로 구체적이되
근거 없이 사실을 만들어내지 마십시오.

반드시 제공된 JSON Schema 형식으로 출력하십시오.
```

---

# 19. 상품 Prompt 예시 — 재물운

```text
다음 명리 데이터를 기반으로
사용자의 재물 흐름을 설명하십시오.

분석 항목:

1. 기본적인 돈에 대한 성향
2. 돈이 들어오는 방식
3. 돈이 새기 쉬운 패턴
4. 직업 소득과 사업 소득 성향
5. 올해 재물운 흐름
6. 상반기/하반기 차이
7. 주의가 필요한 시기
8. 기회를 활용하기 좋은 시기
9. 현실적인 행동 가이드

사용자가 투자나 재정적 판단을
운세만을 근거로 결정하도록 유도하지 마십시오.

과도한 확정 표현을 사용하지 마십시오.
```

---

# 20. DB 설계

## profiles

```text
id
user_id
nickname
gender
birth_date
birth_time
birth_time_unknown
calendar_type
birth_place
created_at
updated_at
```

---

## fortune_charts

```text
id
profile_id
chart_version
raw_chart_json
created_at
```

---

## products

```text
id
name
slug
short_description
description
regular_price
sale_price
thumbnail_url
product_type
prompt_id
template_id
free_ratio
status
sort_order
created_at
updated_at
```

---

## prompts

```text
id
name
version
system_prompt
user_prompt_template
output_schema
status
created_at
updated_at
```

---

## free_results

```text
id
profile_id
chart_id
prompt_id
result_json
model
prompt_version
created_at
```

---

## orders

```text
id
order_no
user_id
profile_id
product_id
amount
status

payment_key
payment_method
paid_at
cancelled_at

created_at
updated_at
```

status:

```text
PENDING
PAID
GENERATING
COMPLETED
FAILED
CANCELLED
REFUNDED
```

---

## reports

```text
id
order_id
profile_id
product_id

prompt_id
prompt_version
model

result_json

html_url
pdf_url

generation_status

created_at
updated_at
```

---

## analytics_events

```text
id
session_id
user_id

event_name

product_id
order_id

utm_source
utm_medium
utm_campaign
utm_content
utm_term

referrer

created_at
```

---

# 21. 반드시 UTM을 저장한다

이 사이트는 광고사업을 고려하면 이게 굉장히 중요하다.

광고 URL:

```text
?utm_source=instagram
&utm_medium=paid
&utm_campaign=2026_money
&utm_content=video_03
```

첫 방문 때 저장한다.

그래야 관리자에서

```text
광고 A

방문
1,305

무료사주
623

결제
51

전환율
3.9%

매출
657,900원
```

같은 데이터를 볼 수 있다.

---

# 22. Analytics Event

최소 다음 이벤트를 기록한다.

```text
landing_view

fortune_start

fortune_form_complete

free_result_view

product_view

checkout_start

payment_success

payment_fail

report_generated

report_view

pdf_download
```

---

# 23. 관리자 대시보드

첫 화면:

```text
오늘

방문자
1,203

무료 사주
482

결제
37

매출
477,300원

구매전환율
3.07%
```

그리고 Funnel.

```text
방문
████████████ 1,203

사주입력
████████ 674

무료결과
███████ 603

결제화면
██ 91

구매
█ 37
```

---

# 24. 상품별 성과

```text
상품                  구매      매출

2026 종합운세          21      270,900

재물운                 8       55,200

직장운                 5       34,500

연애운                 3       20,700
```

---

# 25. Prompt 관리

관리자가 프롬프트를 수정할 수 있게 한다.

```text
재물운 분석

Version
3

MODEL
[환경변수/설정값]

SYSTEM PROMPT
[...]

USER PROMPT
[...]

OUTPUT SCHEMA
[...]

[테스트]

[저장]

[새 버전 배포]
```

기존 결과와 새로운 결과를 구분할 수 있도록 반드시

```text
prompt_id
prompt_version
model
```

을 결과에 저장한다.

---

# 26. 결제 구조

```text
상품 선택
   ↓

주문 생성
PENDING
   ↓

Toss Payment Widget
   ↓

사용자 결제
   ↓

successUrl
   ↓

SERVER에서 결제 승인 API
   ↓

결제 금액 검증
   ↓

PAID
   ↓

AI 결과 생성
```

### 매우 중요

브라우저가

```text
결제했습니다.
```

라고 보내는 값을 믿으면 안 된다.

서버에서

```text
orderId
paymentKey
amount
```

를 검증한 후 결제 승인한다.

---

# 27. 결제 후 AI 생성

결제 승인 후:

```text
orders.status = PAID
```

↓

```text
report 생성 시작
```

↓

```text
GENERATING
```

↓

OpenAI

↓

Schema Validation

↓

DB 저장

↓

PDF 생성

↓

```text
COMPLETED
```

---

# 28. 실패 처리

AI 생성 도중 오류가 발생해도 결제 정보가 없어지면 안 된다.

```text
PAYMENT = SUCCESS
AI = FAILED
```

상태를 분리한다.

관리자에는

```text
주문번호
20260820-00031

결제
✓ 완료

AI 생성
⚠ 실패

[다시 생성]
```

버튼을 제공한다.

---

# 29. 중복 생성 방지

`order_id` 기준 idempotency를 적용한다.

같은 결제에 사용자가 새로고침을 10번 하더라도

AI API가 10번 호출되면 안 된다.

```text
if report exists:
    return existing report
```

---

# 30. PDF

PDF 자체를 AI가 만드는 구조로 만들지 않는다.

```text
AI
↓
Structured JSON
↓
React Report Template
↓
HTML
↓
PDF
```

이렇게 한다.

웹 결과와 PDF가 같은 데이터를 사용한다.

---

# 31. PDF 구성

```text
COVER

2026년
나의 운세 리포트

수지님


01
나의 기본 성향

02
2026년 전체운

03
재물운

04
직업운

05
연애운

06
월별 흐름

07
주의할 시기

08
기회를 잡을 시기

09
나를 위한 행동 가이드
```

---

# 32. 로그인 정책

MVP에서는 회원가입을 강제하지 않는 편이 좋다.

구매 진입장벽을 낮춘다.

결과 확인 방식:

```text
주문번호
+
휴대폰 또는 이메일
```

추후 카카오 로그인 등을 붙인다.

---

# 33. 개인정보

최소 수집만 한다.

사주 분석에 불필요하다면 주민등록번호는 절대 받지 않는다.

필요 데이터:

```text
닉네임
성별
생년월일
출생시간
출생지역
이메일 또는 휴대폰
```

서비스에는 최소한 다음 페이지를 둔다.

```text
/terms
/privacy
/refund
```

결제·마케팅 정보 수신 등 필요한 동의는 서로 분리하여 운영한다.

---

# 34. 안전 문구

결과 하단:

```text
본 서비스의 운세 및 사주 콘텐츠는
참고 및 엔터테인먼트 목적으로 제공됩니다.

의료, 법률, 투자 등 전문적인 판단을
대체하지 않습니다.
```

---

# 35. 기술 스택

```text
Frontend
Next.js
TypeScript
Tailwind CSS

UI
shadcn/ui

Backend
Next.js Route Handlers
+
Supabase

Database
PostgreSQL / Supabase

Auth
Supabase Auth

Storage
Supabase Storage

AI
OpenAI Responses API

Validation
Zod

Payment
Toss Payments

PDF
HTML → PDF

Deploy
Vercel
```

---

# 36. 보안 구조

절대 클라이언트에 노출하면 안 되는 값:

```text
OPENAI_API_KEY

TOSS_SECRET_KEY

SUPABASE_SECRET_KEY
```

브라우저에서 직접 OpenAI API를 호출하지 않는다.

구조:

```text
Browser
  ↓
Server API
  ↓
OpenAI
```

---

# 37. RLS

고객은 자신의 데이터만 조회할 수 있어야 한다.

Supabase에는 Row Level Security를 적용한다.

관리자 권한:

```text
user
admin
```

역할을 분리한다.

`service role/secret key` 계열 키는 절대 브라우저에 전달하지 않는다.

---

# 38. 프로젝트 폴더 구조

```text
src/

app/

  (public)/
    page.tsx

    fortune/
      page.tsx

    result/
      [id]/
        page.tsx

    product/
      [slug]/
        page.tsx

    checkout/
      [id]/
        page.tsx

    report/
      [id]/
        page.tsx

  admin/
    dashboard/
    products/
    orders/
    reports/
    prompts/

  api/

    fortune/
      calculate/
      free-result/

    payments/
      confirm/

    reports/
      generate/

    admin/

components/

  landing/
  fortune/
  report/
  checkout/
  admin/

lib/

  supabase/
  openai/
  toss/
  fortune/
  analytics/
  validation/

types/

schemas/
```

---

# 39. API 설계

```text
POST
/api/fortune/calculate

POST
/api/fortune/free-result

GET
/api/products

GET
/api/products/[id]

POST
/api/orders

POST
/api/payments/confirm

POST
/api/reports/generate

GET
/api/reports/[id]
```

관리자:

```text
GET/POST
/api/admin/products

PATCH/DELETE
/api/admin/products/[id]

GET
/api/admin/orders

POST
/api/admin/reports/[id]/regenerate

GET/POST
/api/admin/prompts
```

---

# 40. 개발 PHASE

## PHASE 1

UI Shell

```text
랜딩페이지
사주 입력
무료결과
상품상세
결제
결과페이지
관리자 Layout
```

Mock 데이터만 사용한다.

---

## PHASE 2

Supabase

```text
DB Schema
Migration
RLS
Storage
관리자 계정
```

---

## PHASE 3

사주 Engine

```text
입력
→
사주 데이터 계산
→
JSON 저장
```

이 단계에서는 AI를 붙이지 않는다.

계산 정확성을 먼저 테스트한다.

---

## PHASE 4

AI

```text
Structured Output
Prompt Version
Result 저장
Retry
Error Handling
```

---

## PHASE 5

무료 결과

```text
무료 결과 생성
부분 잠금
상품 연결
CTA
```

---

## PHASE 6

결제

```text
Order
Toss Widget
Payment Confirm
Payment validation
Duplicate protection
```

---

## PHASE 7

유료 Report

```text
AI 상세 분석
웹 Report
PDF
다운로드
```

---

## PHASE 8

관리자

```text
Product CRUD
Prompt CRUD
Order
Report
Regenerate
Dashboard
```

---

## PHASE 9

Analytics

```text
UTM
Event
Funnel
Conversion
Revenue
```

---

## PHASE 10

QA

다음 시나리오를 전부 테스트한다.

```text
무료 사용자

정상 결제

결제 실패

결제 후 새로고침

결제 후 AI 실패

AI 재생성

중복 결제 콜백

잘못된 orderId

잘못된 amount

PDF 실패

상품 판매중지

관리자 접근

일반 사용자 관리자 URL 접근

휴대폰 화면

PC 화면
```

---

# 41. MVP에서 빼야 할 기능

처음부터 넣지 않는다.

```text
커뮤니티

채팅 상담

라이브 상담

복잡한 회원 등급

포인트

쿠폰 시스템

친구 기능

앱 개발

푸시알림

다국어
```

먼저

**광고 → 무료 사주 → 결제**

이 Funnel이 실제로 돌아가는지를 확인한다.

---

# 42. 2차 확장

매출이 검증되면 추가한다.

```text
카카오 로그인

카카오 알림톡

결과 이메일

쿠폰

추천인

재구매 할인

오늘의 운세

월간 운세

궁합

자녀운

가족 사주

타로

이름풀이
```

---

# 43. 이 프로젝트에서 가장 중요한 운영 기능

상품 하나 만들 때 개발자가 코드를 건드리는 구조를 만들지 않는다.

관리자가

```text
상품명
가격
이미지
판매문구
Prompt
Output Schema
Result Template
```

만 선택하면

```text
상품 상세페이지
+
결제
+
AI 분석
+
결과 페이지
+
PDF
```

가 자동 연결되어야 한다.

이게 이 프로젝트의 핵심이다.

---

# 44. Cursor / Claude Code 개발 프롬프트

아래 내용을 프로젝트 루트의

```text
CLAUDE.md
```

또는

```text
PROJECT_SPEC.md
```

로 저장한다.

그리고 개발 AI에게 다음 지시를 준다.

## MASTER DEVELOPMENT PROMPT

당신은 이 프로젝트의 Lead Full-Stack Engineer입니다.

우리는 모바일 우선 AI 운세 자동판매 플랫폼을 개발합니다.

목표 사용자 흐름은 다음과 같습니다.

광고 → 랜딩 → 사주정보 입력 → 무료 결과 → 상품 선택 → Toss 결제 → AI 상세분석 → 웹 리포트 → PDF → 재구매

기술 스택:

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase PostgreSQL
- Supabase Auth
- Supabase Storage
- OpenAI Responses API
- Zod
- Toss Payments
- Vercel

다음 원칙을 반드시 준수하십시오.

### RULE 1

OpenAI API Key, Toss Secret Key, Supabase Secret Key를 클라이언트 코드에 포함하지 마십시오.

### RULE 2

금액과 결제 성공 여부를 클라이언트 값만으로 판단하지 마십시오.

서버에서 반드시 결제 승인 및 주문 금액을 검증하십시오.

### RULE 3

AI 출력은 자유 텍스트가 아니라 JSON Schema 기반 Structured Output을 사용하십시오.

### RULE 4

AI 결과 생성 전 사주 계산 데이터를 별도로 생성하고 저장하십시오.

사주 계산과 AI 자연어 해석을 분리하십시오.

### RULE 5

AI 호출마다 다음 정보를 저장하십시오.

- model
- prompt_id
- prompt_version
- generation timestamp

### RULE 6

결제 완료와 AI 결과 생성 상태를 분리하십시오.

AI 생성 실패가 결제 상태를 변경해서는 안 됩니다.

### RULE 7

order_id를 기준으로 동일 Report가 중복 생성되지 않도록 idempotency를 구현하십시오.

### RULE 8

Supabase 모든 고객 데이터 테이블에 적절한 RLS 정책을 적용하십시오.

### RULE 9

모바일 360px 화면을 우선으로 디자인하십시오.

### RULE 10

코드 수정 없이 Admin에서 새로운 운세 상품을 추가할 수 있는 구조로 설계하십시오.

---

# 45. AI 개발 작업 방식

한 번에 전체를 구현하지 말고 반드시 Phase 단위로 진행한다.

각 Phase 시작 전에:

```text
1. 현재 코드 분석
2. 이번 Phase 구현 범위
3. 수정 예정 파일
4. DB 영향
5. API 영향
6. 위험 요소
```

를 먼저 보고한다.

구현 완료 후:

```text
1. 변경 파일
2. 구현 내용
3. 테스트 결과
4. 미완료 사항
5. 다음 Phase
```

를 보고한다.

임의로 다음 Phase로 진행하지 않는다.

---

# 46. 첫 번째 개발 명령

프로젝트 최초 시작 시 Cursor/Claude Code에는 이것부터 입력한다.

## PHASE 1 START

현재 디렉터리에 AI 운세 자동판매 플랫폼의 프론트엔드 MVP를 구축하십시오.

아직 실제 Supabase, OpenAI, Toss API는 연결하지 마십시오.

모든 데이터는 Mock Data를 사용합니다.

다음 화면을 구현하십시오.

1. `/`
   랜딩페이지

2. `/fortune`
   사주 입력

3. `/fortune/loading`
   분석중

4. `/result/demo`
   무료 결과

5. `/product/2026-total`
   상품 상세

6. `/checkout/demo`
   결제 UI Mock

7. `/report/demo`
   유료 결과

8. `/admin/dashboard`
   관리자 Dashboard Mock

9. `/admin/products`
   상품 목록

10. `/admin/products/new`
    상품 생성

모바일 우선으로 구현하되 desktop에서도 자연스럽게 표시되도록 하십시오.

랜딩페이지는 전환 중심 Long-form Landing Page로 구현합니다.

메인 CTA는 화면 하단 Sticky CTA로 제공합니다.

무료 결과에서는 일부 내용을 제공한 뒤 Premium 영역을 잠금 처리합니다.

관리자 UI와 고객 UI는 명확히 분리합니다.

공통 컴포넌트를 적극 재사용하십시오.

완료 후:

- 생성한 페이지
- 생성한 컴포넌트
- 프로젝트 구조
- 테스트 결과

를 보고하십시오.

실제 API 연결은 하지 마십시오.

---

# 47. 최종 제품의 기준

이 서비스의 성공 기준은

"사주 결과가 멋있다"

가 아니다.

다음 Funnel을 측정할 수 있어야 한다.

```text
100명 광고 유입

↓ 몇 명이

사주 입력?

↓ 몇 명이

무료 결과 확인?

↓ 몇 명이

결제 화면 이동?

↓ 몇 명이

실제 결제?

↓ 몇 명이

추가상품 구매?
```

따라서 모든 개발 판단의 우선순위는

**전환율 측정 가능성 → 운영 자동화 → 결과 품질 → 디자인**

순으로 둔다.

---

# 48. 최종 개발 방향

우리가 만드는 것은

**“사주 페이지 한 개”가 아니다.**

관리자에서

`2026 신년운세`

를 만들고,

다음 날

`재물운`

을 만들고,

그다음 날

`직장운`

을 만들고,

나중에는

`궁합`

`자녀사주`

`타로`

까지 추가해도

개발 코드를 거의 수정하지 않는

**AI 운세 디지털 상품 판매 플랫폼**

을 만드는 것이 최종 목표다.