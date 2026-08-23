import type { Tables } from "@/types/database.types";

/** Maps bank_poller_health row to admin-facing connection label. */
export type BankConnectionLabel =
  | "CONNECTED"
  | "SESSION_EXPIRED"
  | "AUTH_REQUIRED"
  | "ERROR"
  | "DEGRADED"
  | "NOT_CONFIGURED"
  | "RUNNING";

export function resolveBankConnectionLabel(
  health: Pick<
    Tables<"bank_poller_health">,
    "status" | "last_success_at" | "last_error_safe"
  > | null,
  automationEnabled: boolean
): BankConnectionLabel {
  if (!automationEnabled) return "NOT_CONFIGURED";
  if (!health) return "NOT_CONFIGURED";

  if (health.status === "SESSION_EXPIRED") {
    return health.last_error_safe === "AUTH_REQUIRED"
      ? "AUTH_REQUIRED"
      : "SESSION_EXPIRED";
  }

  if (health.status === "RUNNING") return "RUNNING";

  const err = health.last_error_safe ?? "";
  if (err === "HANA_SESSION_EXPIRED") return "SESSION_EXPIRED";
  if (err === "AUTH_REQUIRED") return "AUTH_REQUIRED";

  if (health.status === "ERROR") {
    return err === "BANK_CHECK_FAILED" ? "DEGRADED" : "ERROR";
  }

  if (health.last_success_at) {
    const ageMs = Date.now() - new Date(health.last_success_at).getTime();
    if (ageMs > 15 * 60 * 1000) return "DEGRADED";
    return "CONNECTED";
  }

  return "NOT_CONFIGURED";
}

export function bankConnectionMessage(label: BankConnectionLabel): string {
  switch (label) {
    case "CONNECTED":
      return "하나은행 연결 정상";
    case "SESSION_EXPIRED":
      return "하나은행 세션 재로그인 필요";
    case "AUTH_REQUIRED":
      return "추가 본인인증(OTP/보안매체)이 필요합니다. 자동 우회하지 않습니다.";
    case "DEGRADED":
      return "은행 조회가 지연되거나 일시 오류입니다. 주문은 PENDING 유지되며 관리자 수동 확인 가능합니다.";
    case "RUNNING":
      return "입금 내역 조회 중…";
    case "NOT_CONFIGURED":
      return "하나은행 자동 조회 미연결 — 관리자 수동 확인 사용";
    default:
      return "은행 연결 오류 — 관리자 수동 확인 사용";
  }
}

/** User-facing copy on payment wait screen (no ops commands). */
export function bankConnectionUserMessage(
  label: BankConnectionLabel
): string | null {
  if (label === "SESSION_EXPIRED" || label === "AUTH_REQUIRED") {
    return "입금 확인 시스템 연결이 잠시 끊겼습니다.\n입금하셨다면 주문은 그대로 유지됩니다.";
  }
  return null;
}
