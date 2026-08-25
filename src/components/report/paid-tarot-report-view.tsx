"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { PaidCrossReading } from "@/lib/ai/schemas/paid-cross-reading";

export function PaidTarotReportView(props: {
  reading: PaidCrossReading;
  nickname: string;
  orderNo: string;
  productName: string;
}) {
  const { reading, nickname, orderNo, productName } = props;

  return (
    <div className="paid-report-root min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <header className="relative overflow-hidden px-6 pb-14 pt-14 text-center">
        <p className="text-xs tracking-[0.35em] text-[var(--gold-primary)]">運의結</p>
        <h1 className="display-title relative mt-6 text-3xl leading-snug sm:text-4xl">
          {nickname}님의
          <br />
          사주×타로 심층 교차리딩
        </h1>
        <p className="mt-4 text-sm text-[var(--text-secondary)]">{productName}</p>
        <p className="mt-6 text-[10px] text-[var(--text-muted)]">주문번호 {orderNo}</p>
      </header>

      <div className="mx-auto w-full max-w-lg space-y-8 px-5 pb-24">
        <section className="border border-[var(--border-gold)]/35 bg-[var(--bg-card)]/80 px-5 py-6">
          <p className="text-xs tracking-[0.2em] text-[var(--gold-primary)]">QUESTION</p>
          <p className="mt-3 text-sm text-[var(--text-muted)]">{reading.questionSummary.original}</p>
          <p className="mt-3 text-base leading-relaxed">{reading.questionSummary.structured}</p>
          <ul className="mt-4 space-y-1 text-sm text-[var(--text-secondary)]">
            {reading.questionSummary.decisionAxes.map((a) => (
              <li key={a}>· {a}</li>
            ))}
          </ul>
        </section>

        <section>
          <p className="text-xs tracking-[0.2em] text-[var(--gold-primary)]">SAJU BASELINE</p>
          <p className="mt-3 leading-relaxed">{reading.sajuBaseline.summary}</p>
        </section>

        <section className="space-y-4">
          <p className="text-xs tracking-[0.2em] text-[var(--gold-primary)]">CARDS</p>
          {reading.cards.map((c, i) => (
            <div key={c.cardId + c.position} className="border-b border-[var(--border-subtle)] pb-4">
              <p className="text-sm font-medium">
                {c.positionLabel} · {c.nameKo} (
                {c.orientation === "UPRIGHT" ? "정방향" : "역방향"})
              </p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                {reading.cardInterpretations[i]?.body}
              </p>
            </div>
          ))}
          <p className="pt-2 leading-relaxed">{reading.threeCardStory}</p>
        </section>

        <section className="space-y-4">
          <p className="text-xs tracking-[0.2em] text-[var(--gold-primary)]">CROSS CONNECTIONS</p>
          {reading.crossConnections.map((cc) => (
            <div key={cc.id} className="rounded-sm border border-[var(--border-subtle)] px-4 py-4">
              <p className="text-xs text-[var(--text-muted)]">사주 · {cc.sajuSignal}</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">타로 · {cc.tarotSignal}</p>
              <p className="mt-3 text-sm leading-relaxed">{cc.connection}</p>
              <p className="mt-2 text-sm text-[var(--gold-primary)]">{cc.practicalMeaning}</p>
            </div>
          ))}
        </section>

        <section className="border border-[var(--border-gold)]/35 px-5 py-6">
          <p className="text-xs tracking-[0.2em] text-[var(--gold-primary)]">HIDDEN TENSION</p>
          <p className="mt-3 text-sm">평소: {reading.hiddenTension.innateWay}</p>
          <p className="mt-2 text-sm">지금: {reading.hiddenTension.cardPressure}</p>
          <p className="mt-3 leading-relaxed">{reading.hiddenTension.collision}</p>
          <p className="mt-3 text-sm text-[var(--text-secondary)]">
            {reading.hiddenTension.riskIfIgnored}
          </p>
        </section>

        <section>
          <p className="text-xs tracking-[0.2em] text-[var(--gold-primary)]">CHOICE</p>
          <p className="mt-3 text-sm">A · {reading.choicePerspective.optionA}</p>
          <p className="mt-2 text-sm">B · {reading.choicePerspective.optionB}</p>
          <ul className="mt-4 space-y-1 text-sm text-[var(--text-secondary)]">
            {reading.choicePerspective.checkBeforeDecide.map((x) => (
              <li key={x}>· {x}</li>
            ))}
          </ul>
        </section>

        <section>
          <p className="text-xs tracking-[0.2em] text-[var(--gold-primary)]">ACTIONS</p>
          <ul className="mt-3 space-y-2 text-sm">
            {reading.actionOptions.map((a) => (
              <li key={a}>· {a}</li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-[var(--text-secondary)]">{reading.whatToWatch}</p>
          <p className="mt-4 font-medium leading-relaxed">{reading.riskPattern}</p>
        </section>

        <section>
          <p className="text-xs tracking-[0.2em] text-[var(--gold-primary)]">CLOSING</p>
          <p className="mt-3 text-lg leading-relaxed">{reading.closingInsight}</p>
          <div className="mt-6 space-y-2">
            {reading.shareableInsight.map((s) => (
              <p key={s} className="text-sm text-[var(--text-secondary)]">
                “{s}”
              </p>
            ))}
          </div>
        </section>

        <section>
          <p className="text-xs tracking-[0.2em] text-[var(--gold-primary)]">NEXT</p>
          <ul className="mt-3 space-y-2 text-sm text-[var(--text-secondary)]">
            {reading.possibleNextQuestions.map((q) => (
              <li key={q}>· {q}</li>
            ))}
          </ul>
        </section>

        <p className="text-[11px] leading-relaxed text-[var(--text-muted)]">
          {reading.disclaimer}
        </p>

        <Button asChild variant="outline" size="full">
          <Link href="/my-results">내 결과로</Link>
        </Button>
      </div>
    </div>
  );
}
