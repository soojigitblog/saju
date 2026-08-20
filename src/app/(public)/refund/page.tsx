export const metadata = { title: "환불정책" };

export default function RefundPage() {
  return (
    <div className="mx-auto w-full max-w-lg px-5 pb-16 pt-2">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
        환불정책
      </h1>
      <div className="mt-8 space-y-4 text-sm leading-relaxed text-[var(--ink-muted)]">
        <p>디지털 콘텐츠가 제공된 이후에는 원칙적으로 환불이 제한될 수 있습니다.</p>
        <p>결제 오류, 중복 결제, 콘텐츠 미제공 등 서비스 귀책 사유가 있는 경우 환불을 지원합니다.</p>
        <p>자세한 환불 절차는 고객센터 문의로 안내됩니다. (MVP Mock)</p>
      </div>
    </div>
  );
}
