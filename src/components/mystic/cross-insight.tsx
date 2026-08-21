import { OrnamentCard } from "@/components/mystic/ornament-card";
import { CelestialBackground } from "@/components/mystic/celestial-background";
import { cn } from "@/lib/utils";
import { formatFortuneEvidenceForDisplay } from "@/lib/presentation/format-evidence-label";

export function CrossInsightCard({
  headline,
  body,
  fortuneBasis,
  tarotBasis,
  className,
}: {
  headline: string;
  body: string;
  fortuneBasis: string[];
  tarotBasis: string[];
  className?: string;
}) {
  const fortuneLabels = formatFortuneEvidenceForDisplay(fortuneBasis);
  return (
    <div className={cn("relative", className)} data-share-card="cross-insight">
      <CelestialBackground intensity="rich" className="opacity-70" />
      <OrnamentCard glow className="relative px-6 py-9 text-center md:px-8">
        <p className="text-xs tracking-[0.3em] text-[var(--gold-primary)]">運의結</p>
        <h2 className="display-title mt-2 text-xl">두 흐름이 만나는 지점</h2>
        <p className="display-title mt-6 text-lg leading-snug text-[var(--gold-light)] md:text-xl">
          {headline}
        </p>
        <p className="mt-5 text-left text-sm leading-relaxed text-[var(--text-secondary)]">
          {body}
        </p>
        <div className="mt-6 border-t border-[var(--border-subtle)] pt-4 text-left text-[11px] leading-relaxed text-[var(--text-muted)]">
          <p className="tracking-wide text-[var(--gold-muted)]">왜 이렇게 읽었나요?</p>
          {fortuneLabels.length > 0 ? (
            <p className="mt-2">사주 근거: {fortuneLabels.join(" · ")}</p>
          ) : null}
          {tarotBasis.length > 0 ? (
            <p className="mt-1">카드 근거: {tarotBasis.join(" · ")}</p>
          ) : null}
        </div>
      </OrnamentCard>
    </div>
  );
}

export function CrossFlowBridge({
  fortuneTitle,
  fortuneSummary,
  fortuneEvidence,
}: {
  fortuneTitle: string;
  fortuneSummary: string;
  fortuneEvidence?: string[];
}) {
  const evidenceLabels = fortuneEvidence
    ? formatFortuneEvidenceForDisplay(fortuneEvidence)
    : [];
  return (
    <section className="space-y-8">
      <div>
        <p className="text-xs tracking-[0.2em] text-[var(--gold-primary)]">四柱</p>
        <h2 className="display-title mt-1 text-xl">당신의 타고난 패턴</h2>
        <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">{fortuneTitle}</p>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
          {fortuneSummary}
        </p>
        {evidenceLabels.length > 0 ? (
          <p className="mt-3 text-[11px] leading-relaxed text-[var(--text-muted)]">
            {evidenceLabels.join(" · ")}
          </p>
        ) : null}
      </div>

      <p className="text-center text-lg text-[var(--gold-muted)]" aria-hidden>
        ×
      </p>

      <div>
        <p className="text-xs tracking-[0.2em] text-[var(--gold-primary)]">TAROT</p>
        <h2 className="display-title mt-1 text-xl">카드가 보여주는 지금의 흐름</h2>
        <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
          세 장의 카드는 현재의 분위기, 놓치기 쉬운 걸림돌, 그리고 지금 필요한
          방향을 가리킵니다.
        </p>
      </div>

      <p className="text-center text-lg text-[var(--gold-muted)]" aria-hidden>
        ↓
      </p>
    </section>
  );
}
