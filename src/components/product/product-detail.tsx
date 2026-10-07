"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatKRW } from "@/lib/utils";
import { trackClientEvent } from "@/lib/analytics/client";
import { saveOrderAccessToken } from "@/lib/orders/client-access-token";
import type { Product } from "@/types";
import { MysticPage } from "@/components/mystic/celestial-background";
import { OrnamentCard, MysticPanel } from "@/components/mystic/ornament-card";

const REPORT_VALUE: Record<string, string[]> = {
  "2026-total": [
    "타고난 흐름에서 반복되는 판단과 선택의 패턴",
    "일·돈·관계가 서로 영향을 주는 지점",
    "강점과 그림자, 지금 더 살펴볼 질문",
    "다음 행동으로 옮길 수 있는 현실적인 가이드",
  ],
  "2026-money": [
    "돈을 벌고, 쓰고, 관리할 때 반복되는 습관",
    "기회와 불안 사이에서 흔들리는 판단의 원인",
    "내 성향에 맞는 돈 관리와 실행의 우선순위",
  ],
  "2026-career": [
    "능력이 가장 잘 살아나는 업무 방식과 환경",
    "일에서 지치거나 막히기 쉬운 반복 패턴",
    "다음 선택 전에 점검할 현실적인 기준",
  ],
  "2026-love": [
    "관계가 가까워질수록 드러나는 나의 반응 패턴",
    "끌림과 갈등이 반복되는 이유",
    "상대와의 거리를 건강하게 조율하는 실마리",
  ],
};

export function ProductDetail({
  product,
  linkedFreeResultId,
  linkedTarotReadingId,
  purchaseBlocked = false,
  purchaseBlockedMessage = null,
  checkoutMethod = "toss",
  tossTestMode = false,
  pgReviewCheckoutHref = null,
}: {
  product: Product;
  linkedFreeResultId?: string | null;
  linkedTarotReadingId?: string | null;
  purchaseBlocked?: boolean;
  purchaseBlockedMessage?: string | null;
  checkoutMethod?: "toss" | "bank";
  tossTestMode?: boolean;
  /** Server-gated review-only route. Never creates an order or payment. */
  pgReviewCheckoutHref?: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [depositorName, setDepositorName] = useState("");
  const isPaidTarot = product.productType === "tarot_paid";
  const useToss = checkoutMethod === "toss";
  const reportValue = REPORT_VALUE[product.slug] ?? [
    "입력한 사주 정보를 바탕으로 한 개인 리포트",
    "지금의 고민을 정리할 수 있는 해석과 질문",
    "다음 선택을 위한 실용적인 가이드",
  ];

  useEffect(() => {
    trackClientEvent({
      eventName: isPaidTarot ? "paid_tarot_view" : "product_view",
      path: `/product/${product.slug}`,
      productId: product.id,
      metadata: {
        ...(linkedFreeResultId ? { resultId: linkedFreeResultId } : {}),
        ...(linkedTarotReadingId
          ? { tarotReadingId: linkedTarotReadingId }
          : {}),
      },
    });
  }, [
    product.id,
    product.slug,
    linkedFreeResultId,
    linkedTarotReadingId,
    isPaidTarot,
  ]);

  async function onPurchase() {
    setError("");
    if (purchaseBlocked) {
      setError(
        purchaseBlockedMessage ??
          "현재 최종 점검 중입니다. 유료 리포트 판매는 잠시 후 오픈됩니다."
      );
      return;
    }
    if (!linkedFreeResultId) {
      setError(
        "무료 사주 결과가 연결되지 않았습니다. 사주 결과에서 상품을 선택해 주세요."
      );
      return;
    }
    if (!useToss && depositorName.trim().length < 2) {
      setError("실제 입금하실 분의 입금자명을 입력해 주세요.");
      return;
    }
    setLoading(true);
    try {
      trackClientEvent({
        eventName: isPaidTarot
          ? "paid_tarot_checkout_start"
          : "checkout_start",
        path: `/product/${product.slug}`,
        productId: product.id,
        metadata: { resultId: linkedFreeResultId },
      });
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          sourceResultId: linkedFreeResultId,
          paymentMethod: useToss ? "TOSS" : "BANK_TRANSFER",
          ...(!useToss ? { depositorName: depositorName.trim() } : {}),
          ...(linkedTarotReadingId
            ? { sourceTarotReadingId: linkedTarotReadingId }
            : {}),
        }),
      });
      const data = (await res.json()) as {
        code?: string;
        message?: string;
        waitUrl?: string;
        checkoutUrl?: string;
        orderId?: string;
        accessToken?: string | null;
      };
      const nextUrl = data.checkoutUrl ?? data.waitUrl;
      if (!res.ok || !nextUrl) {
        setError(data.message ?? "주문을 생성하지 못했습니다.");
        setLoading(false);
        return;
      }
      if (data.accessToken && data.orderId) {
        saveOrderAccessToken(data.orderId, data.accessToken);
      }
      router.push(nextUrl);
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
          <p className="border-l-2 border-[var(--gold-primary)] pl-3 text-sm leading-relaxed text-[var(--text-secondary)]">
            개인 맞춤형 디지털 콘텐츠입니다. 결제 확인 후 입력한 사주 정보를 바탕으로 리포트가 생성되며, 웹사이트 「내 결과」에서 다시 열람할 수 있습니다.
          </p>
        </div>

        <MysticPanel className="mt-8">
          <p className="text-xs text-[var(--gold-primary)]">이 리포트에서 받는 것</p>
          <ul className="mt-3 space-y-2">
            {reportValue.map((item) => (
              <li
                key={item}
                className="flex gap-2 text-sm leading-relaxed text-[var(--text-secondary)]"
              >
                <span aria-hidden className="mt-1 text-[var(--gold-primary)]">✦</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t border-[var(--border-subtle)] pt-3 text-xs leading-relaxed text-[var(--text-muted)]">
            상품 유형: 개인 맞춤형 디지털 콘텐츠 · 배송 상품이 아닙니다. 결제 확인 후 입력한 사주 정보를 바탕으로 리포트가 생성되며, 웹사이트 「내 결과」에서 다시 확인할 수 있습니다. 사주 명리 데이터를 바탕으로 한 참고용 콘텐츠이며 미래 결과를 보장하지 않습니다.
          </p>
        </MysticPanel>

        <MysticPanel className="mt-8">
          <p className="text-xs text-[var(--gold-primary)]">결제 방법</p>
          {useToss ? (
            <>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                ● 토스페이먼츠 카드/간편결제
              </p>
              {tossTestMode ? (
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  지금은 토스 테스트 결제입니다. 실제 매출 정산이 아닌 샌드박스
                  결제입니다.
                </p>
              ) : (
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  결제 완료 후 리포트가 생성됩니다.
                </p>
              )}
            </>
          ) : (
            <>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                ● 계좌이체 (하나은행)
              </p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                카드 결제(Toss)는 준비 중입니다.
              </p>
            </>
          )}
        </MysticPanel>

        <MysticPanel className="mt-4">
          <p className="text-xs text-[var(--gold-primary)]">결제 후 안내</p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
            결제 확인 후 「내 결과」에서 주문 상태를 확인할 수 있습니다. 리포트는
            준비가 완료되면 같은 화면에서 열람 및 PDF 다운로드가 가능합니다.
          </p>
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            환불·취소는{" "}
            <a href="/refund-policy" className="underline underline-offset-2">
              환불정책
            </a>
            을 참고해 주세요.
          </p>
        </MysticPanel>

        {purchaseBlocked ? (
          <p className="mt-6 border border-[var(--border-gold)]/40 bg-[var(--bg-card)]/80 px-4 py-3 text-sm text-[var(--text-secondary)]">
            {purchaseBlockedMessage ??
              "현재 최종 점검 중입니다. 유료 리포트 판매는 잠시 후 오픈됩니다."}
          </p>
        ) : linkedFreeResultId ? (
          useToss ? (
            <p className="mt-6 text-sm leading-relaxed text-[var(--text-secondary)]">
              아래 버튼으로 결제창을 엽니다. 하나은행 입금 확인은 사용하지 않습니다.
            </p>
          ) : (
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
          )
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
            {purchaseBlocked && pgReviewCheckoutHref ? (
              <Button size="full" asChild>
                <Link href={pgReviewCheckoutHref}>PG 심사용 결제 화면 보기</Link>
              </Button>
            ) : (
              <Button
                size="full"
                onClick={() => void onPurchase()}
                disabled={loading || purchaseBlocked || !linkedFreeResultId}
              >
                {purchaseBlocked
                  ? "판매 준비 중"
                : loading
                  ? "주문 준비 중..."
                  : useToss
                    ? "카드로 결제하기"
                    : "계좌이체로 구매하기"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </MysticPage>
  );
}
