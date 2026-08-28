import "server-only";

import { formatKRW } from "@/lib/utils";
import {
  type AdminNotificationKind,
  type AdminNotificationPayload,
  type AdminNotificationProvider,
  NotificationConfigError,
} from "@/lib/notifications/provider";
import {
  createTelegramProvider,
  isTelegramConfigured,
} from "@/lib/notifications/telegram";

/** Mask depositor for ops alerts — first syllable/char + ** */
export function maskDepositorNameForAlert(name: string | null | undefined): string {
  const t = (name ?? "").trim();
  if (!t) return "—";
  const first = [...t][0] ?? "";
  return `${first}**`;
}

export function formatAlertDateTime(iso: string, timeZone = "Asia/Seoul"): string {
  try {
    return new Intl.DateTimeFormat("ko-KR", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function buildDepositCheckRequestedMessage(input: {
  orderNo: string;
  productName: string | null;
  amount: number;
  depositorName: string | null;
  requestedAt: string;
}): AdminNotificationPayload {
  const body = [
    `주문번호:\n${input.orderNo}`,
    "",
    `상품:\n${input.productName?.trim() || "상품"}`,
    "",
    `금액:\n${formatKRW(input.amount)}`,
    "",
    `입금자:\n${maskDepositorNameForAlert(input.depositorName)}`,
    "",
    `요청시간:\n${formatAlertDateTime(input.requestedAt)}`,
    "",
    "하나은행 입금내역을 확인해주세요.",
  ].join("\n");

  return {
    kind: "DEPOSIT_CHECK_REQUESTED",
    title: "🔔 운의결 입금확인 요청",
    body,
    adminPath: "/admin/bank-deposits",
  };
}

function resolveProviders(): AdminNotificationProvider[] {
  const providers: AdminNotificationProvider[] = [];
  if (isTelegramConfigured()) {
    providers.push(createTelegramProvider());
  }
  return providers;
}

/**
 * Best-effort fan-out to configured admin channels.
 * Throws only if you need to know total failure — callers usually catch.
 */
export async function notifyAdmins(
  payload: AdminNotificationPayload
): Promise<{ sent: number; skipped: boolean }> {
  const providers = resolveProviders();
  if (providers.length === 0) {
    console.warn("[notifications] no provider configured", {
      kind: payload.kind,
    });
    return { sent: 0, skipped: true };
  }

  let sent = 0;
  const errors: string[] = [];
  for (const provider of providers) {
    try {
      await provider.send(payload);
      sent += 1;
    } catch (error) {
      const code =
        error instanceof NotificationConfigError
          ? error.message
          : error instanceof Error
            ? error.message.slice(0, 80)
            : "UNKNOWN";
      errors.push(`${provider.id}:${code}`);
      console.error("[notifications] send failed", {
        provider: provider.id,
        kind: payload.kind,
        code,
      });
    }
  }

  if (sent === 0 && errors.length > 0) {
    throw new Error(`NOTIFICATION_ALL_FAILED`);
  }

  return { sent, skipped: false };
}

export async function notifyDepositCheckRequested(input: {
  orderNo: string;
  productName: string | null;
  amount: number;
  depositorName: string | null;
  requestedAt: string;
}): Promise<{ sent: number; skipped: boolean }> {
  return notifyAdmins(buildDepositCheckRequestedMessage(input));
}

/** Future: ambiguous bank match — same channel, no PII beyond order summary. */
export async function notifyBankMatchAmbiguous(input: {
  orderNo?: string;
  amount: number;
  note?: string;
}): Promise<{ sent: number; skipped: boolean }> {
  const payload: AdminNotificationPayload = {
    kind: "BANK_MATCH_AMBIGUOUS",
    title: "⚠️ 운의결 입금 매칭 확인 필요",
    body: [
      input.orderNo ? `주문번호:\n${input.orderNo}` : null,
      `금액:\n${formatKRW(input.amount)}`,
      input.note ? `\n${input.note}` : null,
      "",
      "관리자 화면에서 수동 확인해 주세요.",
    ]
      .filter(Boolean)
      .join("\n"),
    adminPath: "/admin/bank-deposits",
  };
  return notifyAdmins(payload);
}

export async function notifyPaidReportFailed(input: {
  orderNo: string;
  productName: string | null;
  amount: number;
  errorCode: string;
}): Promise<{ sent: number; skipped: boolean }> {
  const payload: AdminNotificationPayload = {
    kind: "PAID_REPORT_FAILED",
    title: "🚨 운의결 유료 리포트 생성 실패",
    body: [
      `주문번호:\n${input.orderNo}`,
      "",
      `상품:\n${input.productName?.trim() || "상품"}`,
      "",
      `금액:\n${formatKRW(input.amount)}`,
      "",
      `error code:\n${input.errorCode}`,
    ].join("\n"),
    adminPath: "/admin/reports",
  };
  return notifyAdmins(payload);
}

export async function notifyPaidOrderConfirmed(input: {
  orderNo: string;
  productName: string | null;
  paidAt: string;
}): Promise<{ sent: number; skipped: boolean }> {
  const payload: AdminNotificationPayload = {
    kind: "PAID_ORDER_CONFIRMED",
    title: "[운의결 결제 완료]",
    body: [
      `상품\n${input.productName?.trim() || "상품"}`,
      "",
      `주문번호\n${input.orderNo}`,
      "",
      `결제 확인 시각\n${formatAlertDateTime(input.paidAt)}`,
      "",
      "리포트 상태:",
      "AI 생성 대기",
    ].join("\n"),
    adminPath: "/admin/report-waiting",
  };
  return notifyAdmins(payload);
}

export type { AdminNotificationKind, AdminNotificationPayload };
