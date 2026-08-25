"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatKRW } from "@/lib/utils";
import { trackClientEvent } from "@/lib/analytics/client";
import type { FreeResultPublicDTO } from "@/lib/dto/free-result-public";
import type { Product } from "@/types";
import { OrnamentCard } from "@/components/mystic/ornament-card";
import { BrandMark } from "@/components/mystic/brand-mark";
import { CelestialBackground } from "@/components/mystic/celestial-background";
import { EvidenceBox, GoldDivider, KeywordTag } from "@/components/mystic/section-heading";
import {
  ElementSealRow,
  levelFromCount,
  relationForElement,
  type ElementSealItem,
} from "@/components/mystic/element-seal";
import { FortuneRatingStrip } from "@/components/mystic/fortune-rating";
import { TarotFanPreview } from "@/components/mystic/tarot-card";
import { FeedbackPanel } from "@/components/feedback/feedback-panel";
import { ShareButton } from "@/components/share/share-button";
import { HookLineTitle } from "@/components/result/hook-line-title";

const scoreLabels: Record<string, string> = {
  overall: "전체운",
  money: "재물운",
  career: "직장운",
  love: "연애운",
};

const previewLabels: Record<string, string> = {
  money: "재물운",
  career: "직장운",
  love: "연애운",
  relationships: "인간관계",
  timing: "시기",
};

const SIDEBAR = [
  { id: "summary", label: "전체 요약" },
  { id: "outer", label: "겉과 속" },
  { id: "insight", label: "인사이트" },
  { id: "patterns", label: "강점과 패턴" },
  { id: "previews", label: "영역 미리보기" },
  { id: "tarot", label: "타로로 이어가기" },
] as const;

function buildElementSeals(result: FreeResultPublicDTO): ElementSealItem[] {
  if (!result.fiveElements || !result.dayMaster) return [];
  const fe = result.fiveElements;
  const entries: Array<{ key: ElementSealItem["key"]; hanja: string; count: number }> = [
    { key: "wood", hanja: "木", count: fe.wood },
    { key: "fire", hanja: "火", count: fe.fire },
    { key: "earth", hanja: "土", count: fe.earth },
    { key: "metal", hanja: "金", count: fe.metal },
    { key: "water", hanja: "水", count: fe.water },
  ];
  const max = Math.max(...entries.map((e) => e.count), 1);
  return entries.map((e) => ({
    ...e,
    relation: relationForElement(result.dayMaster!.element, e.key),
    level: levelFromCount(e.count, max),
  }));
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
  const seals = useMemo(() => buildElementSeals(result), [result]);
  const dayLabel = result.dayMaster
    ? `${result.dayMaster.hanja}${result.dayMaster.hangul ? ` · ${result.dayMaster.hangul}` : ""} 일간`
    : null;

  return (
    <div className="relative mx-auto w-full max-w-6xl px-5 pb-36 pt-6 md:px-8 md:pb-16 lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-10">
      <aside className="sticky top-24 hidden self-start lg:block">
        <p className="hanja-accent mb-4">四柱 · 命式 리포트</p>
        <nav aria-label="리포트 목차" className="space-y-1 border-l border-[var(--border-subtle)] pl-3">
          {SIDEBAR.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="block py-1.5 text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--gold-light)]"
            >
              {s.label}
            </a>
          ))}
        </nav>
      </aside>

      <div className="mx-auto w-full max-w-lg lg:mx-0 lg:max-w-2xl">
        {/* Hero signature */}
        <section id="summary" className="relative scroll-mt-24">
          <CelestialBackground intensity="rich" className="rounded-sm opacity-80" />
          <OrnamentCard glow className="relative overflow-hidden px-6 py-8 text-center md:px-10 md:py-10">
            <div className="flex justify-center">
              <BrandMark size={36} />
            </div>
            <p className="mt-4 text-xs tracking-[0.28em] text-[var(--gold-primary)]">
              運의結 한 줄
            </p>
            <HookLineTitle
              text={result.hookLine}
              className="mt-4 text-[1.55rem] leading-snug text-[var(--gold-light)] md:text-[1.85rem]"
            />
            <GoldDivider className="mx-auto my-6 max-w-[180px]" />
            <p className="text-sm text-[var(--text-secondary)]">
              {result.nickname}님의 사주
              {result.birthYearLabel ? ` · ${result.birthYearLabel}` : ""}
              {dayLabel ? ` · ${dayLabel}` : ""}
            </p>
            <p className="reading-prose mt-5 text-[15px] text-[var(--text-secondary)]">
              {result.summary}
            </p>
          </OrnamentCard>
        </section>

        {/* Five elements */}
        {seals.length > 0 ? (
          <section className="mt-10">
            <p className="hanja-accent mb-2 text-center">五行</p>
            <h2 className="display-title text-center text-xl">당신을 이루는 다섯 가지 기운</h2>
            <ElementSealRow items={seals} className="mt-6" />
          </section>
        ) : null}

        {/* Keywords */}
        <section className="mt-8">
          <p className="mb-3 text-center text-xs text-[var(--text-muted)]">핵심 키워드</p>
          <div className="flex flex-wrap justify-center gap-2">
            {result.keywords.map((k) => (
              <KeywordTag key={k}>{k}</KeywordTag>
            ))}
          </div>
        </section>

        {/* Ratings */}
        <FortuneRatingStrip
          className="mt-8"
          scores={(Object.keys(scoreLabels) as Array<keyof typeof result.scores>).map(
            (key) => ({
              key,
              label: scoreLabels[key]!,
              value: result.scores[key] ?? 3,
            })
          )}
        />

        {/* Outer / Inner */}
        {result.outerVsInner ? (
          <section id="outer" className="mt-12 scroll-mt-24">
            <p className="text-xs tracking-[0.15em] text-[var(--gold-primary)]">겉과 속</p>
            <h2 className="display-title mt-1 text-xl">겉으로 보이는 나 / 실제 나</h2>
            <div className="mt-5 grid gap-5">
              <div className="border-l border-[var(--border-subtle)] pl-4">
                <p className="text-xs text-[var(--text-muted)]">겉으로 보이는 모습</p>
                <p className="reading-prose mt-1.5 text-sm text-[var(--text-secondary)]">
                  {result.outerVsInner.outer}
                </p>
              </div>
              <div className="border-l border-[var(--gold-primary)] pl-4">
                <p className="text-xs text-[var(--text-muted)]">실제 내면</p>
                <p className="reading-prose mt-1.5 text-sm text-[var(--text-primary)]">
                  {result.outerVsInner.inner}
                </p>
              </div>
            </div>
            <EvidenceBox items={result.outerVsInner.insightBasis} />
          </section>
        ) : null}

        {/* Insight */}
        {result.hiddenSelf ? (
          <section id="insight" className="mt-12 scroll-mt-24">
            <OrnamentCard density="corners" className="p-6">
              <p className="text-xs tracking-[0.15em] text-[var(--gold-primary)]">INSIGHT</p>
              <h2 className="display-title mt-1 text-xl">{result.hiddenSelf.title}</h2>
              <p className="reading-prose mt-4 text-sm text-[var(--text-secondary)]">
                {result.hiddenSelf.body}
              </p>
              <EvidenceBox items={result.hiddenSelf.insightBasis} />
            </OrnamentCard>
          </section>
        ) : null}

        {/* Personality + patterns */}
        <section id="patterns" className="mt-12 scroll-mt-24">
          <h2 className="display-title text-xl">{result.personality.title}</h2>
          <p className="reading-prose mt-3 text-sm text-[var(--text-secondary)]">
            {result.personality.summary}
          </p>

          {result.strengths.length > 0 ? (
            <div className="mt-8">
              <h3 className="display-title text-lg">타고난 강점</h3>
              <ul className="mt-4 space-y-3">
                {result.strengths.map((item) => (
                  <li
                    key={item}
                    className="border border-[var(--border-subtle)] bg-[var(--bg-card)]/50 px-4 py-3 text-sm leading-relaxed"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {result.cautionPatterns.length > 0 ? (
            <div className="mt-8">
              <h3 className="display-title text-lg">주의해야 할 패턴</h3>
              <p className="mt-2 text-xs text-[var(--text-muted)]">
                같은 성향이 지나칠 때 나타날 수 있는 모습입니다.
              </p>
              <ul className="mt-4 space-y-3">
                {result.cautionPatterns.map((item) => (
                  <li
                    key={item}
                    className="border border-[var(--border-subtle)] px-4 py-3 text-sm leading-relaxed text-[var(--text-secondary)]"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {result.stressPattern ? (
            <div className="mt-8 border border-[var(--border-subtle)] p-5">
              <h3 className="display-title text-lg">스트레스가 쌓이면</h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                {result.stressPattern}
              </p>
            </div>
          ) : null}
        </section>

        <GoldDivider className="my-10" />

        <article>
          <h2 className="display-title text-xl">{result.currentFlow.title}</h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
            {result.currentFlow.summary}
          </p>
        </article>

        {/* Locked previews */}
        <section id="previews" className="mt-12 scroll-mt-24 space-y-5">
          {result.previews.map((preview) => (
            <article
              key={preview.category}
              className="relative overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-card)]/70 p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="display-title text-lg">
                  {previewLabels[preview.category] ?? preview.category}
                </h2>
                <Lock className="mt-1 h-4 w-4 text-[var(--gold-primary)]" aria-hidden />
              </div>
              <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                {preview.preview}
              </p>
              <div className="relative mt-4">
                <p className="select-none text-sm leading-relaxed text-[var(--text-muted)] blur-[2.5px]">
                  시기별 흐름과 구체적인 활용 포인트가 이어집니다. 전체 리포트에서
                  더 자세히 풀어드립니다.
                </p>
                <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-[var(--bg-primary)] via-[var(--bg-primary)]/70 to-transparent pb-1">
                  <p className="text-[11px] text-[var(--gold-muted)]">
                    구체적인 시기와 흐름은 전체 리포트에서
                  </p>
                </div>
              </div>
            </article>
          ))}
        </section>

        {/* Closing */}
        {result.signatureClosing ? (
          <OrnamentCard density="corners" className="mt-12 p-6 text-center">
            <p className="text-xs tracking-[0.25em] text-[var(--gold-primary)]">運의결 한마디</p>
            <p className="display-title mt-4 text-lg leading-relaxed text-[var(--gold-light)]">
              {result.signatureClosing}
            </p>
            <div className="mt-6 flex justify-center">
              <ShareButton resourceType="FREE_RESULT" resourceId={result.id} />
            </div>
          </OrnamentCard>
        ) : (
          <div className="mt-12 flex justify-center">
            <ShareButton resourceType="FREE_RESULT" resourceId={result.id} />
          </div>
        )}

        <FeedbackPanel targetType="FORTUNE" targetId={result.id} />

        <p className="mt-8 text-xs leading-relaxed text-[var(--text-muted)]">
          {result.disclaimer}
        </p>

        {/* Saju → Tarot transition */}
        <section id="tarot" className="relative mt-14 scroll-mt-24 overflow-hidden">
          <CelestialBackground intensity="soft" />
          <OrnamentCard className="relative px-6 py-10 text-center md:px-10">
            <p className="hanja-accent mb-3">四柱 → TAROT</p>
            <h2 className="display-title text-xl leading-snug md:text-2xl">
              사주×타로 체험
            </h2>
            <p className="mt-5 text-sm leading-relaxed text-[var(--text-secondary)]">
              지금 마음속에 있는 질문은
              <br />
              카드에게 물어보세요.
            </p>
            <p className="mx-auto mt-4 max-w-sm text-xs leading-relaxed text-[var(--text-muted)]">
              사주 + 현재 고민 + 3장 타로를 짧게 교차로 읽어 보는 무료 체험입니다.
            </p>

            {/* fan of card backs */}
            <TarotFanPreview className="mt-8" />

            <Button asChild size="lg" variant="default" className="mt-8 min-w-[220px]">
              <Link
                href={`/tarot/from/${result.id}`}
                onClick={() =>
                  trackClientEvent({
                    eventName: "tarot_entry_view",
                    path: `/result/${result.id}`,
                    metadata: { resultId: result.id },
                  })
                }
              >
                사주×타로 체험 시작
              </Link>
            </Button>
            <p className="mt-3 text-xs text-[var(--text-muted)]">일일 무료 체험</p>
          </OrnamentCard>
        </section>

        {products.length > 0 ? (
          <div className="mt-12 space-y-4">
            <p className="text-sm text-[var(--text-secondary)]">
              나의 사용설명서로 더 깊게 보기
            </p>
            {products.map((product) => (
              <div
                key={product.id}
                className="border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5"
              >
                <h3 className="display-title text-xl">{product.name}</h3>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  {product.shortDescription}
                </p>
                <p className="mt-3 text-lg font-semibold text-[var(--gold-light)]">
                  {formatKRW(product.salePrice)}
                </p>
                <Button asChild size="full" className="mt-4" variant="lock">
                  <Link href={`/product/${product.slug}?result=${result.id}`}>
                    {product.name} 보기
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        ) : null}

        {primary ? (
          <div className="fixed inset-x-0 bottom-[3.25rem] z-20 border-t border-[var(--border-subtle)] bg-[color-mix(in_oklab,var(--bg-primary)_94%,transparent)] px-5 py-3 backdrop-blur md:hidden">
            <div className="mx-auto flex max-w-lg items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                  {primary.name}
                </p>
                <p className="text-xs text-[var(--text-muted)]">
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
    </div>
  );
}
