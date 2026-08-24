"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { PaidReport } from "@/types";
import { KeywordTag } from "@/components/mystic/section-heading";
import { formatFortuneEvidenceForDisplay } from "@/lib/presentation/format-evidence-label";

/**
 * PHASE P1.3 — Premium paid report editorial layout.
 */
export function PaidReportView({ report }: { report: PaidReport }) {
  const isTotal = /종합|사용설명서|total/i.test(report.productName + report.headline);

  const levelKo = (level: "low" | "mid" | "high") =>
    level === "low" ? "낮음" : level === "high" ? "높음" : "중간";

  return (
    <div className="paid-report-root min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <header className="paid-report-cover relative overflow-hidden bg-[var(--bg-primary)] px-6 pb-16 pt-14 text-center">
        <div className="pointer-events-none absolute inset-0 opacity-40 [background:radial-gradient(ellipse_at_top,rgba(201,162,39,0.18),transparent_55%)]" />
        <p className="relative text-xs tracking-[0.35em] text-[var(--gold-primary)]">
          運의結
        </p>
        <h1 className="display-title relative mt-6 text-3xl leading-snug sm:text-4xl">
          {report.nickname}님의
          <br />
          {isTotal ? "사주 사용설명서" : "재물 사용설명서"}
        </h1>
        <p className="relative mt-4 text-sm text-[var(--text-secondary)]">
          {report.productName}
        </p>
        <p className="relative mt-8 text-[10px] text-[var(--text-muted)]">
          {isTotal ? "PERSONAL FOUR PILLARS REPORT" : "MONEY READING"}
        </p>
        <p className="relative mt-6 text-[10px] text-[var(--text-muted)]">
          주문번호 {report.orderNo}
        </p>
      </header>

      <div className="paid-report-body mx-auto w-full max-w-lg px-5 pb-24 pt-2">
        <section className="rounded-sm border border-[var(--border-gold)]/35 bg-[var(--bg-card)]/80 px-5 py-7">
          <p className="text-xs tracking-[0.2em] text-[var(--gold-primary)]">
            {isTotal ? "CORE PROFILE" : "MONEY PROFILE"}
          </p>
          <p className="display-title mt-3 text-xl leading-relaxed">
            {report.signatureStatement ?? report.headline}
          </p>
          {report.profileDashboard && report.profileDashboard.length > 0 ? (
            <div className="mt-6 grid gap-2">
              {report.profileDashboard.map((row) => (
                <div
                  key={row.label}
                  className="grid grid-cols-[7.5rem_1fr] gap-2 border-b border-[var(--border-subtle)] py-2 text-sm"
                >
                  <span className="text-[var(--text-muted)]">{row.label}</span>
                  <span className="text-[var(--text-secondary)]">{row.value}</span>
                </div>
              ))}
            </div>
          ) : null}
          {report.profileScales && report.profileScales.length > 0 ? (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {report.profileScales.map((s) => (
                <div
                  key={s.label}
                  className="rounded-sm border border-[var(--border-subtle)] bg-[var(--bg-primary)]/40 p-3"
                >
                  <div className="flex items-center justify-between text-sm">
                    <span>{s.label}</span>
                    <span className="text-[var(--gold-primary)]">{levelKo(s.level)}</span>
                  </div>
                  <div className="mt-2 flex justify-between text-[10px] text-[var(--text-muted)]">
                    <span>{s.leftLabel}</span>
                    <span>{s.rightLabel}</span>
                  </div>
                  <p className="mt-1 text-[10px] text-[var(--text-muted)]">{s.note}</p>
                </div>
              ))}
            </div>
          ) : null}
          {report.fiveElementsSnapshot && report.fiveElementsSnapshot.length > 0 ? (
            <div className="mt-6">
              <p className="text-[10px] tracking-[0.2em] text-[var(--text-muted)]">
                五行
              </p>
              <div className="mt-2 grid grid-cols-5 gap-2">
                {report.fiveElementsSnapshot.map((el) => {
                  const max = Math.max(
                    1,
                    ...report.fiveElementsSnapshot!.map((x) => x.count)
                  );
                  const pct = Math.round((el.count / max) * 100);
                  return (
                    <div key={el.key} className="text-center">
                      <div className="mx-auto flex h-14 w-full items-end rounded-sm bg-[rgba(201,162,39,0.08)] px-1 pb-1">
                        <div
                          className="w-full rounded-sm bg-[var(--gold-primary)]/70"
                          style={{ height: `${Math.max(8, pct)}%` }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-[var(--gold-light)]">{el.label}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">{el.count}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            {report.keywords.map((k) => (
              <KeywordTag key={k}>{k}</KeywordTag>
            ))}
          </div>
        </section>

        {report.blueprint ? (
          <section className="mt-8 border border-[var(--border-subtle)] bg-[var(--bg-card)]/60 p-5">
            <p className="text-xs tracking-[0.2em] text-[var(--gold-primary)]">
              사주 설계도
            </p>
            <p className="mt-3 text-sm text-[var(--gold-light)]">
              {report.blueprint.dayMasterTerm}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
              {report.blueprint.dayMasterPlain}
            </p>
            <p className="mt-3 text-xs text-[var(--text-muted)]">
              {report.blueprint.fiveElementsNote}
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {report.blueprint.tenGodsNote}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
              {report.blueprint.structurePlain}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
              {report.blueprint.lifePlain}
            </p>
          </section>
        ) : null}

        {report.freeBridge ? (
          <p className="mt-5 text-sm leading-relaxed text-[var(--text-muted)]">
            {report.freeBridge}
          </p>
        ) : null}

        <p className="mt-5 text-sm leading-relaxed text-[var(--text-secondary)]">
          {report.summary}
        </p>

        {report.lifeScenes && report.lifeScenes.length > 0 ? (
          <section className="mt-10">
            <p className="text-xs tracking-[0.2em] text-[var(--gold-primary)]">
              LIFE SCENES
            </p>
            <h2 className="display-title mt-2 text-xl">이런 장면, 익숙하지 않나요?</h2>
            <ul className="mt-4 space-y-2">
              {report.lifeScenes.map((s) => (
                <li
                  key={s}
                  className="border-l-2 border-[var(--gold-primary)]/60 pl-3 text-sm text-[var(--text-secondary)]"
                >
                  {s}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="mt-10 space-y-8">
          {report.chapters.map((chapter) => (
            <section
              key={chapter.number}
              className="paid-chapter break-inside-avoid border-t border-[var(--border-subtle)] pt-7"
            >
              <p className="text-xs tracking-[0.2em] text-[var(--text-muted)]">
                {chapter.number}
              </p>
              <h2 className="display-title mt-2 text-xl">{chapter.title}</h2>
              {chapter.question ? (
                <p className="mt-2 text-xs text-[var(--gold-primary)]">
                  Q. {chapter.question}
                </p>
              ) : null}
              {chapter.narrativeBridge ? (
                <p className="mt-2 text-xs italic text-[var(--text-muted)]">
                  {chapter.narrativeBridge}
                </p>
              ) : null}
              {chapter.pullQuote ? (
                <blockquote className="mt-3 border-l-2 border-[var(--gold-primary)] pl-3 text-sm italic text-[var(--gold-light)]">
                  {chapter.pullQuote}
                </blockquote>
              ) : null}
              {chapter.coreInsight ? (
                <p className="mt-3 text-sm font-medium text-[var(--text-primary)]">
                  {chapter.coreInsight}
                </p>
              ) : null}
              {chapter.paradoxNote ? (
                <p className="mt-3 border-l-2 border-[var(--gold-primary)] bg-[rgba(201,162,39,0.06)] px-3 py-2 text-sm text-[var(--text-secondary)]">
                  {chapter.paradoxNote}
                </p>
              ) : null}
              {chapter.behaviorScenes && chapter.behaviorScenes.length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {chapter.behaviorScenes.map((s) => (
                    <li
                      key={s}
                      className="rounded-sm bg-[rgba(201,162,39,0.05)] px-3 py-2 text-sm leading-relaxed text-[var(--text-secondary)]"
                    >
                      {s}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                  {chapter.body}
                </p>
              )}
              {(chapter.strengthSide || chapter.riskSide) && (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {chapter.strengthSide ? (
                    <div className="border border-[var(--border-subtle)] p-3 text-xs">
                      <p className="text-[var(--gold-primary)]">강점 면</p>
                      <p className="mt-1 text-[var(--text-secondary)]">
                        {chapter.strengthSide}
                      </p>
                    </div>
                  ) : null}
                  {chapter.riskSide ? (
                    <div className="border border-[var(--border-subtle)] p-3 text-xs">
                      <p className="text-[var(--text-muted)]">주의 면</p>
                      <p className="mt-1 text-[var(--text-secondary)]">
                        {chapter.riskSide}
                      </p>
                    </div>
                  ) : null}
                </div>
              )}
              {chapter.includeWhyBox &&
              chapter.evidenceExplanation &&
              chapter.evidenceExplanation.length > 0 ? (
                <div className="mt-4 rounded-sm border border-[var(--gold-primary)]/25 bg-[rgba(201,162,39,0.06)] px-4 py-3">
                  <p className="text-[10px] text-[var(--gold-primary)]">
                    왜 이렇게 읽히는가
                  </p>
                  {chapter.evidenceExplanation.map((w) => (
                    <p
                      key={w}
                      className="mt-2 text-xs leading-relaxed text-[var(--text-secondary)]"
                    >
                      {w}
                    </p>
                  ))}
                  {chapter.evidence && chapter.evidence.length > 0 ? (
                    <p className="mt-2 text-[10px] text-[var(--text-muted)]">
                      Evidence ·{" "}
                      {formatFortuneEvidenceForDisplay(chapter.evidence).join(
                        " · "
                      )}
                    </p>
                  ) : null}
                </div>
              ) : null}
              {chapter.takeaway ? (
                <p className="mt-3 text-sm text-[var(--gold-light)]">
                  → {chapter.takeaway}
                </p>
              ) : null}
            </section>
          ))}
        </div>

        {report.contradictions && report.contradictions.length > 0 ? (
          <section className="mt-12 border-t border-[var(--border-gold)]/40 pt-8">
            <p className="text-xs tracking-[0.2em] text-[var(--gold-primary)]">
              CONTRADICTION MAP
            </p>
            <h2 className="display-title mt-2 text-2xl">한 사람 안의 긴장</h2>
            <div className="mt-6 space-y-4">
              {report.contradictions.map((c) => (
                <article
                  key={`${c.poleA}-${c.poleB}`}
                  className="border border-[var(--border-subtle)] bg-[var(--bg-card)]/70 p-4"
                >
                  <p className="text-sm text-[var(--gold-light)]">
                    {c.poleA} <span className="text-[var(--text-muted)]">×</span>{" "}
                    {c.poleB}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                    {c.howItShows}
                  </p>
                  {c.result ? (
                    <p className="mt-2 rounded-sm bg-[var(--bg-primary)]/50 px-3 py-2 text-xs text-[var(--text-secondary)]">
                      <span className="text-[var(--gold-primary)]">RESULT</span> {c.result}
                    </p>
                  ) : null}
                  <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
                    <p>
                      <span className="text-[var(--gold-primary)]">장점</span>
                      <br />
                      {c.upside}
                    </p>
                    <p>
                      <span className="text-[var(--text-muted)]">문제</span>
                      <br />
                      {c.downside}
                    </p>
                    <p>
                      <span className="text-[var(--text-muted)]">언제</span>
                      <br />
                      {c.whenStronger}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {report.strengthShadows && report.strengthShadows.length > 0 ? (
          <section className="mt-12 border-t border-[var(--border-subtle)] pt-8">
            <p className="text-xs tracking-[0.2em] text-[var(--gold-primary)]">
              STRENGTH → SHADOW
            </p>
            <h2 className="display-title mt-2 text-2xl">강점이 지나칠 때</h2>
            <div className="mt-5 space-y-3">
              {report.strengthShadows.map((s) => (
                <div
                  key={s.strength}
                  className="grid gap-1 border border-[var(--border-subtle)] p-4 text-sm"
                >
                  <p className="text-[var(--gold-light)]">{s.strength}</p>
                  <p className="text-[var(--text-secondary)]">↓ {s.overuse}</p>
                  <p className="text-[var(--text-muted)]">→ {s.problem}</p>
                  {s.balancePoint ? (
                    <p className="text-xs text-[var(--gold-light)]">
                      균형점 · {s.balancePoint}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {report.actionItems && report.actionItems.length > 0 ? (
          <section className="mt-12 border-t border-[var(--border-subtle)] pt-8">
            <p className="text-xs tracking-[0.2em] text-[var(--gold-primary)]">
              ACTION
            </p>
            <h2 className="display-title mt-2 text-2xl">실행 가이드</h2>
            <ul className="mt-4 space-y-3">
              {report.actionItems.map((a) => (
                <li
                  key={a.what}
                  className="border-l-2 border-[var(--gold-primary)]/50 pl-3 text-sm"
                >
                  <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                    {a.domain}
                  </p>
                  {a.when ? (
                    <p className="text-xs text-[var(--gold-primary)]">WHEN · {a.when}</p>
                  ) : null}
                  <p className="text-[var(--text-primary)]">DO · {a.what}</p>
                  <p className="text-[var(--text-muted)]">WHY · {a.why}</p>
                  <p className="text-[var(--text-secondary)]">HOW · {a.how}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {report.finalSummary ? (
          <section className="mt-12 rounded-sm border border-[var(--border-gold)]/40 bg-[var(--bg-card)] px-5 py-8">
            <p className="text-xs tracking-[0.2em] text-[var(--gold-primary)]">
              運의結
            </p>
            <h2 className="display-title mt-2 text-2xl">결론</h2>
            <div className="mt-6 grid gap-4 text-sm">
              <div>
                <p className="text-[10px] text-[var(--text-muted)]">강점</p>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-[var(--text-secondary)]">
                  {report.finalSummary.strengths.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[10px] text-[var(--text-muted)]">주의</p>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-[var(--text-secondary)]">
                  {report.finalSummary.cautions.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </div>
              {report.finalSummary.changeHabits ? (
                <div>
                  <p className="text-[10px] text-[var(--text-muted)]">바꿀 습관</p>
                  <ul className="mt-1 list-disc space-y-1 pl-4 text-[var(--text-secondary)]">
                    {report.finalSummary.changeHabits.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {report.finalSummary.keepHabits ? (
                <div>
                  <p className="text-[10px] text-[var(--text-muted)]">유지할 방식</p>
                  <ul className="mt-1 list-disc space-y-1 pl-4 text-[var(--text-secondary)]">
                    {report.finalSummary.keepHabits.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
            <p className="display-title mt-8 text-lg leading-relaxed text-[var(--gold-light)]">
              {report.finalSummary.closingLine}
            </p>
          </section>
        ) : null}

        {report.scopeNotes ? (
          <section className="mt-8 border-t border-[var(--border-subtle)] pt-6">
            <p className="text-[10px] text-[var(--text-muted)]">이 리포트의 범위</p>
            <p className="mt-2 text-xs leading-relaxed text-[var(--text-muted)]">
              {report.scopeNotes}
            </p>
          </section>
        ) : null}

        <div className="mt-10 flex flex-col gap-3 print:hidden">
          <Button
            size="full"
            variant="secondary"
            onClick={() => {
              if (typeof window !== "undefined") window.print();
            }}
          >
            PDF로 저장 / 인쇄
          </Button>
          <Button asChild size="full" variant="outline">
            <Link href="/products">추가 상품 보기</Link>
          </Button>
        </div>

        <p className="mt-8 text-center text-xs leading-relaxed text-[var(--text-muted)]">
          본 서비스의 운세 및 사주 콘텐츠는 참고 및 엔터테인먼트 목적으로 제공됩니다.
        </p>
      </div>
    </div>
  );
}
