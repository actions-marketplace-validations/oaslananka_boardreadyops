import type { Finding } from "../core/findings.js";
import type { RunResult } from "../core/result.js";

export function formatSarif(result: RunResult): string {
  const rules = new Map<string, Finding>();
  for (const finding of result.findings) {
    if (!rules.has(finding.ruleId)) {
      rules.set(finding.ruleId, finding);
    }
  }
  const sarif = {
    version: "2.1.0",
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    runs: [
      {
        tool: {
          driver: {
            name: "BoardReadyOps",
            informationUri: "https://github.com/oaslananka/boardreadyops",
            version: result.tool.version,
            rules: [...rules.values()].map((finding) => ({
              id: finding.ruleId,
              name: finding.ruleId,
              shortDescription: { text: finding.ruleId },
              fullDescription: { text: finding.message },
              helpUri: finding.references?.[0] ?? "https://github.com/oaslananka/boardreadyops/tree/main/docs/rules",
              defaultConfiguration: {
                level: sarifLevel(finding.severity),
              },
            })),
          },
        },
        results: result.findings.map((finding) => ({
          ruleId: finding.ruleId,
          level: sarifLevel(finding.severity),
          message: { text: finding.message },
          locations: [
            {
              physicalLocation: {
                artifactLocation: {
                  uri: finding.resource.path,
                },
                region: finding.location?.region ?? {
                  startLine: finding.location?.line ?? 1,
                  startColumn: finding.location?.column ?? 1,
                },
              },
            },
          ],
          partialFingerprints: {
            primaryLocationLineHash: finding.fingerprint,
          },
          properties: {
            severity: finding.severity,
            resourceKind: finding.resource.kind,
            details: finding.details,
          },
        })),
      },
    ],
  };
  return `${JSON.stringify(sarif, null, 2)}\n`;
}

function sarifLevel(severity: Finding["severity"]): "error" | "warning" | "note" | "none" {
  if (severity === "critical" || severity === "high") {
    return "error";
  }
  if (severity === "medium" || severity === "low") {
    return "warning";
  }
  return "note";
}
