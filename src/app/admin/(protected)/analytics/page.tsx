import { getAnalyticsFunnelCounts } from "@/lib/repositories/admin-stats";

export const dynamic = "force-dynamic";
export const metadata = { title: "Analytics | Admin" };

export default async function AdminAnalyticsPage() {
  const [today, all] = await Promise.all([
    getAnalyticsFunnelCounts({ todayOnly: true }),
    getAnalyticsFunnelCounts({ todayOnly: false }),
  ]);
  const max = Math.max(1, ...all.map((f) => f.value));

  return (
    <div className="space-y-8">
      <h1 className="font-[family-name:var(--font-display)] text-2xl text-[var(--admin-gold)]">
        Analytics
      </h1>
      <p className="text-sm text-[var(--admin-muted)]">
        Landing → Fortune → Tarot → Product → Order → Paid
      </p>

      <section className="rounded-xl border border-[var(--admin-line)] bg-[var(--admin-panel)] p-5">
        <h2 className="font-semibold">오늘</h2>
        <ul className="mt-4 space-y-2 text-sm">
          {today.map((row) => (
            <li key={row.label} className="flex justify-between">
              <span className="text-[var(--admin-muted)]">{row.label}</span>
              <span>{row.value.toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-[var(--admin-line)] bg-[var(--admin-panel)] p-5">
        <h2 className="font-semibold">전체 Funnel</h2>
        <ul className="mt-4 space-y-3">
          {all.map((row) => (
            <li key={row.label}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-[var(--admin-muted)]">{row.label}</span>
                <span>{row.value.toLocaleString()}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[var(--admin-navy)]">
                <div
                  className="h-full rounded-full bg-[var(--admin-gold)]"
                  style={{ width: `${(row.value / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
