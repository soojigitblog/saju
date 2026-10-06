export const metadata = { title: "환불정책" };

export default function RefundPage() {
  return (
    <div className="mx-auto w-full max-w-lg px-5 pb-16 pt-2">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
        환불정책
      </h1>
      <div className="mt-8 space-y-4 text-sm leading-relaxed text-[var(--ink-muted)]">
        <h2 className="font-semibold text-[var(--ink)]">개인 리포트 공급 전</h2><p>결제 후 개인 리포트 생성이 시작되기 전에는 주문번호와 함께 취소 또는 환불을 요청할 수 있습니다.</p>
        <h2 className="font-semibold text-[var(--ink)]">생성 시작 또는 제공 후</h2><p>개인 맞춤형 디지털 콘텐츠의 생성 또는 제공이 시작된 경우에는 실제 공급 개시 여부와 관련 법령을 고려해 처리합니다. 해석 내용에 대한 단순한 주관적 불만만으로 자동 환불을 약속하지는 않습니다.</p>
        <h2 className="font-semibold text-[var(--ink)]">생성 실패·시스템 오류·미제공</h2><p>리포트 생성 실패, 시스템 오류로 결과 제공이 불가능한 경우, PG 또는 회사 사유로 결제만 완료된 경우에는 재제공 또는 환불을 안내합니다.</p>
        <h2 className="font-semibold text-[var(--ink)]">중복 결제</h2><p>동일 주문의 중복 결제가 확인되면 원 결제수단 기준으로 환불 절차를 진행합니다.</p>
        <p>환불 및 취소 문의: 주문번호와 함께 사이트 하단 고객센터로 연락해 주세요. 실제 운영 전 환불 기준 문구는 법률 검토가 필요합니다.</p>
      </div>
    </div>
  );
}
