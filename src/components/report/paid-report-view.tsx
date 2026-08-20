import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { PaidReport } from "@/types";

export function PaidReportView({ report }: { report: PaidReport }) {
  return (
    <div className="mx-auto w-full max-w-lg px-5 pb-24 pt-4">
      <div className="rounded-3xl bg-[linear-gradient(160deg,#1c2a30,#2f4f4a)] px-6 py-10 text-[var(--paper)]">
        <p className="text-sm opacity-80">2026년 나의 운세 리포트</p>
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl">
          {report.nickname}님
        </h1>
        <p className="mt-3 text-sm opacity-80">{report.productName}</p>
        <p className="mt-6 text-xs opacity-70">주문번호 {report.orderNo}</p>
      </div>

      <h2 className="mt-8 font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
        {report.headline}
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-[var(--ink-muted)]">
        {report.summary}
      </p>
      <p className="mt-4 font-[family-name:var(--font-display)] text-lg text-[var(--ink)]">
        {report.keywords.join(" · ")}
      </p>

      <div className="mt-10 space-y-8">
        {report.chapters.map((chapter) => (
          <section key={chapter.number} className="border-t border-[var(--line)] pt-6">
            <p className="text-xs tracking-[0.2em] text-[var(--ink-faint)]">
              {chapter.number}
            </p>
            <h3 className="mt-2 font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
              {chapter.title}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-[var(--ink-muted)]">
              {chapter.body}
            </p>
          </section>
        ))}
      </div>

      <div className="mt-10 flex flex-col gap-3">
        <Button size="full" variant="secondary">
          PDF 다운로드 (Mock)
        </Button>
        <Button asChild size="full" variant="outline">
          <Link href="/products">추가 상품 보기</Link>
        </Button>
      </div>

      <p className="mt-8 text-center text-xs leading-relaxed text-[var(--ink-faint)]">
        본 서비스의 운세 및 사주 콘텐츠는 참고 및 엔터테인먼트 목적으로 제공됩니다.
        의료, 법률, 투자 등 전문적인 판단을 대체하지 않습니다.
      </p>
    </div>
  );
}
