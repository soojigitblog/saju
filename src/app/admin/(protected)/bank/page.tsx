import Link from "next/link";
import { getBankPollerHealth } from "@/lib/repositories/bank-transactions";
import { isBankTransferAccountConfigured } from "@/lib/bank/account-public";
import { isHanaAutomationEnabled } from "@/lib/bank/hana/playwright/config";
import {
  bankConnectionMessage,
  hanaAutoCheckSummary,
  resolveBankConnectionLabel,
} from "@/lib/bank/connection-status";

export const dynamic = "force-dynamic";
export const metadata = { title: "은행 상태 | Admin" };

export default async function AdminBankPage() {
  const health = await getBankPollerHealth();
  const accountReady = isBankTransferAccountConfigured();
  const automationEnabled = isHanaAutomationEnabled();
  const connectionLabel = resolveBankConnectionLabel(
    health ?? null,
    automationEnabled
  );
  const connectionMessage = bankConnectionMessage(connectionLabel);
  const autoCheck = hanaAutoCheckSummary(automationEnabled);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-[var(--admin-gold)]">
          은행 상태
        </h1>
        <Link
          href="/admin/bank-deposits"
          className="text-sm text-[var(--admin-muted)] underline"
        >
          입금 확인
        </Link>
      </div>

      <section className="rounded-xl border border-[var(--admin-line)] bg-[var(--admin-panel)] p-5 text-sm">
        <p className="text-xs text-[var(--admin-muted)]">HANA</p>
        <p className="mt-2 text-xl font-semibold text-[var(--admin-gold)]">
          {connectionLabel}
        </p>
        <p className="mt-2 text-[var(--admin-muted)]">{connectionMessage}</p>
        <ul className="mt-4 space-y-1 text-[var(--admin-muted)]">
          <li>계좌 설정: {accountReady ? "READY" : "MISSING"}</li>
          <li>Credential Store: {autoCheck.credentialStore}</li>
          <li>Auto Login: {autoCheck.autoLogin}</li>
          <li>
            Last Login:{" "}
            {autoCheck.lastLogin
              ? new Date(autoCheck.lastLogin).toLocaleString("ko-KR")
              : "—"}
            {autoCheck.lastLoginResult
              ? ` (${autoCheck.lastLoginResult})`
              : ""}
          </li>
          <li>
            마지막 성공 조회:{" "}
            {health?.last_success_at
              ? new Date(health.last_success_at).toLocaleString("ko-KR")
              : "—"}
          </li>
          <li>
            마지막 poll: {health?.status ?? "—"} · 조회{" "}
            {health?.last_fetched_count ?? 0}
          </li>
          <li>자동 매칭 수: {health?.last_matched_count ?? 0}</li>
          <li>확인 필요 수: {health?.last_ambiguous_count ?? 0}</li>
        </ul>
        {health?.last_error_safe ? (
          <p className="mt-3 text-amber-300">오류 코드: {health.last_error_safe}</p>
        ) : null}
        <p className="mt-4 text-xs text-[var(--admin-muted)]">
          은행 비밀번호 · Credential · 전체 계좌번호 · 잔액은 표시하지 않습니다.
        </p>
      </section>
    </div>
  );
}
