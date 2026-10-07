"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MysticPage } from "@/components/mystic/celestial-background";
import { OrnamentCard, MysticPanel } from "@/components/mystic/ornament-card";
import { formatKRW } from "@/lib/utils";

export type PgReviewProduct = {
  name: string;
  salePrice: number;
  description: string;
};

const CONSENTS = [
  "이용약관",
  "개인정보 관련 내용 확인",
  "환불/취소 정책 확인",
  "상품명 및 결제금액 확인",
] as const;

export function PgReviewCheckoutClient({ product }: { product: PgReviewProduct }) {
  const [agreed, setAgreed] = useState<Record<(typeof CONSENTS)[number], boolean>>(
    () => Object.fromEntries(CONSENTS.map((consent) => [consent, false])) as Record<(typeof CONSENTS)[number], boolean>
  );
  const [notice, setNotice] = useState("");
  const allAgreed = CONSENTS.every((consent) => agreed[consent]);

  return (
    <MysticPage>
      <div className="mx-auto w-full max-w-lg px-5 pb-28 pt-8">
        <p className="hanja-accent mb-2">運의結 · PG REVIEW</p>
        <h1 className="display-title text-3xl">결제 전 확인</h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
          PG 심사용 화면입니다. 주문 생성과 결제 승인 요청은 실행되지 않습니다.
        </p>

        <OrnamentCard density="corners" className="mt-8 p-5">
          <p className="text-sm text-[var(--text-muted)]">주문 상품</p>
          <p className="display-title mt-2 text-xl">{product.name}</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--gold-light)]">
            {formatKRW(product.salePrice)}
          </p>
          <p className="mt-4 text-sm leading-relaxed text-[var(--text-secondary)]">
            {product.description}
          </p>
        </OrnamentCard>

        <MysticPanel className="mt-6">
          <p className="text-xs text-[var(--gold-primary)]">디지털 콘텐츠 안내</p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
            개인 맞춤형 디지털 콘텐츠이며 배송 상품이 아닙니다. 결제 확인 후 입력한 사주 정보를 바탕으로 리포트가 생성되고, 「내 결과」에서 다시 열람할 수 있습니다.
          </p>
          <p className="mt-3 text-sm text-[var(--text-secondary)]">
            환불·취소 기준은 <Link className="underline underline-offset-2" href="/refund-policy">환불정책</Link>에서 확인할 수 있습니다.
          </p>
        </MysticPanel>

        <div className="mt-6 space-y-3 text-sm text-[var(--text-secondary)]">
          {CONSENTS.map((consent) => (
            <label className="flex items-start gap-3" key={consent}>
              <input
                className="mt-1"
                type="checkbox"
                checked={agreed[consent]}
                onChange={(event) => setAgreed((current) => ({ ...current, [consent]: event.target.checked }))}
              />
              <span>[필수] {consent}</span>
            </label>
          ))}
        </div>

        {notice ? <p role="status" className="mt-4 border border-[var(--border-gold)]/40 bg-[var(--bg-card)] px-4 py-3 text-sm text-[var(--text-secondary)]">{notice}</p> : null}

        <div className="fixed inset-x-0 bottom-[3.25rem] z-40 border-t border-[var(--border-subtle)] bg-[color-mix(in_oklab,var(--bg-primary)_92%,transparent)] px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md md:bottom-0">
          <div className="mx-auto max-w-lg">
            <Button size="full" disabled={!allAgreed} onClick={() => setNotice("PG 심사/연동 준비 중입니다. 이 화면에서는 실제 결제 승인 요청을 실행하지 않습니다.")}> 
              {allAgreed ? "결제 실행 전 확인" : "필수 동의 후 다음 단계"}
            </Button>
          </div>
        </div>
      </div>
    </MysticPage>
  );
}
