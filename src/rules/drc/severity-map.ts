import type { Severity } from "../../core/findings.js";

export function kicadSeverityToFindingSeverity(value: string | undefined): Severity {
  if (!value) {
    return "high";
  }
  if (/critical|fatal/i.test(value)) {
    return "critical";
  }
  if (/error|violation/i.test(value)) {
    return "high";
  }
  if (/warn/i.test(value)) {
    return "medium";
  }
  return "low";
}
