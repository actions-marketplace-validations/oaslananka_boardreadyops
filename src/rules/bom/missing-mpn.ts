import { configFor, configuredSeverity, finding, refIgnored, rule, shouldRun } from "../helpers.js";
import { loadBomContext } from "./shared.js";

export const missingMpnRule = rule(
  {
    id: "bom.missing-mpn",
    title: "BOM row is missing manufacturer part number",
    defaultSeverity: "high",
    appliesTo: ["bom", "schematic"],
    configKeys: ["rules.bom.missing-mpn.ignore-refs"],
  },
  async (context) => {
    if (!shouldRun(context, "bom.missing-mpn")) {
      return [];
    }
    const config = configFor(context, "bom.missing-mpn");
    const { bomRows, schematicRows } = await loadBomContext(context);
    const rows = bomRows.length > 0 ? bomRows : schematicRows;
    return rows
      .filter((row) => !row.dnp && !refIgnored(row.reference, config["ignore-refs"]) && !row.mpn)
      .map((row) =>
        finding(context, {
          ruleId: "bom.missing-mpn",
          severity: configuredSeverity(context, "bom.missing-mpn", "high"),
          message: `${row.reference} is missing an MPN.`,
          path: row.sourcePath,
          kind: row.sourceKind === "bom" ? "bom" : "schematic",
          line: row.line,
          details: { reference: row.reference },
        }),
      );
  },
);
