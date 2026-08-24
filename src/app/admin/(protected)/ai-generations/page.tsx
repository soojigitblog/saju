import Link from "next/link";
import { listAiGenerationsForAdmin } from "@/lib/repositories/ai-generations";

export const dynamic = "force-dynamic";
export const metadata = { title: "AI 생성 | Admin" };

export default async function AdminAiGenerationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const status =
    sp.status === "FAILED" || sp.status === "COMPLETED"
      ? sp.status
      : undefined;

  const rows = await listAiGenerationsForAdmin({ status, limit: 100 });

  return (
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-display)] text-2xl text-[var(--admin-gold)]">
        AI 생성 현황
      </h1>
      <div className="flex gap-2 text-sm">
        <Link
          href="/admin/ai-generations"
          className={!status ? "text-[var(--admin-gold)]" : "text-[var(--admin-muted)]"}
        >
          전체
        </Link>
        <Link
          href="/admin/ai-generations?status=FAILED"
          className={
            status === "FAILED"
              ? "text-[var(--admin-gold)]"
              : "text-[var(--admin-muted)]"
          }
        >
          FAILED
        </Link>
        <Link
          href="/admin/ai-generations?status=COMPLETED"
          className={
            status === "COMPLETED"
              ? "text-[var(--admin-gold)]"
              : "text-[var(--admin-muted)]"
          }
        >
          COMPLETED
        </Link>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[var(--admin-line)]">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-[var(--admin-panel)] text-[var(--admin-muted)]">
            <tr>
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">type</th>
              <th className="px-3 py-2">provider</th>
              <th className="px-3 py-2">model</th>
              <th className="px-3 py-2">status</th>
              <th className="px-3 py-2">error</th>
              <th className="px-3 py-2">attempts</th>
              <th className="px-3 py-2">created</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className={
                  r.status === "FAILED"
                    ? "border-t border-red-800/40 bg-red-950/20"
                    : "border-t border-[var(--admin-line)]"
                }
              >
                <td className="px-3 py-2 font-mono text-xs">{r.id.slice(0, 8)}…</td>
                <td className="px-3 py-2">{r.result_type}</td>
                <td className="px-3 py-2">{r.provider ?? "—"}</td>
                <td className="px-3 py-2">{r.model}</td>
                <td className="px-3 py-2">{r.status}</td>
                <td className="px-3 py-2 text-[var(--admin-muted)]">
                  {r.error_code ?? "—"}
                </td>
                <td className="px-3 py-2">{r.attempt_count}</td>
                <td className="px-3 py-2 text-[var(--admin-muted)]">
                  {new Date(r.created_at).toLocaleString("ko-KR")}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-[var(--admin-muted)]">
                  없음
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
