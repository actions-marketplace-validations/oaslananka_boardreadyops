import type { FixSuggestion } from "../core/findings.js";
import type { RunResult } from "../core/result.js";

export function formatJunit(result: RunResult): string {
  const cases = result.findings
    .map((finding) => {
      const failure =
        finding.severity === "info"
          ? ""
          : `<failure message="${xml(finding.message)}">${failureBody(finding.fix, finding.details ?? {})}</failure>`;
      return `<testcase classname="${xml(finding.ruleId)}" name="${xml(finding.resource.path)}">${failure}</testcase>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><testsuite name="boardreadyops" tests="${result.findings.length}" failures="${result.summary.total - result.summary.info}">${cases}</testsuite>\n`;
}

function xml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function failureBody(fix: FixSuggestion | undefined, details: Record<string, unknown>): string {
  return xml(JSON.stringify(fix ? { ...details, fix } : details));
}
