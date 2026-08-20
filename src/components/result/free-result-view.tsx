"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/ui/star-rating";
import { MysticCard } from "@/components/ui/card";
import { FiveElementsDecor } from "@/components/mystic/five-elements";
import { formatKRW } from "@/lib/utils";
import { trackClientEvent } from "@/lib/analytics/client";
import type { FreeResultPublicDTO } from "@/lib/dto/free-result-public";
import type { Product } from "@/types";

const scoreLabels: Record<string, string> = {
  overall: "전체운",
  money: "재물운",
  career: "직업운",
  love: "연애운",
};

const previewLabels: Record<string, string> = {
  money: "재물운",
  career: "직장운",
  love: "연애운",
  relationships: "인간관계",
  timing: "시기",
};

const lockedTeasers = [
  "재물의 구체적 흐름과 주의 시기",
  "직업·환경 변화의 타이밍",
  "연애·인연의 세부 흐름",
];

function InsightBasis({ labels }: { labels: string[] }) {
  if (!labels.length) return null;
  return (
    <p className="mt-3 text-[11px] leading-relaxed text-[var(--ink-faint)]">
      <span className="text-[var(--gold-muted)]">왜 이렇게 보나요?</span>
      <br />
      {labels.join(" · ")}
    </p>
  );
}

export function FreeResultView({
  result,
  products,
}: {
  result: FreeResultPublicDTO;
  products: Product[];
}) {
  useEffect(() => {
    trackClientEvent({
      eventName: "free_result_view",
      path: `/result/${result.id}`,
      metadata: { resultId: result.id },
    });
  }, [result.id]);

  const primary = products[0];

  return (
    <div className="mx-auto w-full max-w-lg px-5 pb-32 pt-4">
      {/* [OO님의 사주] + 운의결 한 줄 */}
      <div className="border-b border-[var(--line)] pb-6">
        <p className="hanja-accent mb-2">四柱 · 命式 리포트</p>
        <p className="text-sm text-[var(--ink-faint)]">
          {result.nickname}님의 사주
          {result.birthYearLabel ? ` · ${result.birthYearLabel}` : null}
        </p>
        <p className="mt-4 text-xs tracking-[0.15em] text-[var(--gold)]">운의결 한 줄</p>
        <h1 className="display-title mt-2 text-[1.65rem] leading-snug md:text-3xl">
          {result.hookLine}
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-[var(--ink-muted)]">
          {result.summary}
        </p>
      </div>

      {/* 다섯 가지 기운 */}
      <MysticCard className="mt-8 p-6">
        <p className="text-center text-sm font-semibold text-[var(--ink-bright)]">
          당신을 이루는 다섯 가지 기운
        </p>
        <FiveElementsDecor className="mt-4" />
        <div className="gold-divider my-6" />
        <p className="text-xs text-[var(--ink-faint)]">핵심 키워드</p>
        <p className="mt-2 font-[family-name:var(--font-display)] text-xl text-[var(--gold-soft)]">
          {result.keywords.join(" · ")}
        </p>
        <div className="mt-5 space-y-2">
          {(Object.keys(scoreLabels) as Array<keyof typeof result.scores>).map(
            (key) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm text-[var(--ink-muted)]">
                  {scoreLabels[key]}
                </span>
                <StarRating value={result.scores[key] ?? 3} />
              </div>
            )
          )}
        </div>
      </MysticCard>

      {/* 겉으로 보이는 나 / 실제 나 */}
      {result.outerVsInner ? (
        <MysticCard className="mt-8 p-5">
          <p className="text-xs tracking-[0.12em] text-[var(--gold)]">겉과 속</p>
          <h2 className="display-title mt-1 text-xl">겉으로 보이는 나 / 실제 나</h2>
          <div className="mt-5 grid gap-4">
            <div className="border-l-2 border-[var(--line-strong)] pl-4">
              <p className="text-xs text-[var(--ink-faint)]">겉으로 보이는 모습</p>
              <p className="mt-1 text-sm leading-relaxed text-[var(--ink)]">
                {result.outerVsInner.outer}
              </p>
            </div>
            <div className="border-l-2 border-[var(--gold)] pl-4">
              <p className="text-xs text-[var(--ink-faint)]">실제 내면</p>
              <p className="mt-1 text-sm leading-relaxed text-[var(--ink-bright)]">
                {result.outerVsInner.inner}
              </p>
            </div>
          </div>
          <InsightBasis labels={result.outerVsInner.insightBasis} />
        </MysticCard>
      ) : null}

      {/* 당신이 잘 모르는 당신의 모습 */}
      {result.hiddenSelf ? (
        <MysticCard className="mt-6 border-[var(--line-strong)] p-5 shadow-[var(--glow-warm)]">
          <p className="text-xs tracking-[0.12em] text-[var(--gold)]">INSIGHT</p>
          <h2 className="display-title mt-1 text-xl">{result.hiddenSelf.title}</h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--ink)]">
            {result.hiddenSelf.body}
          </p>
          <InsightBasis labels={result.hiddenSelf.insightBasis} />
        </MysticCard>
      ) : null}

      {/* 타고난 성향 (양면) */}
      <article className="mt-8">
        <h2 className="display-title text-xl">{result.personality.title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-[var(--ink)]">
          {result.personality.summary}
        </p>
      </article>

      {/* 타고난 강점 */}
      {result.strengths.length > 0 ? (
        <section className="mt-8">
          <h2 className="display-title text-xl">타고난 강점</h2>
          <ul className="mt-4 space-y-3">
            {result.strengths.map((item) => (
              <li
                key={item}
                className="border border-[var(--line)] bg-[var(--paper)]/40 px-4 py-3 text-sm leading-relaxed text-[var(--ink)]"
              >
                {item}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* 주의해야 할 패턴 */}
      {result.cautionPatterns.length > 0 ? (
        <section className="mt-8">
          <h2 className="display-title text-xl">주의해야 할 패턴</h2>
          <p className="mt-2 text-xs text-[var(--ink-faint)]">
            같은 성향이 지나칠 때 나타날 수 있는 모습입니다.
          </p>
          <ul className="mt-4 space-y-3">
            {result.cautionPatterns.map((item) => (
              <li
                key={item}
                className="border border-[var(--line)] bg-[var(--surface)]/50 px-4 py-3 text-sm leading-relaxed text-[var(--ink-muted)]"
              >
                {item}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* 스트레스 */}
      {result.stressPattern ? (
        <MysticCard className="mt-8 p-5">
          <h2 className="display-title text-lg">스트레스가 쌓이면</h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--ink)]">
            {result.stressPattern}
          </p>
        </MysticCard>
      ) : null}

      <div className="gold-divider my-8" />

      {/* 현재의 흐름 */}
      <article>
        <h2 className="display-title text-xl">{result.currentFlow.title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-[var(--ink)]">
          {result.currentFlow.summary}
        </p>
      </article>

      {/* Preview sections */}
      <div className="mt-8 space-y-6">
        {result.previews.map((preview) => (
          <article key={preview.category} className="mystic-card p-5">
            <div className="flex items-start justify-between gap-3">
              <h2 className="display-title text-lg">
                {previewLabels[preview.category] ?? preview.category}
              </h2>
              <Lock className="mt-1 h-4 w-4 text-[var(--gold)]" aria-hidden />
            </div>
            <p className="mt-3 text-sm leading-relaxed text-[var(--ink-muted)]">
              {preview.preview}
            </p>
            <div className="relative mt-4 overflow-hidden rounded-sm border border-[var(--line)] bg-[var(--surface-strong)] p-4">
              <p className="blur-[3px] select-none text-sm text-[var(--ink-faint)]">
                시기별 흐름과 구체적인 활용법은 전체 리포트에서 이어집니다.
              </p>
              <div className="absolute inset-0 flex items-center justify-center bg-[color-mix(in_oklab,var(--bg-deep)_60%,transparent)]">
                <span className="flex items-center gap-2 text-xs text-[var(--gold-soft)]">
                  <Lock className="h-3.5 w-3.5" aria-hidden />
                  상세 내용 잠김
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Premium lock teasers */}
      <MysticCard className="mt-8 p-5">
        <p className="text-xs text-[var(--gold)]">전체 리포트에서 이어지는 내용</p>
        <ul className="mt-4 space-y-3">
          {lockedTeasers.map((t) => (
            <li
              key={t}
              className="flex items-center gap-2 text-sm text-[var(--ink-muted)]"
            >
              <Lock className="h-3.5 w-3.5 shrink-0 text-[var(--gold)]" aria-hidden />
              {t}
            </li>
          ))}
        </ul>
      </MysticCard>

      {/* 운의결 한마디 */}
      {result.signatureClosing ? (
        <MysticCard className="mt-8 border-[var(--line-strong)] p-6 text-center">
          <p className="text-xs tracking-[0.2em] text-[var(--gold)]">운의결 한마디</p>
          <p className="mt-4 font-[family-name:var(--font-display)] text-base leading-relaxed text-[var(--ink-bright)]">
            {result.signatureClosing}
          </p>
        </MysticCard>
      ) : null}

      <p className="mt-8 text-xs leading-relaxed text-[var(--ink-faint)]">
        {result.disclaimer}
      </p>

      {products.length > 0 ? (
        <div className="mt-10 space-y-4">
          <p className="text-sm text-[var(--ink-muted)]">내 사주 전체 풀이 보기</p>
          {products.map((product) => (
            <MysticCard key={product.id} className="p-5">
              <h3 className="display-title text-xl">{product.name}</h3>
              <p className="mt-1 text-sm text-[var(--ink-muted)]">
                {product.shortDescription}
              </p>
              <p className="mt-3 text-lg font-semibold text-[var(--gold-soft)]">
                {formatKRW(product.salePrice)}
              </p>
              <Button asChild size="full" className="mt-4" variant="lock">
                <Link href={`/product/${product.slug}?result=${result.id}`}>
                  내 사주 전체 풀이 보기
                </Link>
              </Button>
            </MysticCard>
          ))}
        </div>
      ) : null}

      {primary ? (
        <div className="fixed inset-x-0 bottom-0 border-t border-[var(--line)] bg-[color-mix(in_oklab,var(--bg-deep)_92%,transparent)] px-5 py-3 backdrop-blur md:hidden">
          <div className="mx-auto flex max-w-lg items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[var(--ink-bright)]">
                {primary.name}
              </p>
              <p className="text-xs text-[var(--ink-muted)]">
                {formatKRW(primary.salePrice)}
              </p>
            </div>
            <Button asChild size="sm" variant="lock">
              <Link href={`/product/${primary.slug}?result=${result.id}`}>
                전체 보기
              </Link>
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
