"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.7;

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read failed"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("decode failed"));
      img.onload = () => {
        const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("no canvas context"));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function RefundRequestForm({
  orderId,
  onClose,
}: {
  orderId: string;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [screenshotError, setScreenshotError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(file: File | null) {
    setScreenshotError("");
    if (!file) {
      setScreenshot(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setScreenshotError("이미지 파일만 첨부할 수 있어요.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setScreenshotError("파일이 너무 커요 (15MB 이하).");
      return;
    }
    try {
      const dataUrl = await compressImage(file);
      setScreenshot(dataUrl);
    } catch {
      setScreenshotError("이미지를 처리하지 못했어요. 다른 파일로 시도해 주세요.");
    }
  }

  async function submit() {
    const text = reason.trim();
    if (text.length < 5) {
      setError("환불 사유를 조금 더 자세히 적어 주세요.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/refund-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          reason: text,
          screenshotDataUrl: screenshot,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        setError(data.message ?? "전송에 실패했습니다.");
        setBusy(false);
        return;
      }
      setDone(true);
      setBusy(false);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/55 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="refund-request-title"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 shadow-xl">
        <h2 id="refund-request-title" className="display-title text-xl text-[var(--text-primary)]">
          환불 신청
        </h2>

        {done ? (
          <>
            <p className="mt-6 text-sm text-[var(--gold-light)]">
              환불 신청이 접수되었습니다. 확인 후 안내해 드릴게요.
            </p>
            <Button type="button" className="mt-5 w-full" onClick={onClose}>
              닫기
            </Button>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              사유와 (필요하다면) 화면 캡처를 함께 보내주시면 확인 후 환불을
              진행해 드려요.
            </p>

            <label className="mt-5 block text-xs text-[var(--text-muted)]">
              환불 사유
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value.slice(0, 1000))}
                rows={4}
                className="mt-2 w-full border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-gold)]"
                placeholder="예: 기대한 내용과 달라서 환불을 원해요"
                disabled={busy}
              />
            </label>

            <label className="mt-3 block text-xs text-[var(--text-muted)]">
              화면 캡처 첨부 (선택)
              <input
                type="file"
                accept="image/*"
                onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
                className="mt-2 block w-full text-xs text-[var(--text-secondary)]"
                disabled={busy}
              />
            </label>
            {screenshot ? (
              <img
                src={screenshot}
                alt="첨부한 화면 캡처 미리보기"
                className="mt-2 max-h-32 rounded border border-[var(--border-subtle)]"
              />
            ) : null}
            {screenshotError ? (
              <p className="mt-2 text-xs text-[var(--error-text)]">{screenshotError}</p>
            ) : null}

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
                onClick={onClose}
              >
                닫기
              </Button>
              <Button
                type="button"
                className="flex-1"
                disabled={busy}
                onClick={() => void submit()}
              >
                {busy ? "보내는 중..." : "신청 보내기"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
