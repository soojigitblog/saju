"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatKRW } from "@/lib/utils";
import type { Product } from "@/types";

export function CheckoutForm({ product }: { product: Product }) {
  const router = useRouter();
  const [contact, setContact] = useState("");
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onPay() {
    if (!contact.trim()) {
      setError("결과 재조회용 휴대폰 또는 이메일을 입력해 주세요.");
      return;
    }
    if (!agree) {
      setError("결제 및 개인정보 동의가 필요합니다.");
      return;
    }
    setError("");
    setLoading(true);
    await new Promise((r) => setTimeout(r, 900));
    router.push("/report/demo");
  }

  return (
    <div className="mx-auto w-full max-w-lg px-5 pb-16 pt-4">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
        결제
      </h1>
      <p className="mt-2 text-sm text-[var(--ink-muted)]">
        Toss Payments Widget Mock — 실제 결제 연동은 PHASE 6
      </p>

      <div className="mt-8 rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5">
        <p className="text-sm text-[var(--ink-faint)]">선택 상품</p>
        <p className="mt-2 text-lg font-semibold text-[var(--ink)]">{product.name}</p>
        <p className="mt-1 text-2xl font-semibold text-[var(--ink)]">
          {formatKRW(product.salePrice)}
        </p>
      </div>

      <div className="mt-8 space-y-2">
        <Label htmlFor="contact">휴대폰 또는 이메일</Label>
        <Input
          id="contact"
          placeholder="결과 다시 찾기용"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
        />
      </div>

      <div className="mt-6 rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface)] p-5">
        <p className="text-sm font-medium text-[var(--ink)]">Toss 결제 위젯 영역</p>
        <p className="mt-2 text-xs text-[var(--ink-faint)]">
          카드 / 간편결제 UI Mock
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {["카드", "계좌", "간편"].map((method) => (
            <div
              key={method}
              className="rounded-xl bg-[var(--paper)] py-4 text-center text-sm text-[var(--ink-muted)]"
            >
              {method}
            </div>
          ))}
        </div>
      </div>

      <label className="mt-6 flex items-start gap-3 text-sm text-[var(--ink-muted)]">
        <input
          type="checkbox"
          className="mt-1"
          checked={agree}
          onChange={(e) => setAgree(e.target.checked)}
        />
        <span>
          <Link href="/terms" className="underline">
            이용약관
          </Link>
          ,{" "}
          <Link href="/privacy" className="underline">
            개인정보처리방침
          </Link>
          ,{" "}
          <Link href="/refund" className="underline">
            환불정책
          </Link>
          에 동의합니다. (마케팅 수신은 별도)
        </span>
      </label>

      {error ? (
        <p className="mt-4 rounded-xl bg-[#f8e8e4] px-4 py-3 text-sm text-[#8a3b2d]">
          {error}
        </p>
      ) : null}

      <Button
        size="full"
        className="mt-6"
        onClick={onPay}
        disabled={loading}
      >
        {loading ? "결제 처리 중..." : `${formatKRW(product.salePrice)} 결제하기`}
      </Button>
    </div>
  );
}
