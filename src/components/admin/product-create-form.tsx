"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ProductCreateForm() {
  const [saved, setSaved] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(true);
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
          상품 생성
        </h1>
        <p className="mt-1 text-sm text-[var(--ink-faint)]">Mock 저장 — DB 연동은 PHASE 2</p>
      </div>

      <Field label="상품명">
        <Input name="name" placeholder="2026년 재물운" required />
      </Field>
      <Field label="Slug">
        <Input name="slug" placeholder="2026-money" required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="정가">
          <Input name="regularPrice" type="number" placeholder="9900" required />
        </Field>
        <Field label="판매가">
          <Input name="salePrice" type="number" placeholder="6900" required />
        </Field>
      </div>
      <Field label="설명">
        <Textarea name="description" placeholder="2026년 돈의 흐름과..." required />
      </Field>
      <Field label="상품 이미지">
        <Input name="thumbnail" type="file" accept="image/*" />
      </Field>
      <Field label="무료 공개 %">
        <Input name="freeRatio" type="number" defaultValue={30} min={0} max={100} />
      </Field>
      <Field label="사용 프롬프트">
        <Input name="prompt" defaultValue="fortune-money-v3" />
      </Field>
      <Field label="결과 템플릿">
        <Input name="template" defaultValue="standard-report" />
      </Field>
      <Field label="판매 상태">
        <select name="status" className="field-select" defaultValue="ACTIVE">
          <option value="DRAFT">DRAFT</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="INACTIVE">INACTIVE</option>
          <option value="ARCHIVED">ARCHIVED</option>
        </select>
      </Field>

      {saved ? (
        <p className="rounded-xl bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--ink)]">
          Mock 저장 완료. 실제 저장은 PHASE 2에서 연결됩니다.
        </p>
      ) : null}

      <div className="flex gap-3">
        <Button type="submit">저장</Button>
        <Button asChild variant="outline">
          <Link href="/admin/products">목록</Link>
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
