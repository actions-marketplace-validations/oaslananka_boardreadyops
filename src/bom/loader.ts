import { parseDelimitedRows } from "../util/delimited.js";
import { readTextFile } from "../util/fs.js";
import { normalizeBomRows } from "./normalizer.js";
import type { BomRow } from "./types.js";

export async function loadBom(file: string): Promise<BomRow[]> {
  const text = await readTextFile(file);
  const delimiter = file.toLowerCase().endsWith(".tsv") ? "\t" : ",";
  return normalizeBomRows(parseDelimited(text, delimiter), file);
}

export function parseDelimited(text: string, delimiter = ","): Record<string, string>[] {
  const rows = parseDelimitedRows(text, delimiter);
  const header = rows.shift()?.map((cell) => cell.trim()) ?? [];
  return rows
    .filter((row) => row.some((cell) => cell.trim() !== ""))
    .map((row) => Object.fromEntries(header.map((key, index) => [key, row[index]?.trim() ?? ""])));
}
