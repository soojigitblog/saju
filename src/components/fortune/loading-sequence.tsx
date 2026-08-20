"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { BaguaSpinner } from "@/components/mystic/bagua-spinner";

const steps = [
  "생년월일 확인",
  "사주 원국 구성",
  "오행의 흐름 분석",
  "운의 흐름 해석",
];

export function LoadingSequence({ freeResultId }: { freeResultId: string }) {
  const router = useRouter();
  const [active, setActive] = useState(0);
  const [statusLabel, setStatusLabel] = useState("당신의 사주를 풀어보고 있습니다.");
  const [failed, setFailed] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const polls = useRef(0);

  useEffect(() => {
    const visual = [
      window.setTimeout(() => setActive(1), 600),
      window.setTimeout(() => setActive(2), 1400),
      window.setTimeout(() => setActive(3), 2200),
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
        setStatusLabel("아직 결과를 생성하고 있습니다. 잠시 후 다시 확인해 주세요.");
        setFailed(true);
        return;
      }

      try {
        const res = await fetch(`/api/fortune/free/${freeResultId}/status`, {
          cache: "no-store",
        });
        const data = (await res.json()) as {
          status?: string;
          redirectTo?: string;
          message?: string;
          code?: string;
        };

        if (!res.ok) {
          if (res.status === 403 || res.status === 404) {
            setStatusLabel(data.message ?? "결과를 확인할 수 없습니다.");
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
          setStatusLabel("결과 생성 중 문제가 발생했습니다.");
          return;
        }

        if (data.status === "GENERATING") {
          setStatusLabel("운의 흐름을 해석하고 있습니다.");
          setActive((v) => Math.max(v, 2));
        } else if (data.status === "PENDING") {
          setStatusLabel("사주 원국을 구성하고 있습니다.");
          setActive((v) => Math.max(v, 1));
        }
      } catch {
        setStatusLabel("연결을 확인하는 중입니다.");
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
    setStatusLabel("다시 생성을 시도하고 있습니다.");
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
        setStatusLabel(data.message ?? "다시 시도하지 못했습니다.");
        setRetrying(false);
        return;
      }
      if (data.status === "COMPLETED") {
        router.replace(`/result/${freeResultId}`);
        return;
      }
      setRetrying(false);
    } catch {
      setFailed(true);
      setStatusLabel("네트워크 오류가 발생했습니다.");
      setRetrying(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-lg flex-col items-center justify-center px-5 py-16">
      <BaguaSpinner size={140} />

      <p className="display-title mt-10 text-center text-2xl">
        당신의 사주를
        <br />
        풀어보고 있습니다
      </p>
      <p className="mt-3 text-center text-sm text-[var(--ink-muted)]" aria-live="polite">
        {statusLabel}
      </p>

      <ul className="mt-10 w-full max-w-xs space-y-4">
        {steps.map((step, index) => {
          const done = index < active;
          const current = index === active && !failed;
          return (
            <li
              key={step}
              className={`flex items-center gap-3 text-sm transition-opacity ${
                done || current ? "opacity-100" : "opacity-35"
              }`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-sm text-xs ${
                  done
                    ? "border border-[var(--gold)] bg-[var(--accent-soft)] text-[var(--gold)]"
                    : current
                      ? "animate-pulse border border-[var(--gold)] text-[var(--gold)]"
                      : "border border-[var(--line)] text-[var(--ink-faint)]"
                }`}
              >
                {done ? "✓" : "○"}
              </span>
              <span className={current ? "text-[var(--ink-bright)]" : "text-[var(--ink-muted)]"}>
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
  );
}
