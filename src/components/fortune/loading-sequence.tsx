"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MysticPage } from "@/components/mystic/celestial-background";
import { BrandMark } from "@/components/mystic/brand-mark";

const steps = [
  "태어난 날의 기운을 살펴보고 있습니다",
  "四柱를 배열하고 있습니다",
  "五行의 균형을 읽고 있습니다",
  "당신에게 가장 강하게 나타나는 흐름을 찾고 있습니다",
];

export function LoadingSequence({ freeResultId }: { freeResultId: string }) {
  const router = useRouter();
  const [active, setActive] = useState(0);
  const [overrideLabel, setOverrideLabel] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const polls = useRef(0);

  const statusLabel =
    overrideLabel ?? steps[Math.min(active, steps.length - 1)]!;

  useEffect(() => {
    const visual = [
      window.setTimeout(() => setActive(1), 700),
      window.setTimeout(() => setActive(2), 1600),
      window.setTimeout(() => setActive(3), 2600),
    ];
    return () => visual.forEach((t) => window.clearTimeout(t));
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    async function poll() {
      if (cancelled) return;
      polls.current += 1;
      if (polls.current > 90) {
        setOverrideLabel(
          "아직 결과를 생성하고 있습니다. 잠시 후 다시 확인해 주세요."
        );
        setFailed(true);
        return;
      }

      try {
        const res = await fetch(`/api/fortune/free/${freeResultId}/status`, {
          cache: "no-store",
          credentials: "same-origin",
        });
        const data = (await res.json()) as {
          status?: string;
          redirectTo?: string;
          message?: string;
          code?: string;
        };

        if (!res.ok) {
          if (res.status === 403 || res.status === 404) {
            setOverrideLabel(data.message ?? "결과를 확인할 수 없습니다.");
            setFailed(true);
            return;
          }
        }

        if (data.status === "COMPLETED" && data.redirectTo) {
          router.replace(data.redirectTo);
          return;
        }
        if (data.status === "FAILED") {
          setFailed(true);
          setOverrideLabel("결과 생성 중 문제가 발생했습니다.");
          return;
        }

        if (data.status === "GENERATING") {
          setActive((v) => Math.max(v, 2));
        } else if (data.status === "PENDING") {
          setActive((v) => Math.max(v, 1));
        }
      } catch {
        setOverrideLabel("연결을 확인하는 중입니다.");
      }

      timer = window.setTimeout(poll, 1500);
    }

    void poll();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [freeResultId, router]);

  async function onRetry() {
    setRetrying(true);
    setFailed(false);
    setOverrideLabel("다시 생성을 시도하고 있습니다.");
    polls.current = 0;
    try {
      const res = await fetch(`/api/fortune/free/${freeResultId}/retry`, {
        method: "POST",
      });
      const data = (await res.json()) as {
        status?: string;
        freeResultId?: string;
        message?: string;
      };
      if (!res.ok) {
        setFailed(true);
        setOverrideLabel(data.message ?? "다시 시도하지 못했습니다.");
        setRetrying(false);
        return;
      }
      if (data.status === "COMPLETED") {
        router.replace(`/result/${freeResultId}`);
        return;
      }
      setOverrideLabel(null);
      setRetrying(false);
    } catch {
      setFailed(true);
      setOverrideLabel("네트워크 오류가 발생했습니다.");
      setRetrying(false);
    }
  }

  return (
    <MysticPage rich className="min-h-[75vh]">
      <div className="mx-auto flex min-h-[70vh] w-full max-w-lg flex-col items-center justify-center px-5 py-16">
        <div className="relative flex h-36 w-36 items-center justify-center">
          <svg
            className="absolute inset-0 h-full w-full text-[var(--gold-primary)] motion-safe:animate-slow-spin"
            viewBox="0 0 140 140"
            fill="none"
            aria-hidden
          >
            <circle cx="70" cy="70" r="62" stroke="currentColor" strokeWidth="0.6" opacity="0.35" />
            <circle
              cx="70"
              cy="70"
              r="48"
              stroke="currentColor"
              strokeWidth="0.5"
              opacity="0.25"
              strokeDasharray="4 6"
            />
            <circle cx="70" cy="8" r="2.5" fill="currentColor" opacity="0.7" />
          </svg>
          <BrandMark size={48} />
        </div>

        <p className="display-title mt-10 text-center text-2xl leading-snug">
          당신의 사주를
          <br />
          풀어보고 있습니다
        </p>
        <p
          className="mt-4 max-w-xs text-center text-sm leading-relaxed text-[var(--text-secondary)]"
          aria-live="polite"
        >
          {statusLabel}
        </p>

        <ul className="mt-10 w-full max-w-sm space-y-3">
          {steps.map((step, index) => {
            const done = index < active;
            const current = index === active && !failed;
            return (
              <li
                key={step}
                className={`flex items-start gap-3 text-sm transition-opacity ${
                  done || current ? "opacity-100" : "opacity-30"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border text-[10px] ${
                    done
                      ? "border-[var(--gold-primary)] text-[var(--gold-light)]"
                      : current
                        ? "border-[var(--gold-primary)] text-[var(--gold-primary)]"
                        : "border-[var(--border-subtle)] text-[var(--text-muted)]"
                  }`}
                >
                  {done ? "·" : index + 1}
                </span>
                <span
                  className={
                    current ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
                  }
                >
                  {step}
                </span>
              </li>
            );
          })}
        </ul>

        {failed ? (
          <div className="mt-10 w-full max-w-xs space-y-3">
            <Button size="full" onClick={onRetry} disabled={retrying}>
              {retrying ? "다시 시도 중..." : "다시 시도"}
            </Button>
            <Button size="full" variant="outline" onClick={() => router.push("/fortune")}>
              입력으로 돌아가기
            </Button>
          </div>
        ) : null}
      </div>
    </MysticPage>
  );
}
