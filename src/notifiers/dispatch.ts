import type {
  EmailNotifierConfig,
  NotifiersConfig,
  TelegramNotifierConfig,
  WebhookNotifierConfig,
} from "../core/config.js";
import type { Severity } from "../core/findings.js";
import type { Logger } from "../core/logger.js";
import type { RunResult } from "../core/result.js";
import { DiscordNotifier } from "./discord/DiscordNotifier.js";
import { EmailNotifier } from "./email/EmailNotifier.js";
import type { EmailSender } from "./email/smtp.js";
import type { Fetcher } from "./http.js";
import {
  type NotificationPayload,
  type NotificationResult,
  type Notifier,
  type NotifierId,
  severityMeetsThreshold,
} from "./Notifier.js";
import { SlackNotifier } from "./slack/SlackNotifier.js";
import { TeamsNotifier } from "./teams/TeamsNotifier.js";
import { TelegramNotifier } from "./telegram/TelegramNotifier.js";

export interface NotificationDispatchOptions {
  env?: Record<string, string | undefined> | undefined;
  fetcher?: Fetcher | undefined;
  sendEmail?: EmailSender | undefined;
  logger?: Logger | undefined;
}

export async function dispatchNotifications(
  config: NotifiersConfig | undefined,
  payload: NotificationPayload,
  options: NotificationDispatchOptions = {},
): Promise<NotificationResult[]> {
  if (!config) {
    return [];
  }
  const results: NotificationResult[] = [];
  for (const [id, notifierConfig] of Object.entries(config) as Array<
    [NotifierId, NonNullable<NotifiersConfig[NotifierId]>]
  >) {
    const notifier = createNotifier(id, notifierConfig, options);
    if (!notifierConfig.enabled) {
      results.push({ notifier: id, status: "skipped", reason: "disabled" });
      continue;
    }
    if (!severityMeetsThreshold(payload.severity, notifierConfig.minSeverity)) {
      results.push({ notifier: id, status: "skipped", reason: "severity-filter" });
      continue;
    }
    if (!notifier.isAvailable()) {
      results.push({ notifier: id, status: "skipped", reason: "unavailable" });
      continue;
    }
    try {
      results.push(await notifier.notify(payload));
    } catch (error) {
      const reason = notifierFailureReason(error);
      options.logger?.warn("notifier.dispatch.failed", {
        notifier: id,
        reason,
      });
      results.push({ notifier: id, status: "failed", reason });
    }
  }
  return results;
}

export function notificationPayloadFromResult(
  result: RunResult,
  links: NotificationPayload["links"] = {},
): NotificationPayload {
  const severity = result.summary.maxSeverity === "none" ? "info" : result.summary.maxSeverity;
  return {
    title:
      result.summary.total === 0
        ? "BoardReadyOps passed"
        : `BoardReadyOps found ${result.summary.total} ${findingWord(result.summary.total)}`,
    summary: summaryText(result.summary.total, severity),
    severity,
    findings: result.findings,
    links: {
      ...(links.reportUrl ? { reportUrl: links.reportUrl } : {}),
      ...(links.runUrl ? { runUrl: links.runUrl } : {}),
    },
  };
}

function createNotifier(
  id: NotifierId,
  config: NonNullable<NotifiersConfig[NotifierId]>,
  options: NotificationDispatchOptions,
): Notifier {
  if (id === "slack") {
    return new SlackNotifier(config as WebhookNotifierConfig, options);
  }
  if (id === "teams") {
    return new TeamsNotifier(config as WebhookNotifierConfig, options);
  }
  if (id === "telegram") {
    return new TelegramNotifier(config as TelegramNotifierConfig, options);
  }
  if (id === "discord") {
    return new DiscordNotifier(config as WebhookNotifierConfig, options);
  }
  return new EmailNotifier(config as EmailNotifierConfig, options);
}

function summaryText(total: number, severity: Severity): string {
  if (total === 0) {
    return "No findings.";
  }
  return `${total} ${severity} ${findingWord(total)}. Max severity: ${severity}.`;
}

function findingWord(total: number): string {
  return total === 1 ? "finding" : "findings";
}

function notifierFailureReason(error: unknown): string {
  const message = error instanceof Error ? error.message : "notification failed";
  return message.replace(/\bhttps?:\/\/\S+/gi, "[REDACTED_URL]").replace(/\bsmtps?:\/\/\S+/gi, "[REDACTED_SMTP_URL]");
}
