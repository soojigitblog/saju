"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatKRW } from "@/lib/utils";
import { trackClientEvent } from "@/lib/analytics/client";
import type { Product } from "@/types";
import { MysticPage } from "@/components/mystic/celestial-background";
import { OrnamentCard, MysticPanel } from "@/components/mystic/ornament-card";

export function ProductDetail({
  product,
  linkedFreeResultId,
}: {
  product: Product;
  linkedFreeResultId?: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [depositorName, setDepositorName] = useState("");

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

  async function onPurchase() {
    setError("");
    if (!linkedFreeResultId) {
      setError(
        "무료 사주 결과가 연결되지 않았습니다. 사주 결과에서 상품을 선택해 주세요."
      );
      return;
    }
    if (depositorName.trim().length < 2) {
      setError("실제 입금하실 분의 입금자명을 입력해 주세요.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          sourceResultId: linkedFreeResultId,
          depositorName: depositorName.trim(),
          paymentMethod: "BANK_TRANSFER",
        }),
      });
      const data = (await res.json()) as {
        code?: string;
        message?: string;
        waitUrl?: string;
      };
      if (!res.ok || !data.waitUrl) {
        setError(data.message ?? "주문을 생성하지 못했습니다.");
        setLoading(false);
        return;
      }
      router.push(data.waitUrl);
    } catch {
      setError("주문을 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      setLoading(false);
    }
  }

  return (
    <MysticPage>
      <div className="mx-auto w-full max-w-lg px-5 pb-28 pt-8">
        <OrnamentCard className="overflow-hidden p-8">
          <p className="hanja-accent mb-3">命書 · DIGITAL REPORT</p>
          <h1 className="display-title text-3xl leading-snug">{product.name}</h1>
          <p className="mt-4 text-sm leading-relaxed text-[var(--text-secondary)]">
            {product.shortDescription}
          </p>
        </OrnamentCard>

        <div className="mt-8 space-y-4">
          <div className="flex items-end gap-3">
            <p className="text-3xl font-semibold text-[var(--gold-light)]">
              {formatKRW(product.salePrice)}
            </p>
            <p className="pb-1 text-sm text-[var(--text-muted)] line-through">
              {formatKRW(product.regularPrice)}
            </p>
          </div>
          <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
            {product.description}
          </p>
        </div>

        <MysticPanel className="mt-8">
          <p className="text-xs text-[var(--gold-primary)]">결제 방법</p>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            ● 계좌이체 (하나은행)
          </p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            카드 결제(Toss)는 준비 중입니다.
          </p>
        </MysticPanel>

        {linkedFreeResultId ? (
          <div className="mt-6 space-y-2">
            <Label htmlFor="depositor">입금자명</Label>
            <Input
              id="depositor"
              placeholder="실제 입금하실 계좌의 입금자명"
              value={depositorName}
              onChange={(e) => setDepositorName(e.target.value)}
              maxLength={40}
            />
            <p className="text-xs text-[var(--text-muted)]">
              실제로 송금하실 때 표시되는 입금자명을 입력해 주세요.
            </p>
          </div>
        ) : (
          <p className="mt-6 border border-[var(--border-subtle)] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--text-secondary)]">
            구매하려면 무료 사주 결과에서 이 상품을 선택해 주세요.
          </p>
        )}

        {error ? (
          <p
            role="alert"
            className="mt-6 border border-[var(--error-text)]/30 bg-[var(--error-bg)] px-4 py-3 text-sm text-[var(--error-text)]"
          >
            {error}
          </p>
        ) : null}

        <div className="fixed inset-x-0 bottom-[3.25rem] z-40 border-t border-[var(--border-subtle)] bg-[color-mix(in_oklab,var(--bg-primary)_92%,transparent)] px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md md:bottom-0">
          <div className="mx-auto max-w-lg">
            <Button
              size="full"
              onClick={() => void onPurchase()}
              disabled={loading || !linkedFreeResultId}
            >
              {loading ? "주문 준비 중..." : "계좌이체로 구매하기"}
            </Button>
          </div>
        </div>
      </div>
    </MysticPage>
  );
}
