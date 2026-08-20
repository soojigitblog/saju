"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { MysticCard } from "@/components/ui/card";
import { formatKRW } from "@/lib/utils";
import { trackClientEvent } from "@/lib/analytics/client";
import type { Product } from "@/types";

export function ProductDetail({
  product,
  linkedFreeResultId,
}: {
  product: Product;
  linkedFreeResultId?: string | null;
}) {
  useEffect(() => {
    trackClientEvent({
      eventName: "product_view",
      path: `/product/${product.slug}`,
      productId: product.id,
      metadata: linkedFreeResultId
        ? { resultId: linkedFreeResultId }
        : undefined,
    });
  }, [product.id, product.slug, linkedFreeResultId]);

  const checkoutHref = linkedFreeResultId
    ? `/checkout/${product.id}?result=${linkedFreeResultId}`
    : `/checkout/${product.id}`;

  return (
    <div className="mx-auto w-full max-w-lg px-5 pb-28 pt-4">
      <MysticCard className="overflow-hidden p-0">
        <div className="border-b border-[var(--line)] bg-gradient-to-br from-[var(--surface-strong)] via-[var(--paper)] to-[var(--bg-elevated)] p-8">
          <p className="hanja-accent mb-3">命書 · DIGITAL REPORT</p>
          <h1 className="display-title text-3xl leading-snug">{product.name}</h1>
          <p className="mt-4 text-sm leading-relaxed text-[var(--ink-muted)]">
            {product.shortDescription}
          </p>
        </div>
      </MysticCard>

      <div className="mt-8 space-y-4">
        <div className="flex items-end gap-3">
          <p className="text-3xl font-semibold text-[var(--gold-soft)]">
            {formatKRW(product.salePrice)}
          </p>
          <p className="pb-1 text-sm text-[var(--ink-faint)] line-through">
            {formatKRW(product.regularPrice)}
          </p>
        </div>
        <p className="text-sm leading-relaxed text-[var(--ink-muted)]">
          {product.description}
        </p>
      </div>

      {linkedFreeResultId ? (
        <p className="mt-6 rounded-md border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--ink-muted)]">
          무료 결과와 연결된 상세 리포트입니다. 결제 시 서버에서 소유권을 다시
          확인합니다.
        </p>
      ) : null}

      <MysticCard className="mt-8 p-5">
        <p className="text-xs text-[var(--gold)]">리포트에 포함된 내용</p>
        <ul className="mt-4 space-y-2.5 text-sm text-[var(--ink-muted)]">
          <li className="flex gap-2">
            <span className="text-[var(--gold)]">·</span> AI 상세 분석 웹 리포트
          </li>
          <li className="flex gap-2">
            <span className="text-[var(--gold)]">·</span> PDF 다운로드 제공
          </li>
          <li className="flex gap-2">
            <span className="text-[var(--gold)]">·</span> 주문번호로 언제든 재조회
          </li>
          <li className="flex gap-2">
            <span className="text-[var(--gold)]">·</span> 무료 공개 비율 약 {product.freeRatio}%
          </li>
        </ul>
      </MysticCard>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-[color-mix(in_oklab,var(--bg-deep)_92%,transparent)] px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md">
        <div className="mx-auto max-w-lg">
          <Button asChild size="full">
            <Link href={checkoutHref}>결제하고 전체 보기</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
