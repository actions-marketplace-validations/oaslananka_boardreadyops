import type { WebhookNotifierConfig } from "../../core/config.js";
import type { HttpNotifierDependencies } from "../http.js";
import { type NotificationPayload, renderNotificationText } from "../Notifier.js";
import { WebhookNotifierBase } from "../webhook.js";

const themeColorBySeverity: Record<NotificationPayload["severity"], string> = {
  critical: "B00020",
  high: "D83B01",
  medium: "FFB900",
  low: "0078D4",
  info: "107C10",
};

export class TeamsNotifier extends WebhookNotifierBase {
  readonly id = "teams" as const;

  constructor(config: WebhookNotifierConfig, dependencies: HttpNotifierDependencies = {}) {
    super(config, dependencies);
  }

  protected body(payload: NotificationPayload): unknown {
    return {
      "@type": "MessageCard",
      "@context": "https://schema.org/extensions",
      themeColor: themeColorBySeverity[payload.severity],
      title: payload.title,
      text: renderNotificationText(payload),
    };
  }
}
