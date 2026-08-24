import { getFeedbackAdminSummary } from "@/lib/repositories/feedbacks";

export const dynamic = "force-dynamic";
export const metadata = { title: "피드백 | Admin" };

function pct(n: number | null): string {
  if (n == null) return "—";
  return `${Math.round(n * 100)}%`;
}

export default async function AdminFeedbackPage() {
  const summary = await getFeedbackAdminSummary(50);

  return (
    <div className="space-y-8">
      <h1 className="font-[family-name:var(--font-display)] text-2xl text-[var(--admin-gold)]">
        피드백
      </h1>

      <div className="grid gap-3 sm:grid-cols-3">
        {(["FORTUNE", "TAROT", "CROSS_READING"] as const).map((type) => {
          const s = summary.byType[type];
          const label =
            type === "FORTUNE"
              ? "사주"
              : type === "TAROT"
                ? "타로"
                : "교차리딩";
          return (
            <div
              key={type}
              className="rounded-xl border border-[var(--admin-line)] bg-[var(--admin-panel)] p-4 text-sm"
            >
              <p className="text-[var(--admin-muted)]">{label}</p>
              <p className="mt-2 text-2xl font-semibold">
                {s?.avgRating ?? "—"}
                <span className="ml-1 text-sm font-normal text-[var(--admin-muted)]">
                  / 5 · {s?.count ?? 0}건
                </span>
              </p>
              <p className="mt-2 text-[var(--admin-muted)]">
                너무 일반적 {pct(s?.tooGenericRate ?? null)}
              </p>
              <p className="text-[var(--admin-muted)]">
                소름 돋게 맞음 {pct(s?.spotOnRate ?? null)}
              </p>
            </div>
          );
        })}
      </div>

      <section className="rounded-xl border border-[var(--admin-line)] bg-[var(--admin-panel)] p-4 text-sm">
        <p className="font-medium">타로까지 보니 더 재미있었다 (YES)</p>
        <p className="mt-2 text-2xl font-semibold text-[var(--admin-gold)]">
          {pct(summary.moreFunYesRate)}
        </p>
      </section>

      <section>
        <h2 className="text-lg font-medium">최근 피드백</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {summary.recent.map((r) => (
            <li
              key={r.id}
              className="rounded-lg border border-[var(--admin-line)] px-3 py-2"
            >
              <span className="text-[var(--admin-gold)]">{r.target_type}</span>
              {" · "}
              점수 {r.rating ?? "—"}
              {r.tags.length ? ` · ${r.tags.join(", ")}` : ""}
              {r.more_fun_than_saju_alone
                ? ` · more_fun=${r.more_fun_than_saju_alone}`
                : ""}
              <span className="mt-1 block text-xs text-[var(--admin-muted)]">
                {new Date(r.created_at).toLocaleString("ko-KR")}
              </span>
            </li>
          ))}
          {summary.recent.length === 0 ? (
            <li className="text-[var(--admin-muted)]">피드백 없음</li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
