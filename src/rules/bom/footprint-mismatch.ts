import { configuredSeverity, finding, rule, shouldRun } from "../helpers.js";
import { loadBomContext } from "./shared.js";

export const footprintMismatchRule = rule(
  {
    id: "bom.footprint-mismatch",
    title: "BOM footprint differs from PCB footprint",
    defaultSeverity: "medium",
    appliesTo: ["bom", "pcb"],
    configKeys: ["rules.bom.footprint-mismatch.severity"],
  },
  async (context) => {
    if (!shouldRun(context, "bom.footprint-mismatch")) {
      return [];
    }
    const { bomRows, pcbFootprints } = await loadBomContext(context);
    return bomRows
      .filter(
        (row) =>
          row.footprint &&
          pcbFootprints.has(row.reference) &&
          pcbFootprints.get(row.reference)?.footprint !== row.footprint,
      )
      .map((row) =>
        finding(context, {
          ruleId: "bom.footprint-mismatch",
          severity: configuredSeverity(context, "bom.footprint-mismatch", "medium"),
          message: `${row.reference} BOM footprint ${row.footprint} does not match PCB footprint ${pcbFootprints.get(row.reference)?.footprint}.`,
          path: row.sourcePath,
          kind: "bom",
          line: row.line,
          details: { bom: row.footprint, pcb: pcbFootprints.get(row.reference)?.footprint },
        }),
      );
  },
);
