"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { OrnamentCard } from "@/components/mystic/ornament-card";
import { MysticPage } from "@/components/mystic/celestial-background";
import { TarotCardFace } from "@/components/mystic/tarot-card";
import {
  CrossFlowBridge,
  CrossInsightCard,
} from "@/components/mystic/cross-insight";
import { FeedbackPanel } from "@/components/feedback/feedback-panel";
import { ShareButton } from "@/components/share/share-button";

type ReadingPayload = {
  id: string;
  status: string;
  questionCategory: string;
  draws: Array<{
    position: string;
    positionIndex: number;
    cardId: string;
    slug: string;
    orientation: string;
  }>;
  result: {
    fortunePattern: { title: string; summary: string; insightBasis: string[] };
    cards: Array<{
      position: string;
      positionIndex: number;
      cardId: string;
      nameKo: string;
      orientation: string;
      interpretation: string;
    }>;
    crossInsight: {
      headline: string;
      body: string;
      fortuneBasis: string[];
      tarotBasis: string[];
    };
    closingMessage: string;
    disclaimer: string;
  } | null;
  feedbackScore: number | null;
};

const POSITION_LABEL: Record<string, string> = {
  CURRENT: "현재 상황",
  BLOCK: "걸림돌",
  DIRECTION: "필요한 방향",
};

export function TarotReadingView({ readingId }: { readingId: string }) {
  const [data, setData] = useState<ReadingPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`/api/tarot/readings/${readingId}`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (!res.ok) {
          setError(json.message ?? "리딩을 불러올 수 없습니다.");
          return;
        }
        setData(json);
      } catch {
        setError("네트워크 오류가 발생했습니다.");
      }
    })();
  }, [readingId]);

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-5 py-16 text-center">
        <p className="text-sm text-[var(--error-text)]">{error}</p>
        <Button asChild className="mt-6" variant="outline">
          <Link href="/">홈으로</Link>
        </Button>
      </div>
    );
  }

  if (!data || !data.result) {
    return (
      <div className="mx-auto max-w-lg px-5 py-16 text-center text-sm text-[var(--text-muted)]">
        리딩을 불러오는 중...
      </div>
    );
  }

  const r = data.result;

  return (
    <MysticPage rich>
      <div
        className="mx-auto w-full max-w-lg px-5 pb-28 pt-8"
        data-share-root="tarot-cross"
      >
        <p className="hanja-accent mb-2">TAROT × 四柱</p>
        <h1 className="display-title text-2xl">당신이 고른 세 장의 카드</h1>

        <div className="mt-6 flex gap-2 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 sm:gap-3 sm:overflow-visible">
          {r.cards.map((c) => (
            <article
              key={c.positionIndex}
              className="w-[7.5rem] shrink-0 border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3 sm:w-auto"
            >
              <p className="text-[10px] tracking-wide text-[var(--gold-primary)]">
                {POSITION_LABEL[c.position] ?? c.position}
              </p>
              <TarotCardFace
                nameKo={c.nameKo}
                orientation={c.orientation}
                compact
                className="mx-auto mt-2"
              />
              <p className="mt-2 text-center text-xs font-medium text-[var(--text-primary)]">
                {c.nameKo}
              </p>
              <p className="text-center text-[10px] text-[var(--text-muted)]">
                {c.orientation === "UPRIGHT" ? "정방향" : "역방향"}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-4 space-y-3">
          {r.cards.map((c) => (
            <p
              key={`i-${c.positionIndex}`}
              className="text-sm leading-relaxed text-[var(--text-secondary)]"
            >
              <span className="text-[var(--gold-muted)]">
                {POSITION_LABEL[c.position]} ·{" "}
              </span>
              {c.interpretation}
            </p>
          ))}
        </div>

        <div className="gold-divider my-10" role="presentation" />

        <CrossFlowBridge
          fortuneTitle={r.fortunePattern.title}
          fortuneSummary={r.fortunePattern.summary}
          fortuneEvidence={r.fortunePattern.insightBasis}
        />

        <CrossInsightCard
          className="mt-2"
          headline={r.crossInsight.headline}
          body={r.crossInsight.body}
          fortuneBasis={r.crossInsight.fortuneBasis}
          tarotBasis={r.crossInsight.tarotBasis}
        />

        <OrnamentCard density="corners" className="mt-8 p-6 text-center">
          <p className="text-xs tracking-[0.25em] text-[var(--gold-primary)]">
            運의결 한마디
          </p>
          <p className="display-title mt-4 text-base leading-relaxed text-[var(--gold-light)]">
            {r.closingMessage}
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <ShareButton
              resourceType="TAROT_READING"
              resourceId={readingId}
            />
          </div>
        </OrnamentCard>

        <FeedbackPanel
          targetType="CROSS_READING"
          targetId={readingId}
          initiallyDone={Boolean(data.feedbackScore)}
        />

        <p className="mt-10 text-xs leading-relaxed text-[var(--text-muted)]">
          {r.disclaimer}
        </p>

        <Button asChild className="mt-8" size="full" variant="outline">
          <Link href="/">홈으로 돌아가기</Link>
        </Button>
      </div>
    </MysticPage>
  );
}
