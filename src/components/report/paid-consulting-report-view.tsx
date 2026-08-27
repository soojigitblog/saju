"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { MysticPage } from "@/components/mystic/celestial-background";
import { OrnamentCard } from "@/components/mystic/ornament-card";
import { trackClientEvent } from "@/lib/analytics/client";
import { REPORT_RENDER_VERSION_CONSULTING } from "@/lib/report/paid-report-versions";

export type PaidConsultingReportViewProps = {
  reportId: string;
  orderNo: string;
  productName: string;
  nickname: string;
  headline: string;
  summary: string;
  accessToken?: string | null;
};

export function PaidConsultingReportView({
  reportId,
  orderNo,
  productName,
  nickname,
  headline,
  summary,
  accessToken,
}: PaidConsultingReportViewProps) {
  const accessQuery = accessToken
    ? `?access=${encodeURIComponent(accessToken)}`
    : "";
  const htmlUrl = `/api/reports/${reportId}/consulting-html${accessQuery}`;
  const pdfUrl = `/api/reports/${reportId}/consulting-pdf${accessQuery}`;

  useEffect(() => {
    trackClientEvent("paid_report_viewed", {
      reportId,
      renderVersion: REPORT_RENDER_VERSION_CONSULTING,
    });
  }, [reportId]);

  return (
    <MysticPage>
      <div className="mx-auto w-full max-w-lg px-5 pb-16 pt-10">
        <p className="hanja-accent">REPORT</p>
        <h1 className="display-title mt-4 text-2xl leading-snug">
          {nickname}님의
          <br />
          {productName}
        </h1>
        <p className="mt-2 text-xs text-[var(--text-muted)]">
          주문번호 {orderNo}
        </p>

        <OrnamentCard density="corners" className="mt-8 p-6">
          <p className="text-xs tracking-[0.2em] text-[var(--gold-primary)]">
            생성 완료
          </p>
          <p className="display-title mt-3 text-lg leading-relaxed">{headline}</p>
          <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
            {summary}
          </p>
        </OrnamentCard>

        <div className="mt-8 flex flex-col gap-3">
          <Button asChild size="lg">
            <a href={htmlUrl} target="_blank" rel="noopener noreferrer">
              PDF 리포트 보기
            </a>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() =>
                trackClientEvent("paid_pdf_opened", {
                  reportId,
                  renderVersion: REPORT_RENDER_VERSION_CONSULTING,
                })
              }
            >
              PDF 다운로드
            </a>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/my-results">내 결과 목록</Link>
          </Button>
        </div>
      </div>
    </MysticPage>
  );
}
