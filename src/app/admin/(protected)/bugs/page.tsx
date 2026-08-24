import Link from "next/link";
import { listClientIssuesForAdmin } from "@/lib/repositories/client-issues";

export const dynamic = "force-dynamic";

export const metadata = { title: "버그/에러 | Admin" };

export default async function AdminBugsPage() {
  const rows = await listClientIssuesForAdmin(100);
  const reports = rows.filter((r) => r.kind === "BUG_REPORT").length;
  const errors = rows.filter((r) => r.kind === "CLIENT_ERROR").length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">버그 / 클라이언트 에러</h1>
        <Link href="/admin/dashboard" className="text-sm underline">
          대시보드
        </Link>
      </div>
      <p className="mt-2 text-sm text-[var(--ink-muted)]">
        최근 {rows.length}건 · 제보 {reports} · 자동에러 {errors}
      </p>
      <p className="mt-1 text-xs text-[var(--ink-faint)]">
        테이블: <code>client_issues</code> (Supabase)
      </p>

      <ul className="mt-8 space-y-3">
        {rows.map((row) => (
          <li
            key={row.id}
            className="rounded border border-[var(--line)] bg-[var(--paper)] px-4 py-3 text-sm"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-[var(--surface-strong)] px-2 py-0.5 text-[11px] font-medium">
                {row.kind === "BUG_REPORT" ? "제보" : "에러"}
              </span>
              <span className="text-xs text-[var(--ink-faint)]">
                {new Date(row.created_at).toLocaleString("ko-KR")}
              </span>
              {row.path ? (
                <span className="truncate text-xs text-[var(--ink-muted)]">
                  {row.path}
                </span>
              ) : null}
            </div>
            <p className="mt-2 font-medium text-[var(--ink)]">{row.message}</p>
            {row.details ? (
              <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded bg-[var(--surface)] p-2 text-[11px] text-[var(--ink-muted)]">
                {row.details}
              </pre>
            ) : null}
            <p className="mt-2 text-[11px] text-[var(--ink-faint)]">
              guest: {row.guest_session_id?.slice(0, 8) ?? "—"} · ua:{" "}
              {(row.user_agent ?? "—").slice(0, 60)}
            </p>
          </li>
        ))}
        {rows.length === 0 ? (
          <li className="text-sm text-[var(--ink-muted)]">아직 수집된 이슈가 없습니다.</li>
        ) : null}
      </ul>
    </div>
  );
}
