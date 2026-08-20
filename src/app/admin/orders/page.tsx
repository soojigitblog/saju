export const metadata = { title: "주문" };

export default function AdminOrdersPage() {
  return (
    <Placeholder
      title="주문"
      description="주문 조회 UI는 PHASE 8에서 완성합니다. 현재는 Mock 자리입니다."
    />
  );
}

function Placeholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
        {title}
      </h1>
      <p className="mt-3 text-sm text-[var(--ink-muted)]">{description}</p>
    </div>
  );
}
