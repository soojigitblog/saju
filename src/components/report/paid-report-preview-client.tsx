"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MysticPage } from "@/components/mystic/celestial-background";
import { OrnamentCard } from "@/components/mystic/ornament-card";
import { EvidenceBox, KeywordTag } from "@/components/mystic/section-heading";
import type { PaidReportPreviewDTO } from "@/lib/dto/paid-report-preview";

/** Owner/QA only — never linked from public result UI. */
export function PaidReportPreviewClient({
  freeResultId,
  productSlug,
}: {
  freeResultId: string;
  productSlug?: string | null;
}) {
  const [data, setData] = useState<PaidReportPreviewDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch("/api/report/preview", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ freeResultId, productSlug }),
          });
          const json = await res.json();
          if (cancelled) return;
          if (!res.ok) {
            setError(json.message ?? "미리보기 생성에 실패했습니다.");
            setLoading(false);
            return;
          }
          setData(json as PaidReportPreviewDTO);
          setLoading(false);
        } catch {
          if (!cancelled) {
            setError("네트워크 오류가 발생했습니다.");
            setLoading(false);
          }
        }
      })();
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [freeResultId, productSlug]);

  if (loading) {
    return (
      <MysticPage rich className="min-h-[70vh]">
        <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-5 text-center">
          <p className="hanja-accent">QA ONLY</p>
          <p className="display-title mt-4 text-2xl">유료 리포트 초안 생성 중</p>
        </div>
      </MysticPage>
    );
  }

  if (error || !data) {
    return (
      <MysticPage>
        <div className="mx-auto max-w-lg px-5 py-16 text-center">
          <p className="text-sm text-[var(--error-text)]">
            {error ?? "미리보기를 불러올 수 없습니다."}
          </p>
          <Button asChild className="mt-6" variant="outline">
            <Link href={`/result/${freeResultId}`}>돌아가기</Link>
          </Button>
        </div>
      </MysticPage>
    );
  }

  return (
    <MysticPage>
      <div className="mx-auto w-full max-w-lg px-5 pb-24 pt-8">
        <OrnamentCard className="px-6 py-8 text-center">
          <p className="text-xs tracking-[0.2em] text-[var(--gold-primary)]">
            QA 미리보기
          </p>
          <h1 className="display-title mt-4 text-3xl">{data.nickname}님</h1>
          <p className="mt-3 text-sm text-[var(--text-secondary)]">
            {data.productName}
          </p>
        </OrnamentCard>

        {data.signatureStatement ? (
          <p className="display-title mt-8 text-xl">{data.signatureStatement}</p>
        ) : null}
        <p className="mt-4 text-sm leading-relaxed text-[var(--text-secondary)]">
          {data.summary}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {data.keywords.map((k) => (
            <KeywordTag key={k}>{k}</KeywordTag>
          ))}
        </div>

        <div className="mt-10 space-y-8">
          {data.chapters.map((chapter) => (
            <section
              key={chapter.number}
              className="border-t border-[var(--border-subtle)] pt-6"
            >
              <p className="text-xs text-[var(--text-muted)]">{chapter.number}</p>
              <h3 className="display-title mt-2 text-xl">{chapter.title}</h3>
              <p className="mt-2 text-sm font-medium">{chapter.coreInsight}</p>
              <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                {chapter.body}
              </p>
              {chapter.evidenceExplanation?.map((w) => (
                <p key={w} className="mt-2 text-xs text-[var(--text-muted)]">
                  WHY: {w}
                </p>
              ))}
              <EvidenceBox title="Evidence" items={chapter.evidence} />
            </section>
          ))}
        </div>

        {data.finalSummary ? (
          <OrnamentCard density="corners" className="mt-10 p-5">
            <p className="text-sm text-[var(--gold-light)]">
              {data.finalSummary.closingLine}
            </p>
          </OrnamentCard>
        ) : null}

        <p className="mt-8 text-xs text-[var(--text-muted)]">{data.disclaimer}</p>
        <Button asChild className="mt-8" size="full" variant="outline">
          <Link href={`/result/${freeResultId}`}>돌아가기</Link>
        </Button>
      </div>
    </MysticPage>
  );
}
