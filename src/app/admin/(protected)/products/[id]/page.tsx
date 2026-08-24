import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getProductById } from "@/lib/repositories/products";
import { formatKRW } from "@/lib/utils";

export const metadata = {
  title: "상품 상세",
};

export default async function AdminProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
            {product.name}
          </h1>
          <p className="mt-1 text-sm text-[var(--ink-faint)]">/{product.slug}</p>
        </div>
        <Badge>{product.status}</Badge>
      </div>
      <dl className="space-y-3 rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5 text-sm">
        <Row label="판매가" value={formatKRW(product.salePrice)} />
        <Row label="정가" value={formatKRW(product.regularPrice)} />
        <Row label="무료 공개" value={`${product.freeRatio}%`} />
        <Row label="프롬프트" value={product.promptName} />
        <Row label="템플릿" value={product.templateId} />
        <Row label="설명" value={product.description} />
      </dl>
      <Button asChild variant="outline">
        <Link href="/admin/products">목록으로</Link>
      </Button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-b border-[var(--line)] pb-3 last:border-0 last:pb-0 sm:grid-cols-[140px_1fr]">
      <dt className="text-[var(--ink-faint)]">{label}</dt>
      <dd className="text-[var(--ink)]">{value}</dd>
    </div>
  );
}
