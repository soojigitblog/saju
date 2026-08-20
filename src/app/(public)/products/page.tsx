import Link from "next/link";
import { formatKRW } from "@/lib/utils";
import { listActiveProducts } from "@/lib/repositories/products";

export const metadata = {
  title: "운세 리포트",
};

export default async function ProductsPage() {
  const products = await listActiveProducts();

  return (
    <div className="mx-auto w-full max-w-lg px-5 pb-16 pt-4">
      <p className="hanja-accent mb-2">REPORT</p>
      <h1 className="display-title text-3xl">운세 리포트</h1>
      <p className="mt-3 text-sm leading-relaxed text-[var(--ink-muted)]">
        필요한 분석을 선택해 깊이 있는 리포트를 확인하세요.
      </p>
      <div className="mt-8 space-y-4">
        {products.map((product, i) => (
          <Link
            key={product.id}
            href={`/product/${product.slug}`}
            className="mystic-card mystic-card-hover block p-5"
          >
            {i === 0 ? (
              <span className="mb-2 inline-block rounded-sm border border-[var(--gold)] px-2 py-0.5 text-[10px] text-[var(--gold)]">
                대표 리포트
              </span>
            ) : null}
            <p className="display-title text-lg">{product.name}</p>
            <p className="mt-2 text-sm text-[var(--ink-muted)]">
              {product.shortDescription}
            </p>
            <p className="mt-3 text-lg font-semibold text-[var(--gold-soft)]">
              {formatKRW(product.salePrice)}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
