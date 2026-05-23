import type { WebhookNotifierConfig } from "../../core/config.js";
import type { HttpNotifierDependencies } from "../http.js";
import { type NotificationPayload, renderNotificationText } from "../Notifier.js";
import { WebhookNotifierBase } from "../webhook.js";

export class SlackNotifier extends WebhookNotifierBase {
  readonly id = "slack" as const;

  constructor(config: WebhookNotifierConfig, dependencies: HttpNotifierDependencies = {}) {
    super(config, dependencies);
  }

  protected body(payload: NotificationPayload): unknown {
    return {
      text: renderNotificationText(payload),
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${payload.title}*\n${payload.summary}`,
          },
        },
      ],
    };
  }
}
