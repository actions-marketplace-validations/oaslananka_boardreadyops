import path from "node:path";
import { pathExists } from "../../util/fs.js";
import { configuredSeverity, finding, rule, shouldRun } from "../helpers.js";

export const fabNotesRule = rule(
  {
    id: "manufacturing.fab-notes",
    title: "Fabrication notes are missing",
    defaultSeverity: "medium",
    appliesTo: ["manifest"],
    configKeys: ["rules.manufacturing.fab-notes.enabled"],
  },
  async (context) => {
    if (!shouldRun(context, "manufacturing.fab-notes")) {
      return [];
    }
    const candidates = ["fab/README.md", "manufacturing/notes.md", "docs/fab-notes.md"];
    for (const candidate of candidates) {
      if (await pathExists(path.resolve(context.root, candidate))) {
        return [];
      }
    }
    return [
      finding(context, {
        ruleId: "manufacturing.fab-notes",
        severity: configuredSeverity(context, "manufacturing.fab-notes", "medium"),
        message: "Fabrication notes file was not found.",
        path: ".",
        kind: "manifest",
      }),
    ];
  },
);
