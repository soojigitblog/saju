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
import { FeedbackPanel } from "@/components/feedback/feedback-panel";
import { ShareButton } from "@/components/share/share-button";
import { HookLineTitle } from "@/components/result/hook-line-title";

const LOCKED_DOMAINS = [
  {
    id: "money",
    label: "돈과 자원",
    categories: ["money"],
    fallback: "돈·시간·에너지를 어디에 쓸지, 지금의 기준이 어떤 선택으로 이어지는지 읽어드립니다.",
  },
  {
    id: "career",
    label: "일과 역할",
    categories: ["career"],
    fallback: "내가 맡는 역할에서 강하게 드러나는 방식과, 일을 이어갈 때 필요한 기준을 살펴봅니다.",
  },
  {
    id: "love",
    label: "사랑과 관계",
    categories: ["love", "relationships"],
    fallback: "가까운 관계에서 반복하기 쉬운 반응과, 편안한 관계를 만드는 기준을 함께 봅니다.",
  },
  {
    id: "timing",
    label: "인생의 흐름",
    categories: ["timing"],
    fallback: "나이의 구간마다 어떤 주제가 전면에 나타나는지, 변화가 집중되는 시기를 정리합니다.",
  },
] as const;

const SIDEBAR = [
  { id: "summary", label: "결의 한 줄" },
  { id: "outer", label: "겉과 속" },
  { id: "elements", label: "오행 구조" },
  { id: "themes", label: "핵심 테마" },
  { id: "previews", label: "잠긴 리포트" },
  { id: "full-report", label: "전체 리포트" },
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
  const coreThemes = result.keywords.slice(0, 2);
  const lockedPreviews = LOCKED_DOMAINS.map((domain) => ({
    ...domain,
    preview:
      result.previews.find((item) =>
        (domain.categories as readonly string[]).includes(item.category)
      )?.preview ?? domain.fallback,
  }));

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
          <section id="elements" className="mt-10 scroll-mt-24">
            <p className="hanja-accent mb-2 text-center">五行</p>
            <h2 className="display-title text-center text-xl">당신을 이루는 다섯 가지 기운</h2>
            <ElementSealRow items={seals} className="mt-6" />
          </section>
        ) : null}

        {/* Keywords */}
        <section id="themes" className="mt-8 scroll-mt-24">
          <p className="mb-3 text-center text-xs text-[var(--text-muted)]">지금 가장 먼저 읽을 두 가지 테마</p>
          <div className="flex flex-wrap justify-center gap-2">
            {coreThemes.map((k) => (
              <KeywordTag key={k}>{k}</KeywordTag>
            ))}
          </div>
        </section>

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

        {/* Locked previews */}
        <section id="previews" className="mt-12 scroll-mt-24 space-y-4">
          <div>
            <p className="hanja-accent">LOCKED PREVIEW</p>
            <h2 className="display-title mt-2 text-xl">전체 리포트에서 이어지는 질문</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
              지금 보이는 신호가 삶의 각 영역에서 어떻게 이어지는지, 전체 인생 리포트에서 확인합니다.
            </p>
          </div>
          {lockedPreviews.map((preview) => (
            <article
              key={preview.id}
              className="relative overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-card)]/70 p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="display-title text-lg">
                  {preview.label}
                </h2>
                <Lock className="mt-1 h-4 w-4 text-[var(--gold-primary)]" aria-hidden />
              </div>
              <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                {preview.preview}
              </p>
              <div className="relative mt-4">
                <p className="select-none text-sm leading-relaxed text-[var(--text-muted)] blur-[2.5px]">
                  개인의 사주 구조와 현재의 신호를 함께 읽어, 시기별 선택과 행동의 기준까지 이어집니다.
                </p>
                <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-[var(--bg-primary)] via-[var(--bg-primary)]/70 to-transparent pb-1">
                  <p className="text-[11px] text-[var(--gold-muted)]">전체 인생 리포트에서 열립니다</p>
                </div>
              </div>
            </article>
          ))}
        </section>

        {primary ? (
          <section id="full-report" className="mt-10 scroll-mt-24">
            <OrnamentCard glow className="p-6 text-center md:p-8">
              <p className="hanja-accent">FULL LIFE REPORT</p>
              <h2 className="display-title mt-3 text-2xl leading-snug">내 전체 인생 리포트 열기</h2>
              <p className="mt-4 text-sm leading-relaxed text-[var(--text-secondary)]">
                나라는 사람부터 인생의 흐름, 돈과 커리어, 사랑과 관계,
                <br />사주×타로 교차리딩과 행동 가이드까지 한 권의 리포트로 읽습니다.
              </p>
              <p className="mt-5 text-lg font-semibold text-[var(--gold-light)]">{formatKRW(primary.salePrice)}</p>
              <Button asChild size="lg" variant="lock" className="mt-6 min-w-[240px]">
                <Link href={`/product/${primary.slug}?result=${result.id}`}>내 전체 인생 리포트 열기</Link>
              </Button>
            </OrnamentCard>
          </section>
        ) : null}

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
                  전체 리포트
                </Link>
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
