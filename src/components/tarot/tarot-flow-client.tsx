"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { trackClientEvent } from "@/lib/analytics/client";
import {
  QUESTION_CATEGORIES,
  QUESTION_CATEGORY_LABELS,
  type QuestionCategory,
} from "@/lib/tarot/types";
import { MysticPage } from "@/components/mystic/celestial-background";
import { CategoryIcon } from "@/components/mystic/category-icon";
import { TarotCardBack, TarotCardFlip } from "@/components/mystic/tarot-card";
import { cn } from "@/lib/utils";

type Step = "question" | "draw" | "reveal" | "generating";

type DrawnPreview = {
  position: string;
  positionIndex: number;
  nameKo: string;
  nameEn: string;
  orientation: string;
  canonicalMeaning: string;
  keywords: string[];
};

const POSITION_LABEL: Record<string, string> = {
  CURRENT: "현재 상황",
  BLOCK: "걸림돌 / 놓치고 있는 점",
  DIRECTION: "지금 필요한 방향",
};

const CATEGORY_HINT: Record<QuestionCategory, string> = {
  money: "재물·수입·씀씀이의 방향",
  career: "일·이직·커리어 선택",
  love: "연애·관계의 흐름",
  relationships: "사람·소통·경계",
  advice: "지금 필요한 관점",
  custom: "직접 질문을 적어 주세요",
};

export function TarotFlowClient({ freeResultId }: { freeResultId: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("question");
  const [category, setCategory] = useState<QuestionCategory | null>(null);
  const [customQ, setCustomQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);
  const [readingId, setReadingId] = useState<string | null>(null);
  const [slotCount, setSlotCount] = useState(15);
  const [selected, setSelected] = useState<number[]>([]);
  const [draws, setDraws] = useState<DrawnPreview[]>([]);
  const [revealed, setRevealed] = useState(0);
  const [busy, setBusy] = useState(false);

  const slots = useMemo(
    () => Array.from({ length: slotCount }, (_, i) => i),
    [slotCount]
  );

  useEffect(() => {
    if (step !== "reveal" || draws.length === 0) return;
    const t0 = window.setTimeout(() => setRevealed(0), 0);
    const t1 = window.setTimeout(() => setRevealed(1), 200);
    const t2 = window.setTimeout(() => setRevealed(2), 700);
    const t3 = window.setTimeout(() => setRevealed(3), 1200);
    return () => {
      window.clearTimeout(t0);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [step, draws]);

  async function startReading() {
    if (!category) return;
    setBusy(true);
    setError(null);
    setRateLimited(false);
    trackClientEvent({
      eventName: "tarot_question_selected",
      path: `/tarot/from/${freeResultId}`,
      metadata: { category },
    });
    try {
      const res = await fetch("/api/tarot/readings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          freeResultId,
          questionCategory: category,
          questionText: category === "custom" ? customQ : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const limited =
          data.code === "RATE_LIMITED" || res.status === 429;
        setRateLimited(limited);
        setError(data.message ?? "시작할 수 없습니다.");
        if (limited) {
          trackClientEvent({
            eventName: "tarot_rate_limited_upsell_view",
            path: `/tarot/from/${freeResultId}`,
            metadata: { category },
          });
        }
        setBusy(false);
        return;
      }
      setReadingId(data.readingId);
      setSlotCount(data.presentationSlots?.length ?? 15);
      setStep("draw");
      trackClientEvent({
        eventName: "tarot_cards_started",
        path: `/tarot/reading/${data.readingId}`,
      });
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    }
    setBusy(false);
  }

  function toggleSlot(i: number) {
    setSelected((prev) => {
      if (prev.includes(i)) return prev.filter((x) => x !== i);
      if (prev.length >= 3) return prev;
      const next = [...prev, i];
      trackClientEvent({
        eventName: "tarot_card_selected",
        path: readingId ? `/tarot/reading/${readingId}` : undefined,
        metadata: { count: next.length },
      });
      return next;
    });
  }

  async function confirmDraw() {
    if (!readingId || selected.length !== 3) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/tarot/readings/${readingId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "select",
          slotIndices: selected as [number, number, number],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "카드 선택에 실패했습니다.");
        setBusy(false);
        return;
      }
      setDraws(data.draws);
      setStep("reveal");
      trackClientEvent({
        eventName: "tarot_draw_completed",
        path: `/tarot/reading/${readingId}`,
      });
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    }
    setBusy(false);
  }

  async function generate() {
    if (!readingId) return;
    setBusy(true);
    setStep("generating");
    setError(null);
    try {
      const res = await fetch(`/api/tarot/readings/${readingId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "리딩 생성에 실패했습니다.");
        setStep("reveal");
        setBusy(false);
        return;
      }
      trackClientEvent({
        eventName: "tarot_reading_generated",
        path: `/tarot/reading/${readingId}`,
      });
      router.replace(`/tarot/reading/${readingId}`);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
      setStep("reveal");
      trackClientEvent({
        eventName: "tarot_reading_failed",
        path: readingId ? `/tarot/reading/${readingId}` : undefined,
      });
    }
    setBusy(false);
  }

  return (
    <MysticPage rich className="min-h-[70vh]">
      <div className="mx-auto w-full max-w-lg px-5 pb-24 pt-8">
        {step === "question" ? (
          <section>
            <p className="hanja-accent mb-3">TAROT × 四柱</p>
            <h1 className="display-title text-[1.7rem] leading-snug md:text-3xl">
              지금,
              <br />
              가장 마음에 걸리는 건 무엇인가요?
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-[var(--text-secondary)]">
              카드가 당신의 고민을 함께 들여다봅니다.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {QUESTION_CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={cn(
                    "border px-4 py-4 text-left transition-colors",
                    category === c
                      ? "border-[var(--gold-primary)] bg-[var(--accent-soft)] shadow-[var(--glow-gold)]"
                      : "border-[var(--border-subtle)] hover:border-[var(--border-gold)]"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <CategoryIcon category={c} className="mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {QUESTION_CATEGORY_LABELS[c]}
                      </p>
                      <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                        {CATEGORY_HINT[c]}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {category === "custom" ? (
              <div className="mt-5">
                <label className="text-xs text-[var(--text-muted)]" htmlFor="customQ">
                  직접 질문
                </label>
                <textarea
                  id="customQ"
                  value={customQ}
                  onChange={(e) => setCustomQ(e.target.value.slice(0, 200))}
                  rows={3}
                  className="mt-2 w-full border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-gold)] focus:shadow-[var(--glow-gold)]"
                  placeholder="예: 지금 이직하는 게 나을까요? / 그 사람과 관계를 어떻게 바라보면 좋을까요?"
                />
                <p className="mt-1 text-right text-[11px] text-[var(--text-muted)]">
                  {[...customQ].length} / 200
                </p>
              </div>
            ) : null}

            {error && !rateLimited ? (
              <p role="alert" className="mt-4 text-sm text-[var(--error-text)]">
                {error}
              </p>
            ) : null}

            {rateLimited ? (
              <div
                role="status"
                className="mt-6 border border-[var(--border-gold)] bg-[var(--bg-card)] p-5"
              >
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {error}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                  내일 무료로 다시 뽑을 수도 있지만, 지금 당장 더 깊게 보고
                  싶다면 유료 사주 리포트로 이어가 보세요.
                </p>
                <Button asChild size="full" variant="default" className="mt-5">
                  <Link
                    href={`/result/${freeResultId}`}
                    onClick={() =>
                      trackClientEvent({
                        eventName: "tarot_rate_limited_upsell_click",
                        path: `/tarot/from/${freeResultId}`,
                        metadata: { target: "result" },
                      })
                    }
                  >
                    유료 사주 리포트 보기
                  </Link>
                </Button>
                <Button asChild size="full" variant="outline" className="mt-2">
                  <Link
                    href="/products"
                    onClick={() =>
                      trackClientEvent({
                        eventName: "tarot_rate_limited_upsell_click",
                        path: `/tarot/from/${freeResultId}`,
                        metadata: { target: "products" },
                      })
                    }
                  >
                    리포트 상품 둘러보기
                  </Link>
                </Button>
                <p className="mt-3 text-center text-[11px] text-[var(--text-muted)]">
                  무료 타로는 내일 다시 이용할 수 있어요.
                </p>
              </div>
            ) : (
              <Button
                className="mt-8"
                size="full"
                variant="default"
                disabled={
                  !category ||
                  busy ||
                  (category === "custom" && customQ.trim().length < 4)
                }
                onClick={() => void startReading()}
              >
                {busy ? "카드를 준비하는 중..." : "카드 뽑으러 가기"}
              </Button>
            )}
          </section>
        ) : null}

        {step === "draw" ? (
          <section>
            <p className="text-sm text-[var(--text-secondary)]">
              마음속으로 질문을 한 번 떠올려보세요.
            </p>
            <h2 className="display-title mt-2 text-xl md:text-2xl">
              끌리는 카드 세 장을 골라주세요.
            </h2>

            <div
              className="-mx-2 mt-8 flex justify-center overflow-x-auto px-2 pb-6 pt-4"
              role="listbox"
              aria-label="타로 카드 선택"
              aria-multiselectable="true"
            >
              <div className="relative flex h-44 min-w-[min(100%,520px)] items-end justify-center">
                {slots.map((i) => {
                  const order = selected.indexOf(i);
                  const isOn = order >= 0;
                  const mid = (slotCount - 1) / 2;
                  const rot = (i - mid) * 3.2;
                  const x = (i - mid) * 18;
                  return (
                    <TarotCardBack
                      key={i}
                      role="option"
                      aria-selected={isOn}
                      aria-label={`카드 ${i + 1}${isOn ? `, ${order + 1}번째로 선택됨` : ""}`}
                      onClick={() => toggleSlot(i)}
                      selected={isOn}
                      order={isOn ? order + 1 : undefined}
                      className={cn(
                        "absolute bottom-0 h-36 w-[4.4rem]",
                        isOn ? "z-20" : "z-10"
                      )}
                      style={{
                        transform: `translateX(${x}px) translateY(${isOn ? -14 : 0}px) rotate(${rot}deg)`,
                      }}
                    />
                  );
                })}
              </div>
            </div>

            <div className="mt-2 grid grid-cols-3 gap-2">
              {[0, 1, 2].map((slot) => (
                <div
                  key={slot}
                  className="border border-[var(--border-subtle)] py-3 text-center text-[11px] text-[var(--text-muted)]"
                >
                  {selected[slot] !== undefined
                    ? `${slot + 1}번째 카드`
                    : `${slot + 1}번째`}
                </div>
              ))}
            </div>

            {error ? (
              <p role="alert" className="mt-3 text-sm text-[var(--error-text)]">
                {error}
              </p>
            ) : null}

            <Button
              size="full"
              variant="default"
              className="mt-6"
              disabled={selected.length !== 3 || busy}
              onClick={() => void confirmDraw()}
            >
              {busy ? "확인 중..." : "선택한 카드 확인하기"}
            </Button>
          </section>
        ) : null}

        {step === "reveal" || step === "generating" ? (
          <section>
            <p className="hanja-accent mb-2">YOUR DRAW</p>
            <h2 className="display-title text-xl">당신이 고른 세 장의 카드</h2>
            <div className="mt-6 space-y-5">
              {draws.map((d, idx) => {
                const show = revealed > idx;
                return (
                  <article
                    key={d.positionIndex}
                    className="border border-[var(--border-subtle)] bg-[var(--bg-card)]/80 p-4"
                  >
                    <p className="text-xs text-[var(--gold-primary)]">
                      {POSITION_LABEL[d.position] ?? d.position}
                    </p>
                    <div className="mt-3 flex items-start gap-4">
                      <TarotCardFlip
                        revealed={show}
                        nameKo={d.nameKo}
                        nameEn={d.nameEn}
                        orientation={d.orientation}
                      />
                      <div>
                        <p className="text-sm font-semibold text-[var(--text-primary)]">
                          {d.nameKo}{" "}
                          <span className="text-xs font-normal text-[var(--text-muted)]">
                            {d.orientation === "UPRIGHT" ? "정방향" : "역방향"}
                          </span>
                        </p>
                        <p className="mt-1 text-xs text-[var(--text-muted)]">{d.nameEn}</p>
                        {show ? (
                          <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                            {d.canonicalMeaning}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {error ? (
              <p role="alert" className="mt-4 text-sm text-[var(--error-text)]">
                {error}
              </p>
            ) : null}

            <Button
              size="full"
              variant="default"
              className="mt-8"
              disabled={busy || revealed < 3}
              onClick={() => void generate()}
            >
              {step === "generating" || busy
                ? "사주와 카드를 연결하는 중..."
                : "사주 × 타로 교차 리딩 보기"}
            </Button>
          </section>
        ) : null}
      </div>
    </MysticPage>
  );
}
