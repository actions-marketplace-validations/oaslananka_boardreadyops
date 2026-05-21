import { configuredSeverity, finding, rule, shouldRun } from "../helpers.js";
import { loadBomContext } from "./shared.js";

export const eolDetectionRule = rule(
  {
    id: "bom.eol-detection",
    title: "BOM part is marked EOL",
    defaultSeverity: "high",
    appliesTo: ["bom"],
    configKeys: ["rules.bom.eol-detection.severity"],
  },
  async (context) => {
    if (!shouldRun(context, "bom.eol-detection")) {
      return [];
    }
    const { bomRows } = await loadBomContext(context);
    return bomRows
      .filter((row) => !row.dnp && /(eol|obsolete|not recommended|nrnd)/i.test(row.lifecycle ?? ""))
      .map((row) =>
        finding(context, {
          ruleId: "bom.eol-detection",
          severity: configuredSeverity(context, "bom.eol-detection", "high"),
          message: `${row.reference} is marked ${row.lifecycle}.`,
          path: row.sourcePath,
          kind: "bom",
          line: row.line,
          details: { lifecycle: row.lifecycle, mpn: row.mpn },
        }),
      );
  },
);
