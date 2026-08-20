function LegalPage({
  title,
  body,
}: {
  title: string;
  body: string[];
}) {
  return (
    <div className="mx-auto w-full max-w-lg px-5 pb-16 pt-2">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
        {title}
      </h1>
      <div className="mt-8 space-y-4 text-sm leading-relaxed text-[var(--ink-muted)]">
        {body.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
    </div>
  );
}

export default function TermsPage() {
  return (
    <LegalPage
      title="이용약관"
      body={[
        "본 약관은 운의결 서비스 이용과 관련된 기본 조건을 정합니다.",
        "서비스는 참고 및 엔터테인먼트 목적의 운세 콘텐츠를 제공하며, 전문적 판단을 대체하지 않습니다.",
        "디지털 콘텐츠 특성상 제공 완료 후 청약철회가 제한될 수 있으며, 자세한 내용은 환불정책을 따릅니다.",
      ]}
    />
  );
}
