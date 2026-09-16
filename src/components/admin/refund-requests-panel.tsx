"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatKRW } from "@/lib/utils";

export type RefundRequestItem = {
  id: string;
  orderId: string;
  orderNo: string;
  productName: string | null;
  amount: number;
  reason: string;
  screenshotDataUrl: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminNote: string | null;
  createdAt: string;
  decidedAt: string | null;
};

export function RefundRequestsPanel({ items }: { items: RefundRequestItem[] }) {
  const [rows, setRows] = useState(items);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState<string | null>(null);

  async function decide(id: string, decision: "APPROVED" | "REJECTED") {
    if (decision === "REJECTED" && !window.confirm("정말 거절하시겠습니까?")) {
      return;
    }
    setBusy(id);
    setError("");
    try {
      const res = await fetch(`/api/admin/refund-requests/${id}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) {
        setError(data.message ?? "처리에 실패했습니다.");
        return;
      }
      setRows((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, status: decision, decidedAt: new Date().toISOString() }
            : r
        )
      );
    } catch {
      setError("처리에 실패했습니다.");
    } finally {
      setBusy(null);
    }
  }

  const pending = rows.filter((r) => r.status === "PENDING");
  const decided = rows.filter((r) => r.status !== "PENDING");

  return (
    <div className="mt-8 space-y-8">
      {error ? (
        <p className="rounded border border-red-700/40 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <section>
        <h2 className="text-lg font-medium text-[var(--ink)]">
          대기 중 ({pending.length})
        </h2>
        <ul className="mt-3 space-y-3 text-sm">
          {pending.map((r) => (
            <li
              key={r.id}
              className="rounded-lg border border-[var(--line)] bg-[var(--paper)] px-4 py-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-[var(--ink-faint)]">
                  {new Date(r.createdAt).toLocaleString("ko-KR")}
                </span>
              </div>
              <p className="mt-2 font-medium text-[var(--ink)]">
                {r.productName ?? "상품"} · {r.orderNo} · {formatKRW(r.amount)}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-[var(--ink-muted)]">
                {r.reason}
              </p>
              {r.screenshotDataUrl ? (
                <button
                  type="button"
                  onClick={() => setZoom(r.screenshotDataUrl)}
                  className="mt-2 block"
                >
                  <img
                    src={r.screenshotDataUrl}
                    alt="첨부 스크린샷"
                    className="max-h-40 rounded border border-[var(--line)]"
                  />
                </button>
              ) : null}
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  disabled={busy === r.id}
                  onClick={() => void decide(r.id, "APPROVED")}
                >
                  승인 (주문 REFUNDED 표시)
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy === r.id}
                  onClick={() => void decide(r.id, "REJECTED")}
                >
                  거절
                </Button>
              </div>
            </li>
          ))}
          {pending.length === 0 ? (
            <li className="text-[var(--ink-muted)]">대기 중인 환불 신청이 없습니다.</li>
          ) : null}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-medium text-[var(--ink)]">
          처리 완료 ({decided.length})
        </h2>
        <ul className="mt-3 space-y-2 text-sm">
          {decided.map((r) => (
            <li
              key={r.id}
              className="rounded border border-[var(--line)] px-4 py-2 text-[var(--ink-muted)]"
            >
              <span
                className={
                  r.status === "APPROVED" ? "text-green-600" : "text-red-500"
                }
              >
                {r.status === "APPROVED" ? "승인됨" : "거절됨"}
              </span>{" "}
              · {r.orderNo} · {formatKRW(r.amount)} ·{" "}
              {r.decidedAt ? new Date(r.decidedAt).toLocaleString("ko-KR") : "—"}
            </li>
          ))}
          {decided.length === 0 ? (
            <li className="text-[var(--ink-faint)]">처리된 내역이 없습니다.</li>
          ) : null}
        </ul>
      </section>

      {zoom ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setZoom(null)}
        >
          <img src={zoom} alt="첨부 스크린샷 확대" className="max-h-full max-w-full" />
        </div>
      ) : null}
    </div>
  );
}
