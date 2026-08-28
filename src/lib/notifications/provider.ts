import "server-only";

/**
 * Admin / ops notification channel abstraction.
 * Telegram first; Email/Slack/Kakao can implement the same interface later.
 */

export type AdminNotificationKind =
  | "DEPOSIT_CHECK_REQUESTED"
  | "BANK_MATCH_AMBIGUOUS"
  | "BANK_MATCH_FAILED"
  | "PAID_REPORT_FAILED"
  | "PAID_ORDER_CONFIRMED";

export type AdminNotificationPayload = {
  kind: AdminNotificationKind;
  title: string;
  body: string;
  /** Optional deep-link for admin UI (no secrets). */
  adminPath?: string;
};

export interface AdminNotificationProvider {
  readonly id: string;
  send(payload: AdminNotificationPayload): Promise<void>;
}

export class NotificationConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotificationConfigError";
  }
}
