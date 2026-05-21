import path from "node:path";
import type { RuleContext } from "../../core/context.js";
import { parseSchematic } from "../../kicad/schematic.js";

export function resolvePinmap(context: Pick<RuleContext, "root" | "options" | "config">): string | undefined {
  const configured = context.options.pinmap || context.config.projects?.find((project) => project.pinmap)?.pinmap;
  return configured ? path.resolve(context.root, configured) : undefined;
}

export async function schematicNetLabels(context: Pick<RuleContext, "root" | "projects">): Promise<Set<string>> {
  const labels = new Set<string>();
  for (const project of context.projects) {
    for (const schematic of project.schematicFiles) {
      const parsed = await parseSchematic(path.resolve(context.root, schematic));
      for (const label of parsed.netLabels) {
        labels.add(label);
      }
    }
  }
  return labels;
}
