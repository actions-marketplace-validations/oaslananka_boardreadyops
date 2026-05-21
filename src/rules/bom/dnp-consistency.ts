import { configuredSeverity, finding, rule, shouldRun } from "../helpers.js";
import { loadBomContext } from "./shared.js";

export const dnpConsistencyRule = rule(
  {
    id: "bom.dnp-consistency",
    title: "BOM DNP state differs from PCB population state",
    defaultSeverity: "medium",
    appliesTo: ["bom", "pcb"],
    configKeys: ["rules.bom.dnp-consistency.severity"],
  },
  async (context) => {
    if (!shouldRun(context, "bom.dnp-consistency")) {
      return [];
    }
    const { bomRows, pcbFootprints } = await loadBomContext(context);
    return bomRows
      .filter(
        (row) =>
          pcbFootprints.has(row.reference) && Boolean(row.dnp) !== Boolean(pcbFootprints.get(row.reference)?.dnp),
      )
      .map((row) =>
        finding(context, {
          ruleId: "bom.dnp-consistency",
          severity: configuredSeverity(context, "bom.dnp-consistency", "medium"),
          message: `${row.reference} has inconsistent DNP state between BOM and PCB.`,
          path: row.sourcePath,
          kind: "bom",
          line: row.line,
          details: { bomDnp: Boolean(row.dnp), pcbDnp: Boolean(pcbFootprints.get(row.reference)?.dnp) },
        }),
      );
  },
);
