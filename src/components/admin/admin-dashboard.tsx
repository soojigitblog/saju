import Link from "next/link";
import { formatKRW } from "@/lib/utils";
import type { AdminTodayStats } from "@/lib/repositories/admin-stats";
export function AdminDashboard({ stats }: { stats: AdminTodayStats }) {
  const maxFunnel = Math.max(1, ...stats.funnel.map((f) => f.value));

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        {stats.paymentCheckRequested > 0 ? (
          <Link
            href="/admin/bank-deposits"
            className="block rounded-xl border border-[var(--admin-gold)]/60 bg-[var(--admin-accent-soft)] p-4 transition-colors hover:border-[var(--admin-gold)]"
          >
            <p className="text-lg font-semibold text-[var(--admin-gold)]">
              오늘 입금확인 대기 {stats.paymentCheckRequested}건
            </p>
            <p className="mt-1 text-sm text-[var(--admin-muted)]">
              Telegram 알림 주문 — 하나은행 앱 확인 후 승인 →
            </p>
          </Link>
        ) : null}
        {stats.reportFailures > 0 ? (
          <Link
            href="/admin/reports"
            className="block rounded-xl border border-red-700/50 bg-red-950/40 p-4"
          >
            <p className="font-semibold text-red-200">
              결제 완료 후 리포트 생성 실패 {stats.reportFailures}건
            </p>
            <p className="mt-1 text-sm text-red-200/80">리포트 재생성 필요 →</p>
          </Link>
        ) : null}
      </div>

      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--admin-gold)]">
          오늘
        </h1>
        <p className="mt-1 text-sm text-[var(--admin-muted)]">Asia/Seoul 기준</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
        {[
          { label: "방문자", value: stats.visitors.toLocaleString() },
          { label: "무료 사주 생성", value: stats.freeFortune.toLocaleString() },
          { label: "타로 리딩", value: stats.tarotReadings.toLocaleString() },
          { label: "상품 조회", value: stats.productViews.toLocaleString() },
          { label: "주문", value: stats.orders.toLocaleString() },
          { label: "입금대기", value: stats.pendingDeposits.toLocaleString() },
          { label: "결제완료", value: stats.paid.toLocaleString() },
          { label: "매출", value: formatKRW(stats.revenue) },
          {
            label: "유료 AI 비용",
            value: formatKRW(Math.round(stats.paidAiCostKrw)),
          },
          {
            label: "추정 마진",
            value: formatKRW(Math.round(stats.paidEstimatedMargin)),
          },
          { label: "AI 실패", value: stats.aiFailures.toLocaleString() },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-[var(--admin-line)] bg-[var(--admin-panel)] p-4"
          >
            <p className="text-xs text-[var(--admin-muted)]">{card.label}</p>
            <p className="mt-2 text-xl font-semibold text-[var(--admin-ink)]">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <section className="rounded-xl border border-[var(--admin-line)] bg-[var(--admin-panel)] p-5">
        <h2 className="text-lg font-semibold text-[var(--admin-ink)]">Funnel</h2>
        <ul className="mt-5 space-y-3">
          {stats.funnel.map((row) => (
            <li key={row.label}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-[var(--admin-muted)]">{row.label}</span>
                <span className="text-[var(--admin-ink)]">
                  {row.value.toLocaleString()}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[var(--admin-navy)]">
                <div
                  className="h-full rounded-full bg-[var(--admin-gold)]"
                  style={{ width: `${(row.value / maxFunnel) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
