"use client";

import type { PublicShareDTO } from "@/lib/dto/share-public";
import { OrnamentCard } from "@/components/mystic/ornament-card";
import { MysticPage } from "@/components/mystic/celestial-background";
import {
  CrossFlowBridge,
  CrossInsightCard,
} from "@/components/mystic/cross-insight";
import { TarotCardFace } from "@/components/mystic/tarot-card";
import { KeywordTag } from "@/components/mystic/section-heading";
import { FortuneRatingStrip } from "@/components/mystic/fortune-rating";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HookLineTitle } from "@/components/result/hook-line-title";

const scoreLabels: Record<string, string> = {
  overall: "전체운",
  money: "재물운",
  career: "직장운",
  love: "연애운",
};

export function SharedResultView({ data }: { data: PublicShareDTO }) {
  const { snapshot } = data;

  if (snapshot.type === "TAROT_READING") {
    return (
      <MysticPage rich>
        <div className="mx-auto w-full max-w-lg px-5 pb-28 pt-8">
          <p className="hanja-accent mb-2">SHARED · TAROT × 四柱</p>
          <h1 className="display-title text-2xl">공유된 교차 리딩</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            {snapshot.profile.nickname}
            {snapshot.profile.birthYearLabel
              ? ` · ${snapshot.profile.birthYearLabel}`
              : null}
          </p>

          <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
            {snapshot.cards.map((c) => (
              <article
                key={c.position}
                className="w-[7.5rem] shrink-0 border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3"
              >
                <p className="text-[10px] text-[var(--gold-primary)]">
                  {c.positionLabel}
                </p>
                <TarotCardFace
                  nameKo={c.nameKo}
                  orientation={c.orientation}
                  compact
                  className="mx-auto mt-2"
                />
              </article>
            ))}
          </div>

          <div className="mt-4 space-y-3">
            {snapshot.cards.map((c) => (
              <p
                key={`i-${c.position}`}
                className="text-sm leading-relaxed text-[var(--text-secondary)]"
              >
                <span className="text-[var(--gold-muted)]">
                  {c.positionLabel} ·{" "}
                </span>
                {c.interpretation}
              </p>
            ))}
          </div>

          <div className="gold-divider my-10" role="presentation" />

          <CrossFlowBridge
            fortuneTitle={snapshot.fortunePattern.title}
            fortuneSummary={snapshot.fortunePattern.summary}
            fortuneEvidence={snapshot.fortunePattern.insightBasis}
          />

          <CrossInsightCard
            className="mt-2"
            headline={snapshot.crossInsight.headline}
            body={snapshot.crossInsight.body}
            fortuneBasis={snapshot.crossInsight.fortuneBasis}
            tarotBasis={snapshot.crossInsight.tarotBasis}
          />

          <OrnamentCard density="corners" className="mt-8 p-6 text-center">
            <p className="text-xs tracking-[0.25em] text-[var(--gold-primary)]">
              運의결 한마디
            </p>
            <p className="display-title mt-4 text-base leading-relaxed text-[var(--gold-light)]">
              {snapshot.closingMessage}
            </p>
          </OrnamentCard>

          <p className="mt-10 text-xs leading-relaxed text-[var(--text-muted)]">
            {snapshot.disclaimer}
          </p>

          <Button asChild className="mt-8" size="full" variant="outline">
            <Link href="/">운의결에서 내 사주 보기</Link>
          </Button>
        </div>
      </MysticPage>
    );
  }

  const r = snapshot.result;
  return (
    <div className="relative min-h-screen bg-[var(--bg-primary)]">
      <div className="mx-auto max-w-lg px-5 pb-16 pt-8">
        <p className="hanja-accent mb-2">SHARED · 四柱</p>
        <h1 className="display-title text-2xl">{r.headline}</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          {snapshot.profile.nickname}
          {snapshot.profile.birthYearLabel
            ? ` · ${snapshot.profile.birthYearLabel}`
            : null}
        </p>

        <HookLineTitle
          text={r.hookLine}
          as="p"
          className="mt-6 text-lg text-[var(--gold-light)]"
        />
        <p className="reading-prose mt-4 text-sm text-[var(--text-secondary)]">
          {r.summary}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {r.keywords.map((k) => (
            <KeywordTag key={k}>{k}</KeywordTag>
          ))}
        </div>

        <FortuneRatingStrip
          className="mt-8"
          scores={Object.entries(r.scores).map(([key, value]) => ({
            key,
            label: scoreLabels[key] ?? key,
            value,
          }))}
        />

        {r.personality ? (
          <section className="mt-10">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              {r.personality.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
              {r.personality.summary}
            </p>
          </section>
        ) : null}

        {r.signatureClosing ? (
          <OrnamentCard density="corners" className="mt-10 p-6 text-center">
            <p className="text-xs tracking-[0.25em] text-[var(--gold-primary)]">
              運의결 한마디
            </p>
            <p className="display-title mt-4 text-lg leading-relaxed text-[var(--gold-light)]">
              {r.signatureClosing}
            </p>
          </OrnamentCard>
        ) : null}

        <p className="mt-8 text-xs leading-relaxed text-[var(--text-muted)]">
          {r.disclaimer}
        </p>

        <Button asChild className="mt-8" size="full" variant="outline">
          <Link href="/">운의결에서 내 사주 보기</Link>
        </Button>
      </div>
    </div>
  );
}
