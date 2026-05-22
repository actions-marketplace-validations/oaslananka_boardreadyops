import path from "node:path";
import { fileMtimeMs } from "../../util/fs.js";
import { globFiles } from "../../util/glob.js";
import { configFor, configuredSeverity, finding, rule, shouldRun } from "../helpers.js";

const patterns: Record<string, string[]> = {
  gerber: ["**/*.gbr", "**/*.gbrjob"],
  drill: ["**/*.drl"],
  position: ["**/*.pos", "**/*position*.csv"],
  pdf: ["**/*.pdf"],
  step: ["**/*.step", "**/*.stp"],
};

export const outputsPresentRule = rule(
  {
    id: "manufacturing.outputs-present",
    title: "Required manufacturing outputs are missing or stale",
    description: "Checks required fabrication outputs and whether they are fresh relative to PCB sources.",
    rationale: "A release without current manufacturing outputs is not ready to send to a fab.",
    defaultSeverity: "high",
    appliesTo: ["pcb", "manifest"],
    configKeys: ["rules.manufacturing.outputs-present.required"],
    kicadVersions: ["9", "10", "future"],
    tags: ["fabrication", "manufacturing", "outputs"],
  },
  async (context) => {
    if (!shouldRun(context, "manufacturing.outputs-present")) {
      return [];
    }
    const required = configFor(context, "manufacturing.outputs-present").required;
    if (!Array.isArray(required) || required.length === 0) {
      return [];
    }
    const output = [];
    const newestBoard = Math.max(
      0,
      ...(
        await Promise.all(
          context.projects.flatMap((project) =>
            project.boardFiles.map((board) => fileMtimeMs(path.resolve(context.root, board))),
          ),
        )
      ).filter((value): value is number => typeof value === "number"),
    );
    for (const requiredOutput of required.filter((entry): entry is string => typeof entry === "string")) {
      const found = await globFiles(context.root, patterns[requiredOutput] ?? [`**/*${requiredOutput}*`]);
      const fresh =
        newestBoard === 0 ||
        (await Promise.all(found.map(fileMtimeMs))).some((mtime) => typeof mtime === "number" && mtime >= newestBoard);
      if (found.length === 0 || !fresh) {
        output.push(
          finding(context, {
            ruleId: "manufacturing.outputs-present",
            severity: configuredSeverity(context, "manufacturing.outputs-present", "high"),
            message: `Required manufacturing output ${requiredOutput} is ${found.length === 0 ? "missing" : "stale"}.`,
            path: ".",
            kind: "manifest",
            details: { required: requiredOutput },
          }),
        );
      }
    }
    return output;
  },
);
