import type { Finding } from "../core/findings.js";

export function formatAnnotation(finding: Finding): string {
  const command =
    finding.severity === "critical" || finding.severity === "high"
      ? "error"
      : finding.severity === "medium" || finding.severity === "low"
        ? "warning"
        : "notice";
  const params = [
    `file=${escapeProperty(finding.resource.path)}`,
    finding.location?.line ? `line=${finding.location.line}` : undefined,
    finding.location?.column ? `col=${finding.location.column}` : undefined,
    `title=${escapeProperty(finding.ruleId)}`,
  ].filter(Boolean);
  return `::${command} ${params.join(",")}::${escapeData(finding.message)}`;
}

export function emitAnnotations(findings: Finding[], stream: NodeJS.WritableStream = process.stdout): void {
  for (const finding of findings) {
    stream.write(`${formatAnnotation(finding)}\n`);
  }
}

function escapeData(value: string): string {
  return value.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
}

function escapeProperty(value: string): string {
  return escapeData(value).replace(/:/g, "%3A").replace(/,/g, "%2C");
}
