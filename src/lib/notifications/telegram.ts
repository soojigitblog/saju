import "server-only";

import {
  type AdminNotificationPayload,
  type AdminNotificationProvider,
  NotificationConfigError,
} from "@/lib/notifications/provider";

function getTelegramBotToken(): string | undefined {
  return process.env.TELEGRAM_BOT_TOKEN?.trim() || undefined;
}

function getTelegramAdminChatId(): string | undefined {
  return process.env.TELEGRAM_ADMIN_CHAT_ID?.trim() || undefined;
}

export function isTelegramConfigured(): boolean {
  return Boolean(getTelegramBotToken() && getTelegramAdminChatId());
}

/**
 * Telegram Bot API admin notifier.
 * Never logs token / chat contents with PII beyond the crafted message.
 */
export class TelegramNotificationProvider implements AdminNotificationProvider {
  readonly id = "telegram" as const;

  async send(payload: AdminNotificationPayload): Promise<void> {
    const token = getTelegramBotToken();
    const chatId = getTelegramAdminChatId();
    if (!token || !chatId) {
      throw new NotificationConfigError("TELEGRAM_NOT_CONFIGURED");
    }

    const text = payload.adminPath
      ? `${payload.title}\n\n${payload.body}\n\n${payload.adminPath}`
      : `${payload.title}\n\n${payload.body}`;

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
    });

    if (!res.ok) {
      // Do not include response body (may echo chat metadata)
      throw new Error(`TELEGRAM_HTTP_${res.status}`);
    }
  }
}

export function createTelegramProvider(): TelegramNotificationProvider {
  return new TelegramNotificationProvider();
}
