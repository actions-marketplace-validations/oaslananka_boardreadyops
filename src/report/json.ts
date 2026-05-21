import type { RunResult } from "../core/result.js";

export function formatJson(result: RunResult): string {
  return `${JSON.stringify(result, null, 2)}\n`;
}
