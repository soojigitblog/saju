"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { OrnamentCard } from "@/components/mystic/ornament-card";
import { cn } from "@/lib/utils";
import { trackClientEvent } from "@/lib/analytics/client";
import {
  FORTUNE_FEEDBACK_TAGS,
  MOST_RESONANT_LABELS,
  TAROT_FEEDBACK_LABELS,
  type FeedbackTargetType,
  type MoreFunChoice,
  type MostResonantChoice,
} from "@/lib/feedback/constants";

type FeedbackPanelProps = {
  targetType: FeedbackTargetType;
  targetId: string;
  /** When true, show thank-you immediately (e.g. legacy tarot GET). */
  initiallyDone?: boolean;
  className?: string;
};

async function postFeedback(body: Record<string, unknown>) {
  const res = await fetch("/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as {
    analytics?: Record<string, unknown>;
    message?: string;
  };
  return { ok: res.ok, analytics: json.analytics, message: json.message };
}

function RatingRow({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (n: number) => void;
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={cn(
            "flex h-11 min-w-11 items-center justify-center border text-sm transition-colors",
            value === n
              ? "border-[var(--gold-primary)] bg-[var(--accent-soft)] text-[var(--gold-light)]"
              : "border-[var(--border-subtle)] text-[var(--text-muted)]"
          )}
          aria-pressed={value === n}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function TagList({
  options,
  selected,
  onToggle,
}: {
  options: readonly string[];
  selected: string[];
  multi?: boolean;
  onToggle: (label: string) => void;
}) {
  return (
    <div className="mt-3 grid gap-2">
      {options.map((label) => {
        const active = selected.includes(label);
        return (
          <button
            key={label}
            type="button"
            onClick={() => onToggle(label)}
            className={cn(
              "min-h-11 border px-3 py-2.5 text-left text-sm transition-colors",
              active
                ? "border-[var(--gold-primary)] bg-[var(--accent-soft)] text-[var(--text-primary)]"
                : "border-[var(--border-subtle)] text-[var(--text-secondary)]"
            )}
            aria-pressed={active}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function Thanks() {
  return (
    <p className="text-center text-xs tracking-wide text-[var(--text-muted)]">
      피드백 감사합니다.
    </p>
  );
}

export function FeedbackPanel({
  targetType,
  targetId,
  initiallyDone = false,
  className,
}: FeedbackPanelProps) {
  const [done, setDone] = useState(initiallyDone);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initiallyDone) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/feedback?targetType=${encodeURIComponent(targetType)}&targetId=${encodeURIComponent(targetId)}`,
          { cache: "no-store" }
        );
        if (!res.ok) return;
        const json = (await res.json()) as { feedback?: { submitted?: boolean } | null };
        if (!cancelled && json.feedback?.submitted) setDone(true);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [targetType, targetId, initiallyDone]);

  if (done) {
    return (
      <section className={cn("mt-10", className)}>
        <Thanks />
      </section>
    );
  }

  if (targetType === "FORTUNE") {
    return (
      <FortuneFeedbackForm
        targetId={targetId}
        className={className}
        loading={loading}
        error={error}
        onSubmit={async (rating, tags) => {
          setLoading(true);
          setError(null);
          const result = await postFeedback({
            targetType: "FORTUNE",
            targetId,
            rating,
            tags,
          });
          setLoading(false);
          if (!result.ok) {
            setError(result.message ?? "잠시 후 다시 시도해 주세요.");
            return;
          }
          trackClientEvent({
            eventName: "fortune_feedback_submitted",
            path: `/result/${targetId}`,
            metadata: result.analytics ?? { rating, tagCodes: [] },
            skipDedupe: true,
          });
          setDone(true);
        }}
      />
    );
  }

  if (targetType === "TAROT") {
    return (
      <TarotFeedbackForm
        targetId={targetId}
        className={className}
        loading={loading}
        error={error}
        onSubmit={async (rating, label) => {
          setLoading(true);
          setError(null);
          const result = await postFeedback({
            targetType: "TAROT",
            targetId,
            rating,
            tags: [label],
          });
          setLoading(false);
          if (!result.ok) {
            setError(result.message ?? "잠시 후 다시 시도해 주세요.");
            return;
          }
          trackClientEvent({
            eventName: "tarot_feedback_submitted",
            path: `/tarot/reading/${targetId}`,
            metadata: result.analytics ?? { rating, tagCodes: [] },
            skipDedupe: true,
          });
          setDone(true);
        }}
      />
    );
  }

  return (
    <CrossFeedbackForm
      targetId={targetId}
      className={className}
      loading={loading}
      error={error}
      onSubmit={async (moreFun, mostResonant) => {
        setLoading(true);
        setError(null);
        const result = await postFeedback({
          targetType: "CROSS_READING",
          targetId,
          moreFunThanSajuAlone: moreFun,
          mostResonant,
        });
        setLoading(false);
        if (!result.ok) {
          setError(result.message ?? "잠시 후 다시 시도해 주세요.");
          return;
        }
        trackClientEvent({
          eventName: "cross_feedback_submitted",
          path: `/tarot/reading/${targetId}`,
          metadata: result.analytics ?? {
            moreFunThanSajuAlone: moreFun,
            mostResonant,
          },
          skipDedupe: true,
        });
        setDone(true);
      }}
    />
  );
}

function FortuneFeedbackForm({
  targetId,
  className,
  loading,
  error,
  onSubmit,
}: {
  targetId: string;
  className?: string;
  loading: boolean;
  error: string | null;
  onSubmit: (rating: number, tags: string[]) => void | Promise<void>;
}) {
  const [rating, setRating] = useState<number | null>(null);
  const [tags, setTags] = useState<string[]>([]);

  function toggleTag(label: string) {
    setTags((prev) =>
      prev.includes(label) ? prev.filter((t) => t !== label) : [...prev, label]
    );
  }

  return (
    <section className={cn("mt-10", className)} data-feedback="fortune" data-target={targetId}>
      <OrnamentCard density="corners" className="p-5 sm:p-6">
        <p className="text-xs tracking-[0.2em] text-[var(--gold-primary)]">한 줄 소감</p>
        <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
          이 사주 결과, 얼마나 나와 비슷했나요?
        </p>
        <RatingRow value={rating} onChange={setRating} />
        {rating ? (
          <>
            <p className="mt-5 text-sm text-[var(--text-secondary)]">어떤 느낌이었나요?</p>
            <TagList
              options={FORTUNE_FEEDBACK_TAGS}
              selected={tags}
              multi
              onToggle={toggleTag}
            />
            <Button
              className="mt-4"
              size="full"
              variant="outline"
              disabled={loading || tags.length === 0}
              onClick={() => void onSubmit(rating, tags)}
            >
              {loading ? "보내는 중…" : "피드백 보내기"}
            </Button>
          </>
        ) : null}
        {error ? (
          <p className="mt-3 text-xs text-[var(--error-text)]">{error}</p>
        ) : null}
      </OrnamentCard>
    </section>
  );
}

function TarotFeedbackForm({
  targetId,
  className,
  loading,
  error,
  onSubmit,
}: {
  targetId: string;
  className?: string;
  loading: boolean;
  error: string | null;
  onSubmit: (rating: number, label: string) => void | Promise<void>;
}) {
  const [rating, setRating] = useState<number | null>(null);
  const [label, setLabel] = useState<string | null>(null);

  return (
    <section className={cn("mt-12", className)} data-feedback="tarot" data-target={targetId}>
      <p className="text-sm text-[var(--text-secondary)]">
        이번 리딩은 얼마나 와닿았나요?
      </p>
      <RatingRow value={rating} onChange={setRating} />
      {rating ? (
        <>
          <p className="mt-5 text-sm text-[var(--text-secondary)]">어떤 느낌이었나요?</p>
          <TagList
            options={TAROT_FEEDBACK_LABELS}
            selected={label ? [label] : []}
            multi={false}
            onToggle={(l) => setLabel(l)}
          />
          <Button
            className="mt-4"
            size="full"
            variant="outline"
            disabled={loading || !label}
            onClick={() => label && void onSubmit(rating, label)}
          >
            {loading ? "보내는 중…" : "피드백 보내기"}
          </Button>
        </>
      ) : null}
      {error ? (
        <p className="mt-3 text-xs text-[var(--error-text)]">{error}</p>
      ) : null}
    </section>
  );
}

function CrossFeedbackForm({
  targetId,
  className,
  loading,
  error,
  onSubmit,
}: {
  targetId: string;
  className?: string;
  loading: boolean;
  error: string | null;
  onSubmit: (
    moreFun: MoreFunChoice,
    mostResonant: MostResonantChoice | null
  ) => void | Promise<void>;
}) {
  const [moreFun, setMoreFun] = useState<MoreFunChoice | null>(null);
  const [mostResonant, setMostResonant] = useState<MostResonantChoice | null>(
    null
  );

  return (
    <section className={cn("mt-10", className)} data-feedback="cross" data-target={targetId}>
      <OrnamentCard density="corners" className="p-5 sm:p-6">
        <p className="text-xs tracking-[0.2em] text-[var(--gold-primary)]">한 줄 소감</p>
        <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
          사주만 봤을 때보다 타로까지 함께 보니 더 재미있었나요?
        </p>
        <div className="mt-4 grid gap-2">
          {(
            [
              ["YES", "네, 더 재미있었어요"],
              ["NO", "아니요, 사주만으로 충분했어요"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setMoreFun(value)}
              className={cn(
                "min-h-11 border px-3 py-2.5 text-left text-sm transition-colors",
                moreFun === value
                  ? "border-[var(--gold-primary)] bg-[var(--accent-soft)] text-[var(--text-primary)]"
                  : "border-[var(--border-subtle)] text-[var(--text-secondary)]"
              )}
              aria-pressed={moreFun === value}
            >
              {label}
            </button>
          ))}
        </div>

        {moreFun ? (
          <>
            <p className="mt-6 text-sm text-[var(--text-secondary)]">
              둘 중 무엇이 더 와닿았나요?
            </p>
            <div className="mt-3 grid gap-2">
              {(
                Object.entries(MOST_RESONANT_LABELS) as Array<
                  [MostResonantChoice, string]
                >
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMostResonant(value)}
                  className={cn(
                    "min-h-11 border px-3 py-2.5 text-left text-sm transition-colors",
                    mostResonant === value
                      ? "border-[var(--gold-primary)] bg-[var(--accent-soft)] text-[var(--text-primary)]"
                      : "border-[var(--border-subtle)] text-[var(--text-secondary)]"
                  )}
                  aria-pressed={mostResonant === value}
                >
                  {label}
                </button>
              ))}
            </div>
            <Button
              className="mt-4"
              size="full"
              variant="outline"
              disabled={loading}
              onClick={() => void onSubmit(moreFun, mostResonant)}
            >
              {loading ? "보내는 중…" : "피드백 보내기"}
            </Button>
          </>
        ) : null}
        {error ? (
          <p className="mt-3 text-xs text-[var(--error-text)]">{error}</p>
        ) : null}
      </OrnamentCard>
    </section>
  );
}
