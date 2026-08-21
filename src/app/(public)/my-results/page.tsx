"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MysticPage } from "@/components/mystic/celestial-background";
import { OrnamentCard, MysticPanel } from "@/components/mystic/ornament-card";

export default function MyResultsPage() {
  const [orderNo, setOrderNo] = useState("");
  const [contact, setContact] = useState("");
  const [found, setFound] = useState(false);

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    setFound(Boolean(orderNo.trim() && contact.trim()));
  }

  return (
    <MysticPage>
      <div className="mx-auto w-full max-w-lg px-5 pb-16 pt-8">
        <p className="hanja-accent mb-2">ARCHIVE</p>
        <h1 className="display-title text-3xl">결과 다시 찾기</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          주문번호와 휴대폰/이메일로 조회합니다. (Mock)
        </p>

        <OrnamentCard density="corners" className="mt-8 p-5 md:p-6">
          <form onSubmit={onSearch} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="orderNo">주문번호</Label>
              <Input
                id="orderNo"
                placeholder="20260820-00031"
                value={orderNo}
                onChange={(e) => setOrderNo(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact">휴대폰 또는 이메일</Label>
              <Input
                id="contact"
                placeholder="결제 시 입력한 연락처"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
              />
            </div>
            <Button type="submit" size="full">
              결과 찾기
            </Button>
          </form>
        </OrnamentCard>

        {found ? (
          <MysticPanel className="mt-8">
            <p className="display-title text-lg">2026 종합운세</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">주문번호 {orderNo}</p>
            <Button asChild className="mt-4" size="sm" variant="outline">
              <Link href="/report/demo">리포트 열기</Link>
            </Button>
          </MysticPanel>
        ) : null}
      </div>
    </MysticPage>
  );
}
