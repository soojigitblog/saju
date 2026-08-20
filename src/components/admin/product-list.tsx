import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatKRW } from "@/lib/utils";
import type { Product } from "@/types";

export function ProductList({ products }: { products: Product[] }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
            상품
          </h1>
          <p className="mt-1 text-sm text-[var(--ink-faint)]">코드 수정 없이 상품 추가</p>
        </div>
        <Button asChild size="sm">
          <Link href="/admin/products/new">새 상품</Link>
        </Button>
      </div>

      <div className="space-y-3">
        {products.map((product) => (
          <Link
            key={product.id}
            href={`/admin/products/${product.id}`}
            className="block rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-4 transition-colors hover:bg-[var(--surface)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-[var(--ink)]">{product.name}</p>
                <p className="mt-1 text-sm text-[var(--ink-muted)]">/{product.slug}</p>
              </div>
              <Badge
                className={
                  product.status === "ACTIVE"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : ""
                }
              >
                {product.status}
              </Badge>
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-sm text-[var(--ink-muted)]">
              <span>{formatKRW(product.salePrice)}</span>
              <span>무료 {product.freeRatio}%</span>
              <span>{product.promptName}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
