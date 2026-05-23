import type { WebhookNotifierConfig } from "../../core/config.js";
import type { HttpNotifierDependencies } from "../http.js";
import { type NotificationPayload, renderNotificationText } from "../Notifier.js";
import { WebhookNotifierBase } from "../webhook.js";

const colorBySeverity: Record<NotificationPayload["severity"], number> = {
  critical: 0xb00020,
  high: 0xd83b01,
  medium: 0xffb900,
  low: 0x0078d4,
  info: 0x107c10,
};

export class DiscordNotifier extends WebhookNotifierBase {
  readonly id = "discord" as const;

  constructor(config: WebhookNotifierConfig, dependencies: HttpNotifierDependencies = {}) {
    super(config, dependencies);
  }

  protected body(payload: NotificationPayload): unknown {
    return {
      content: `${payload.title}\n${payload.summary}`,
      embeds: [
        {
          title: payload.title,
          description: renderNotificationText(payload),
          color: colorBySeverity[payload.severity],
        },
      ],
    };
  }
}
