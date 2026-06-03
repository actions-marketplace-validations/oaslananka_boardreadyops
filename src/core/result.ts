import type { ProjectContext } from "./context.js";
import type { FabricationSnapshot } from "./diff/fabrication.js";
import type { Finding, FindingSummary } from "./findings.js";

export interface RunResult {
  schemaVersion: 1;
  tool: {
    name: "boardreadyops";
    version: string;
  };
  status?: "passed" | "failed" | undefined;
  exitCode?: number | undefined;
  summary: FindingSummary;
  projects: ProjectContext[];
  findings: Finding[];
  fabrication: FabricationSnapshot;
  generatedAt: string;
}
