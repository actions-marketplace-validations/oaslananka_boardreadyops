import type { BomRow } from "../bom/types.js";
import { readDesignFile } from "./parsers/project-files.js";

export { extractBlocks } from "./sexpr.js";

import { extractBlocks } from "./sexpr.js";

export interface ParsedSchematic {
  components: BomRow[];
  netLabels: Set<string>;
  connectedPins: { designator: string; pin: string; net: string }[];
  variantProperties: Map<string, string>;
  hopOverWireCrossings: number;
}

export async function parseSchematic(file: string): Promise<ParsedSchematic> {
  const text = (await readDesignFile(file)) ?? "";
  const components: BomRow[] = [];
  for (const block of extractBlocks(text, "symbol")) {
    const reference = propertyValue(block, "Reference");
    if (!reference || !/\d/.test(reference)) {
      continue;
    }
    const variant = propertyValue(block, "Variant");
    components.push({
      reference,
      value: propertyValue(block, "Value"),
      footprint: propertyValue(block, "Footprint"),
      manufacturer: propertyValue(block, "Manufacturer") ?? propertyValue(block, "Mfr"),
      mpn: propertyValue(block, "MPN") ?? propertyValue(block, "Manufacturer Part Number"),
      dnp: boolValue(propertyValue(block, "DNP") ?? propertyValue(block, "Dopopulate")),
      raw: variant ? { Variant: variant } : undefined,
      sourcePath: file,
      sourceKind: "schematic",
    });
  }
  const netLabels = new Set<string>();
  for (const match of text.matchAll(/\((?:label|global_label|hierarchical_label)\s+"([^"]+)"/g)) {
    const label = match[1];
    if (label) {
      netLabels.add(label);
    }
  }
  const connectedPins = [
    ...text.matchAll(/\(pin\s+"?([^"\s)]+)"?\s+\(net\s+"?([^"\s)]+)"?\)\s+\(ref\s+"?([^"\s)]+)"?\)/g),
  ].map((match) => ({
    pin: match[1] ?? "",
    net: match[2] ?? "",
    designator: match[3] ?? "",
  }));
  return {
    components,
    netLabels,
    connectedPins,
    variantProperties: new Map(
      components
        .map((component) => [component.reference, component.raw?.Variant])
        .filter((entry): entry is [string, string] => typeof entry[1] === "string"),
    ),
    hopOverWireCrossings: [...text.matchAll(/\(hop_over\b/g)].length,
  };
}

function propertyValue(block: string, property: string): string | undefined {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`\\(property\\s+"${escaped}"\\s+"((?:[^"\\\\]|\\\\.)*)"`).exec(block);
  return match?.[1]?.replace(/\\"/g, '"');
}

function boolValue(value: string | undefined): boolean {
  return /^(true|yes|1|dnp)$/i.test(value ?? "");
}
