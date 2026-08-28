"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function AdminReportRetryButton({
  orderId,
  orderNo,
  canRetry,
  generationEnabled,
}: {
  orderId: string;
  orderNo: string;
  canRetry: boolean;
  generationEnabled: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  if (!canRetry) return null;

  async function retry() {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/reports/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const data = (await res.json()) as { message?: string; code?: string };
      if (!res.ok) {
        if (data.code === "PAID_AI_NOT_CONFIGURED") {
          setMsg("AI 설정 필요 (Paid AI 키)");
          return;
        }
        setMsg(data.message ?? "실패");
        return;
      }
      setMsg(`${orderNo} 재생성 시작`);
      window.location.reload();
    } catch {
      setMsg("실패");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={() => void retry()}
      >
        {generationEnabled ? "리포트 생성" : "생성 시도"}
      </Button>
      {msg ? (
        <span className="max-w-[200px] text-right text-xs text-[var(--admin-muted)]">
          {msg}
        </span>
      ) : !generationEnabled ? (
        <span className="max-w-[200px] text-right text-xs text-[var(--admin-muted)]">
          Paid key 없음
        </span>
      ) : null}
    </div>
  );
}
