export const metadata = { title: "개인정보처리방침" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-lg px-5 pb-16 pt-2">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
        개인정보처리방침
      </h1>
      <div className="mt-8 space-y-4 text-sm leading-relaxed text-[var(--ink-muted)]">
        <p>수집 항목: 닉네임, 성별, 생년월일, 출생시간(선택), 출생지역, 이메일 또는 휴대폰.</p>
        <p>주민등록번호는 수집하지 않습니다.</p>
        <p>결제·마케팅 정보 활용 동의는 서로 분리하여 운영합니다.</p>
        <p>목적: 사주 분석, 결제, 결과 제공 및 재조회, 서비스 개선.</p>
      </div>
    </div>
  );
}
