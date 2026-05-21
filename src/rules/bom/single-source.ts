import { configuredSeverity, finding, rule, shouldRun } from "../helpers.js";
import { loadBomContext } from "./shared.js";

export const singleSourceRule = rule(
  {
    id: "bom.single-source",
    title: "BOM part has a single supplier",
    defaultSeverity: "medium",
    appliesTo: ["bom"],
    configKeys: ["rules.bom.single-source.severity"],
  },
  async (context) => {
    if (!shouldRun(context, "bom.single-source")) {
      return [];
    }
    const { bomRows } = await loadBomContext(context);
    return bomRows
      .filter((row) => !row.dnp && row.mpn && row.suppliers?.length === 1)
      .map((row) =>
        finding(context, {
          ruleId: "bom.single-source",
          severity: configuredSeverity(context, "bom.single-source", "medium"),
          message: `${row.reference} uses ${row.mpn} with only one supplier listed.`,
          path: row.sourcePath,
          kind: "bom",
          line: row.line,
          details: { mpn: row.mpn, supplier: row.suppliers?.[0] },
        }),
      );
  },
);
