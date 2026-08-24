import { listReportsForAdmin } from "@/lib/repositories/reports";
import { AdminReportRetryButton } from "@/components/admin/admin-report-retry-button";

export const dynamic = "force-dynamic";
export const metadata = { title: "유료 리포트 | Admin" };

export default async function AdminReportsPage() {
  const reports = await listReportsForAdmin(80);

  return (
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-display)] text-2xl text-[var(--admin-gold)]">
        유료 리포트
      </h1>
      <div className="overflow-x-auto rounded-xl border border-[var(--admin-line)]">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-[var(--admin-panel)] text-[var(--admin-muted)]">
            <tr>
              <th className="px-3 py-2">주문</th>
              <th className="px-3 py-2">상품</th>
              <th className="px-3 py-2">상태</th>
              <th className="px-3 py-2">모델</th>
              <th className="px-3 py-2">생성</th>
              <th className="px-3 py-2">완료</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr
                key={r.id}
                className={
                  r.generation_status === "FAILED"
                    ? "border-t border-red-800/50 bg-red-950/30"
                    : "border-t border-[var(--admin-line)]"
                }
              >
                <td className="px-3 py-2 font-mono text-xs">
                  {r.order_no ?? r.order_id.slice(0, 8)}
                </td>
                <td className="px-3 py-2">{r.product_name ?? "—"}</td>
                <td className="px-3 py-2">{r.generation_status}</td>
                <td className="px-3 py-2 text-[var(--admin-muted)]">
                  {r.model ?? "—"}
                </td>
                <td className="px-3 py-2 text-[var(--admin-muted)]">
                  {new Date(r.created_at).toLocaleString("ko-KR")}
                </td>
                <td className="px-3 py-2 text-[var(--admin-muted)]">
                  {r.generated_at
                    ? new Date(r.generated_at).toLocaleString("ko-KR")
                    : "—"}
                </td>
                <td className="px-3 py-2">
                  <AdminReportRetryButton
                    orderId={r.order_id}
                    orderNo={r.order_no ?? r.order_id}
                    canRetry={Boolean(r.paid_at)}
                  />
                </td>
              </tr>
            ))}
            {reports.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-[var(--admin-muted)]">
                  리포트 없음
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
