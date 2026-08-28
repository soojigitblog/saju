import { listReportsForAdmin } from "@/lib/repositories/reports";
import { AdminReportRetryButton } from "@/components/admin/admin-report-retry-button";
import { canAdminTriggerPaidGeneration } from "@/lib/services/paid-report-generation-readiness";
import { PAID_REPORT_WAITING_ERROR_CODE } from "@/lib/services/paid-report-waiting";
import { isPaidReportOperationalFailure } from "@/lib/services/paid-report-failure-policy";

export const dynamic = "force-dynamic";
export const metadata = { title: "유료 리포트 | Admin" };

function adminStatusLabel(
  generationStatus: string,
  errorCode: string | null
): string {
  if (
    generationStatus === "PENDING" &&
    errorCode === PAID_REPORT_WAITING_ERROR_CODE
  ) {
    return "AI 생성 대기";
  }
  return generationStatus;
}

export default async function AdminReportsPage() {
  const reports = await listReportsForAdmin(80);
  const generationEnabled = canAdminTriggerPaidGeneration();

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
            {reports.map((r) => {
              const isOperationalFailure =
                r.generation_status === "FAILED" &&
                isPaidReportOperationalFailure(
                  r.error_code,
                  r.generation_status
                );
              const isWaiting =
                r.generation_status === "PENDING" &&
                r.error_code === PAID_REPORT_WAITING_ERROR_CODE;

              return (
              <tr
                key={r.id}
                className={
                  isOperationalFailure
                    ? "border-t border-red-800/50 bg-red-950/30"
                    : isWaiting
                      ? "border-t border-amber-800/30 bg-amber-950/10"
                      : "border-t border-[var(--admin-line)]"
                }
              >
                <td className="px-3 py-2 font-mono text-xs">
                  {r.order_no ?? r.order_id.slice(0, 8)}
                </td>
                <td className="px-3 py-2">{r.product_name ?? "—"}</td>
                <td className="px-3 py-2">
                  {adminStatusLabel(r.generation_status, r.error_code)}
                </td>
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
                    generationEnabled={generationEnabled}
                  />
                </td>
              </tr>
            );
            })}
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
