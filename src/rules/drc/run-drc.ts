import type { RuleContext } from "../../core/context.js";
import { isSeverity } from "../../core/findings.js";
import { configuredSeverity, rule, shouldRun } from "../helpers.js";
import { runKicadReportRule } from "../kicad-report.js";
import type { kicadSeverityToFindingSeverity } from "./severity-map.js";

export const runDrcRule = rule(
  {
    id: "drc.kicad",
    title: "KiCad DRC findings",
    defaultSeverity: "high",
    appliesTo: ["pcb"],
    configKeys: ["kicad-cli", "require-kicad", "rules.drc"],
  },
  async (context) => {
    if (!shouldRun(context, "drc.kicad")) {
      return [];
    }
    return runKicadReportRule(context, {
      command: "drc",
      groupRuleId: "drc.kicad",
      unavailableRuleId: "drc.kicad-cli-unavailable",
      unavailableMessage: "kicad-cli not available, skipped DRC.",
      resourceKind: "pcb",
      files: (project) => project.boardFiles,
      severity: drcSeverity,
    });
  },
);

function drcSeverity(
  context: RuleContext,
  kicadRule: string | undefined,
  fallback: ReturnType<typeof kicadSeverityToFindingSeverity>,
) {
  const groupRule = context.config.rules?.drc;
  if (kicadRule && typeof groupRule === "object" && groupRule !== null) {
    const override = groupRule["severity-overrides"]?.[kicadRule];
    if (isSeverity(override)) {
      return override;
    }
  }
  return configuredSeverity(context, "drc.kicad", fallback);
}
