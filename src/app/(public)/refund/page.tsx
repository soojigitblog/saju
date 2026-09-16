export const metadata = { title: "환불정책" };

export default function RefundPage() {
  return (
    <div className="mx-auto w-full max-w-lg px-5 pb-16 pt-2">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
        환불정책
      </h1>
      <div className="mt-8 space-y-4 text-sm leading-relaxed text-[var(--ink-muted)]">
        <p>
          디지털 리포트는 결제 확인 후 순차적으로 제공됩니다. 리포트가
          고객에게 제공되기 전에는 전액 환불을 요청하실 수 있습니다.
        </p>
        <p>
          리포트 제공이 완료된 이후에는 디지털 콘텐츠 특성상 환불이 제한될 수
          있습니다.
        </p>
        <p>
          결제 오류, 중복 결제, 리포트 미제공 등 서비스 귀책 사유가 있는 경우
          환불을 지원합니다.
        </p>
        <p>
          환불 및 취소 문의: 결제 시 안내된 주문번호와 함께 고객센터
          (010-7799-2326, 문자 또는 전화)로 연락해 주세요.
        </p>
      </div>
    </div>
  );
}
