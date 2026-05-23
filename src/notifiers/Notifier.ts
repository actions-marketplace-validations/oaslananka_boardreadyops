import type { BaseNotifierConfig } from "../core/config.js";
import { type Finding, type Severity, severityRankValue } from "../core/findings.js";

export type NotifierId = "slack" | "teams" | "telegram" | "discord" | "email";

export interface NotificationPayload {
  title: string;
  summary: string;
  severity: Severity;
  findings: Finding[];
  links: {
    reportUrl?: string | undefined;
    runUrl?: string | undefined;
  };
}

export interface NotificationResult {
  notifier: NotifierId;
  status: "sent" | "skipped" | "failed";
  reason?: string | undefined;
}

export interface Notifier {
  id: NotifierId;
  isAvailable(): boolean;
  notify(payload: NotificationPayload): Promise<NotificationResult>;
}

export function isNotifierEnabled(config: BaseNotifierConfig | undefined): boolean {
  return config?.enabled === true;
}

export function severityMeetsThreshold(severity: Severity, minSeverity: Severity | undefined): boolean {
  return minSeverity ? severityRankValue(severity) >= severityRankValue(minSeverity) : true;
}

function topFindings(findings: Finding[], limit = 5): Finding[] {
  return findings.slice(0, limit);
}

export function renderNotificationText(payload: NotificationPayload): string {
  const lines = [payload.title, payload.summary];
  if (payload.links.runUrl) {
    lines.push(`Run: ${payload.links.runUrl}`);
  }
  if (payload.links.reportUrl) {
    lines.push(`Report: ${payload.links.reportUrl}`);
  }
  if (payload.findings.length > 0) {
    lines.push("Top findings:");
    for (const finding of topFindings(payload.findings)) {
      lines.push(`- [${finding.severity}] ${finding.ruleId}: ${finding.message}`);
    }
  }
  return lines.join("\n");
}
