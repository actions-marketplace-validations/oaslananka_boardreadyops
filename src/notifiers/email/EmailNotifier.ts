import type { EmailNotifierConfig } from "../../core/config.js";
import { envValue } from "../http.js";
import {
  isNotifierEnabled,
  type NotificationPayload,
  type NotificationResult,
  type Notifier,
  renderNotificationText,
} from "../Notifier.js";
import { type EmailMessage, type EmailSender, sendSmtpEmail } from "./smtp.js";

interface EmailNotifierDependencies {
  env?: Record<string, string | undefined> | undefined;
  sendEmail?: EmailSender | undefined;
}

export class EmailNotifier implements Notifier {
  readonly id = "email" as const;

  constructor(
    private readonly config: EmailNotifierConfig,
    private readonly dependencies: EmailNotifierDependencies = {},
  ) {}

  isAvailable(): boolean {
    return isNotifierEnabled(this.config) && Boolean(this.smtpUrl()) && this.recipients().length > 0;
  }

  async notify(payload: NotificationPayload): Promise<NotificationResult> {
    const smtpUrl = this.smtpUrl();
    const recipients = this.recipients();
    if (!smtpUrl || recipients.length === 0) {
      return { notifier: this.id, status: "skipped", reason: "unavailable" };
    }
    const message: EmailMessage = {
      from: this.config.from?.trim() || "boardreadyops@localhost",
      to: recipients,
      subject: payload.title,
      text: renderNotificationText(payload),
    };
    await (this.dependencies.sendEmail ?? sendSmtpEmail)(smtpUrl, message);
    return { notifier: this.id, status: "sent" };
  }

  private smtpUrl(): string | undefined {
    return envValue(this.dependencies.env, this.config.smtpEnv);
  }

  private recipients(): string[] {
    return (this.config.recipients ?? []).map((recipient) => recipient.trim()).filter(Boolean);
  }
}
