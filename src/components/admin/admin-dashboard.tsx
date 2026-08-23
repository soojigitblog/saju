import Link from "next/link";
import { formatKRW } from "@/lib/utils";
import type { AdminDashboardStats } from "@/types";

export function AdminDashboard({
  stats,
  pendingBankDeposits = 0,
}: {
  stats: AdminDashboardStats;
  pendingBankDeposits?: number;
}) {
  const maxFunnel = Math.max(...stats.funnel.map((f) => f.value));

  return (
    <div className="space-y-8">
      {pendingBankDeposits > 0 ? (
        <Link
          href="/admin/bank-deposits"
          className="block rounded-2xl border-2 border-amber-400 bg-amber-50 p-5 transition-colors hover:bg-amber-100 dark:border-amber-600 dark:bg-amber-950/40 dark:hover:bg-amber-950/60"
        >
          <p className="text-lg font-semibold text-amber-900 dark:text-amber-100">
            입금확인 대기 {pendingBankDeposits}건
          </p>
          <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
            하나은행 입금을 확인하고 승인해 주세요 →
          </p>
        </Link>
      ) : null}

      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
          오늘
        </h1>
        <p className="mt-1 text-sm text-[var(--ink-faint)]">Mock 대시보드</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          { label: "방문자", value: stats.visitors.toLocaleString() },
          { label: "무료 사주", value: stats.freeFortune.toLocaleString() },
          { label: "결제", value: stats.payments.toLocaleString() },
          { label: "매출", value: formatKRW(stats.revenue) },
          { label: "구매전환율", value: `${stats.conversionRate}%` },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-4"
          >
            <p className="text-xs text-[var(--ink-faint)]">{card.label}</p>
            <p className="mt-2 text-xl font-semibold text-[var(--ink)]">{card.value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5">
        <h2 className="text-lg font-semibold text-[var(--ink)]">Funnel</h2>
        <ul className="mt-5 space-y-3">
          {stats.funnel.map((row) => (
            <li key={row.label}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-[var(--ink-muted)]">{row.label}</span>
                <span className="text-[var(--ink)]">{row.value.toLocaleString()}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[var(--surface)]">
                <div
                  className="h-full rounded-full bg-[var(--accent)]"
                  style={{ width: `${(row.value / maxFunnel) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5">
        <h2 className="text-lg font-semibold text-[var(--ink)]">상품별 성과</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[320px] text-left text-sm">
            <thead className="text-[var(--ink-faint)]">
              <tr>
                <th className="pb-3 font-medium">상품</th>
                <th className="pb-3 font-medium">구매</th>
                <th className="pb-3 font-medium">매출</th>
              </tr>
            </thead>
            <tbody>
              {stats.productPerformance.map((row) => (
                <tr key={row.name} className="border-t border-[var(--line)]">
                  <td className="py-3 text-[var(--ink)]">{row.name}</td>
                  <td className="py-3 text-[var(--ink-muted)]">{row.purchases}</td>
                  <td className="py-3 text-[var(--ink)]">{formatKRW(row.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
