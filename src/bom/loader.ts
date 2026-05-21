import { readTextFile } from "../util/fs.js";
import { normalizeBomRows } from "./normalizer.js";
import type { BomRow } from "./types.js";

export async function loadBom(file: string): Promise<BomRow[]> {
  const text = await readTextFile(file);
  const delimiter = file.toLowerCase().endsWith(".tsv") ? "\t" : ",";
  return normalizeBomRows(parseDelimited(text, delimiter), file);
}

export function parseDelimited(text: string, delimiter = ","): Record<string, string>[] {
  const rows = parseRows(text, delimiter);
  const header = rows.shift()?.map((cell) => cell.trim()) ?? [];
  return rows
    .filter((row) => row.some((cell) => cell.trim() !== ""))
    .map((row) => Object.fromEntries(header.map((key, index) => [key, row[index]?.trim() ?? ""])));
}

function parseRows(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === delimiter) {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell.replace(/\r$/, ""));
  rows.push(row);
  return rows;
}
