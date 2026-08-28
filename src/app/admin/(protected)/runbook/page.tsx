import {
  getZeroCostLaunchPolicySnapshot,
  isZeroCostProductionPolicy,
} from "@/lib/ops/zero-cost-launch-policy";
import { QA_DRY_RUN_DEPOSITOR_PREFIX } from "@/lib/ops/qa-dry-run-order";

export const dynamic = "force-dynamic";
export const metadata = { title: "첫 결제 런북 | Admin" };

const STEPS = [
  "하나은행에서 실제 입금을 확인합니다.",
  "입금 확인 → 주문 관리에서 정확한 주문 하나만 PAID 처리합니다.",
  "고객 화면에 「결제 확인됨 · 리포트 준비 중」이 표시되는지 확인합니다.",
  "Paid AI 키(GEMINI_API_KEY_PAID)를 배포 환경에 설정합니다.",
  "Admin QA Money Live Smoke 1건을 실행합니다.",
  "Human Review로 리포트 품질을 확인합니다.",
  "해당 고객 주문에 대해 리포트 생성을 승인·실행합니다.",
  "PDF와 고객 결과 화면을 확인합니다.",
  "고객에게 결과 열람이 가능한지 최종 확인합니다.",
] as const;

export default async function AdminRunbookPage() {
  const policy = getZeroCostLaunchPolicySnapshot();
  const zeroCost = isZeroCostProductionPolicy(policy);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-[var(--admin-gold)]">
          첫 결제 런북
        </h1>
        <p className="mt-2 text-sm text-[var(--admin-muted)]">
          Zero-Cost 런칭 이후 첫 실제 유료 고객 처리 절차입니다. 4번 이후는
          첫 실제 결제가 확인된 뒤에만 진행하세요.
        </p>
      </div>

      <section className="rounded-xl border border-[var(--admin-line)] bg-[var(--admin-panel)] p-5 text-sm">
        <h2 className="font-medium text-[var(--admin-ink)]">현재 정책</h2>
        <ul className="mt-3 space-y-1 text-[var(--admin-muted)]">
          <li>유료 결제(Checkout): {policy.paidCheckoutEnabled ? "ON" : "OFF"}</li>
          <li>AI 자동 생성: {policy.paidGenerationEnabled ? "ON" : "OFF"}</li>
          <li>Paid AI 키: {policy.paidGeminiKeyConfigured ? "설정됨" : "미설정"}</li>
          <li>계좌이체 계좌: {policy.bankTransferConfigured ? "설정됨" : "미설정"}</li>
          <li>Zero-Cost 모드: {zeroCost ? "활성" : "비활성"}</li>
        </ul>
      </section>

      <section className="rounded-xl border border-[var(--admin-line)] p-5">
        <h2 className="text-lg font-medium text-[var(--admin-ink)]">
          첫 실제 결제 발생 시
        </h2>
        <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm text-[var(--admin-muted)]">
          {STEPS.map((step, i) => (
            <li
              key={step}
              className={
                i >= 3 && zeroCost
                  ? "rounded border border-amber-800/40 bg-amber-950/20 px-3 py-2 text-amber-100/90"
                  : undefined
              }
            >
              {step}
              {i === 3 && zeroCost ? (
                <span className="mt-1 block text-xs text-amber-200/80">
                  첫 실제 입금 확인 전까지 실행하지 마세요.
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-xl border border-[var(--admin-line)] p-5 text-sm">
        <h2 className="font-medium text-[var(--admin-ink)]">
          프로덕션 QA 드라이런 (실제 입금 없음)
        </h2>
        <p className="mt-2 text-[var(--admin-muted)]">
          배포 URL에서 주문 흐름만 검증할 때 입금자명을{" "}
          <code className="rounded bg-black/30 px-1">
            {QA_DRY_RUN_DEPOSITOR_PREFIX}홍길동
          </code>{" "}
          형식으로 입력하세요. 입금 확인 화면에서 QA 배지가 표시되며, 실제
          고객 주문과 구분됩니다. 실제 송금은 하지 마세요.
        </p>
      </section>
    </div>
  );
}
