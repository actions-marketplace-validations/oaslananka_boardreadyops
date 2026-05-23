import type { TelegramNotifierConfig } from "../../core/config.js";
import { envValue, type HttpNotifierDependencies, postJson } from "../http.js";
import {
  isNotifierEnabled,
  type NotificationPayload,
  type NotificationResult,
  type Notifier,
  renderNotificationText,
} from "../Notifier.js";

export class TelegramNotifier implements Notifier {
  readonly id = "telegram" as const;

  constructor(
    private readonly config: TelegramNotifierConfig,
    private readonly dependencies: HttpNotifierDependencies = {},
  ) {}

  isAvailable(): boolean {
    return isNotifierEnabled(this.config) && Boolean(this.botToken()) && Boolean(this.config.chatId?.trim());
  }

  async notify(payload: NotificationPayload): Promise<NotificationResult> {
    const token = this.botToken();
    const chatId = this.config.chatId?.trim();
    if (!token || !chatId) {
      return { notifier: this.id, status: "skipped", reason: "unavailable" };
    }
    await postJson(this.dependencies.fetcher, `https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId,
      text: renderNotificationText(payload),
      disable_web_page_preview: true,
    });
    return { notifier: this.id, status: "sent" };
  }

  private botToken(): string | undefined {
    return envValue(this.dependencies.env, this.config.botTokenEnv);
  }
}
