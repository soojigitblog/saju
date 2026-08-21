import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { PaidReport } from "@/types";
import { MysticPage } from "@/components/mystic/celestial-background";
import { OrnamentCard } from "@/components/mystic/ornament-card";
import { KeywordTag } from "@/components/mystic/section-heading";

export function PaidReportView({ report }: { report: PaidReport }) {
  return (
    <MysticPage>
      <div className="mx-auto w-full max-w-lg px-5 pb-24 pt-8">
        <OrnamentCard className="px-6 py-10 text-center">
          <p className="text-xs tracking-[0.2em] text-[var(--gold-primary)]">
            나의 운세 리포트
          </p>
          <h1 className="display-title mt-4 text-3xl">{report.nickname}님</h1>
          <p className="mt-3 text-sm text-[var(--text-secondary)]">{report.productName}</p>
          <p className="mt-6 text-xs text-[var(--text-muted)]">주문번호 {report.orderNo}</p>
        </OrnamentCard>

        <h2 className="display-title mt-8 text-2xl">{report.headline}</h2>
        <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
          {report.summary}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {report.keywords.map((k) => (
            <KeywordTag key={k}>{k}</KeywordTag>
          ))}
        </div>

        <div className="mt-10 space-y-8">
          {report.chapters.map((chapter) => (
            <section key={chapter.number} className="border-t border-[var(--border-subtle)] pt-6">
              <p className="text-xs tracking-[0.2em] text-[var(--text-muted)]">
                {chapter.number}
              </p>
              <h3 className="display-title mt-2 text-xl">{chapter.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                {chapter.body}
              </p>
            </section>
          ))}
        </div>

        {report.monthlyOutlook && report.monthlyOutlook.length > 0 ? (
          <section className="mt-12 border-t border-[var(--border-gold)]/40 pt-8">
            <p className="text-xs tracking-[0.2em] text-[var(--gold-primary)]">
              월별 운세
            </p>
            <h2 className="display-title mt-2 text-2xl">1월부터 12월까지</h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              확정적 예언이 아니라, 달마다 리듬과 주의점을 점검하는 참고입니다.
            </p>
            <div className="mt-6 space-y-5">
              {report.monthlyOutlook.map((m) => (
                <article
                  key={m.month}
                  className="border border-[var(--border-subtle)] bg-[var(--bg-card)]/70 p-4"
                >
                  <p className="text-xs text-[var(--text-muted)]">{m.month}월</p>
                  <h3 className="mt-1 text-base font-medium text-[var(--text-primary)]">
                    {m.title}
                  </h3>
                  <p className="mt-1 text-sm text-[var(--gold-light)]">{m.summary}</p>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                    {m.detail}
                  </p>
                  {m.focus && m.focus.length > 0 ? (
                    <p className="mt-2 text-xs text-[var(--text-muted)]">
                      초점 · {m.focus.join(" · ")}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <div className="mt-10 flex flex-col gap-3">
          <Button size="full" variant="secondary">
            PDF 다운로드 (Mock)
          </Button>
          <Button asChild size="full" variant="outline">
            <Link href="/products">추가 상품 보기</Link>
          </Button>
        </div>

        <p className="mt-8 text-center text-xs leading-relaxed text-[var(--text-muted)]">
          본 서비스의 운세 및 사주 콘텐츠는 참고 및 엔터테인먼트 목적으로 제공됩니다.
          의료, 법률, 투자 등 전문적인 판단을 대체하지 않습니다.
        </p>
      </div>
    </MysticPage>
  );
}
