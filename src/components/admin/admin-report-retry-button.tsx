"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function AdminReportRetryButton({
  orderId,
  orderNo,
  canRetry,
}: {
  orderId: string;
  orderNo: string;
  canRetry: boolean;
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
      const data = (await res.json()) as { message?: string };
      if (!res.ok) {
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
      <Button size="sm" variant="outline" disabled={busy} onClick={() => void retry()}>
        리포트 다시 생성
      </Button>
      {msg ? <span className="text-xs text-[var(--admin-muted)]">{msg}</span> : null}
    </div>
  );
}
