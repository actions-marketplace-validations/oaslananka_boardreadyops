import { splitRefs } from "../util/strings.js";
import type { BomRow } from "./types.js";

const aliases: Record<
  keyof Pick<BomRow, "reference" | "value" | "footprint" | "manufacturer" | "mpn" | "lifecycle">,
  string[]
> = {
  reference: ["reference", "refs", "ref", "designator", "references"],
  value: ["value", "part", "description"],
  footprint: ["footprint", "package", "pcb footprint"],
  manufacturer: ["manufacturer", "mfr", "maker"],
  mpn: ["mpn", "manufacturer part number", "mfr part number", "part number", "manufacturer_part_number"],
  lifecycle: ["lifecycle", "status", "availability"],
};

export function normalizeBomRows(rows: Record<string, string>[], sourcePath: string): BomRow[] {
  const output: BomRow[] = [];
  for (const [index, raw] of rows.entries()) {
    const referenceValue = getField(raw, aliases.reference);
    if (!referenceValue) {
      continue;
    }
    const refs = splitRefs(referenceValue);
    const quantity = Number(getField(raw, ["quantity", "qty"]));
    const suppliers = supplierValues(raw);
    for (const reference of refs) {
      output.push({
        reference,
        value: getField(raw, aliases.value),
        footprint: getField(raw, aliases.footprint),
        manufacturer: getField(raw, aliases.manufacturer),
        mpn: getField(raw, aliases.mpn),
        suppliers,
        lifecycle: getField(raw, aliases.lifecycle),
        dnp: isDnp(getField(raw, ["dnp", "do not populate", "populate"])),
        sourcePath,
        sourceKind: "bom",
        line: index + 2,
        raw,
        groupedReferences: refs,
        quantity: Number.isFinite(quantity) ? quantity : undefined,
      });
    }
  }
  return output;
}

function getField(row: Record<string, string>, names: string[]): string | undefined {
  const normalized = new Map(Object.entries(row).map(([key, value]) => [key.trim().toLowerCase(), value.trim()]));
  for (const name of names) {
    const value = normalized.get(name);
    if (value) {
      return value;
    }
  }
  return undefined;
}

function supplierValues(row: Record<string, string>): string[] {
  return Object.entries(row)
    .filter(([key, value]) => /supplier|vendor|distributor/i.test(key) && value.trim() !== "")
    .map(([, value]) => value.trim());
}

function isDnp(value: string | undefined): boolean {
  if (!value) {
    return false;
  }
  if (/^(false|no|0|yes)$/i.test(value) && !/^yes$/i.test(value)) {
    return false;
  }
  return /^(true|yes|1|dnp|do not populate|not fitted)$/i.test(value);
}
