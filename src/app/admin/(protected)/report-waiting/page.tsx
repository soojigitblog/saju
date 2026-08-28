import { listWaitingForAiReports } from "@/lib/repositories/reports";
import {
  resolvePaidReportGenerationReadiness,
  canAdminTriggerPaidGeneration,
} from "@/lib/services/paid-report-generation-readiness";
import { AdminReportRetryButton } from "@/components/admin/admin-report-retry-button";
import { PAID_REPORT_WAITING_ERROR_CODE } from "@/lib/services/paid-report-waiting";

export const dynamic = "force-dynamic";
export const metadata = { title: "리포트 생성 대기 | Admin" };

function formatPaidAt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
}

export default async function AdminReportWaitingPage() {
  const rows = await listWaitingForAiReports(100);
  const generationEnabled = canAdminTriggerPaidGeneration();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-[var(--admin-gold)]">
          리포트 생성 대기
        </h1>
        <p className="mt-2 text-sm text-[var(--admin-muted)]">
          결제 확인 후 AI 생성을 기다리는 주문입니다. WAITING_FOR_AI는 운영 대기
          상태이며 기술 오류가 아닙니다.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[var(--admin-line)]">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="bg-[var(--admin-panel)] text-[var(--admin-muted)]">
            <tr>
              <th className="px-3 py-2">주문번호</th>
              <th className="px-3 py-2">상품</th>
              <th className="px-3 py-2">결제 확인</th>
              <th className="px-3 py-2">리포트 상태</th>
              <th className="px-3 py-2">생성 준비</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const readiness = resolvePaidReportGenerationReadiness({
                generationStatus: r.generation_status,
                errorCode: r.error_code,
              });
              const isWaiting =
                r.generation_status === "PENDING" &&
                r.error_code === PAID_REPORT_WAITING_ERROR_CODE;

              return (
                <tr
                  key={r.id}
                  className="border-t border-[var(--admin-line)] bg-amber-950/10"
                >
                  <td className="px-3 py-2 font-mono text-xs">
                    {r.order_no ?? r.order_id.slice(0, 8)}
                  </td>
                  <td className="px-3 py-2">{r.product_name ?? "—"}</td>
                  <td className="px-3 py-2 text-[var(--admin-muted)]">
                    {formatPaidAt(r.paid_at)}
                  </td>
                  <td className="px-3 py-2">
                    {isWaiting ? "AI 생성 대기" : r.generation_status}
                  </td>
                  <td className="px-3 py-2 text-[var(--admin-muted)]">
                    {readiness.label}
                  </td>
                  <td className="px-3 py-2">
                    <AdminReportRetryButton
                      orderId={r.order_id}
                      orderNo={r.order_no ?? r.order_id}
                      canRetry
                      generationEnabled={generationEnabled}
                    />
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-8 text-center text-[var(--admin-muted)]"
                >
                  대기 중인 주문이 없습니다.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
