"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Friend-test bug reporter.
 * Mount-only to avoid hydration mismatches; no global error capture overlay.
 */
export function ClientIssueReporter() {
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) return null;

  async function submit() {
    const text = message.trim();
    if (text.length < 4) {
      setError("어떤 문제인지 짧게라도 적어 주세요.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/client-issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "BUG_REPORT",
          message: text,
          details: details.trim() || null,
          path: window.location.pathname,
          metadata: {
            href: window.location.href,
            viewport: `${window.innerWidth}x${window.innerHeight}`,
          },
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          message?: string;
        };
        setError(data.message ?? "전송에 실패했습니다.");
        setBusy(false);
        return;
      }
      setDone(true);
      setMessage("");
      setDetails("");
      setBusy(false);
      window.setTimeout(() => {
        setOpen(false);
        setDone(false);
      }, 1400);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onPointerDown={(e) => {
          e.preventDefault();
          setOpen(true);
          setDone(false);
          setError("");
        }}
        className="fixed bottom-6 right-4 z-[60] rounded-sm border border-[#d4a84f] bg-[#0d1b2a] px-3 py-2 text-xs font-medium text-[#e8c978] shadow-md"
        aria-label="버그 제보"
      >
        버그 제보
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/55 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bug-report-title"
          onPointerDown={(e) => {
            if (e.target === e.currentTarget && !busy) setOpen(false);
          }}
        >
          <div className="w-full max-w-md border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 shadow-xl">
            <h2
              id="bug-report-title"
              className="display-title text-xl text-[var(--text-primary)]"
            >
              버그 제보
            </h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              이상한 점만 짧게 남겨 주세요. DB에 바로 저장됩니다.
            </p>

            {done ? (
              <p className="mt-6 text-sm text-[var(--gold-light)]">
                제보해 주셔서 감사합니다.
              </p>
            ) : (
              <>
                <label className="mt-5 block text-xs text-[var(--text-muted)]">
                  무슨 일이 있었나요?
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value.slice(0, 500))}
                    rows={3}
                    className="mt-2 w-full border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-gold)]"
                    placeholder="예: 성별 버튼이 안 눌려요"
                    disabled={busy}
                  />
                </label>
                <label className="mt-3 block text-xs text-[var(--text-muted)]">
                  더 알려줄 내용 (선택)
                  <textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value.slice(0, 2000))}
                    rows={2}
                    className="mt-2 w-full border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-gold)]"
                    placeholder="예: 아이폰 / 사파리"
                    disabled={busy}
                  />
                </label>
                {error ? (
                  <p className="mt-3 text-sm text-[var(--error-text)]" role="alert">
                    {error}
                  </p>
                ) : null}
                <div className="mt-5 flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1"
                    disabled={busy}
                    onClick={() => setOpen(false)}
                  >
                    닫기
                  </Button>
                  <Button
                    type="button"
                    className="flex-1"
                    disabled={busy}
                    onClick={() => void submit()}
                  >
                    {busy ? "보내는 중..." : "보내기"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
