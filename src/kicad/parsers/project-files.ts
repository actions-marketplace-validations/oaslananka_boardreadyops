import fs from "node:fs/promises";
import { parseJsonValue } from "../../util/json.js";
import { type KicadVariant, parseVariants } from "../variants.js";

export async function readDesignFile(file: string): Promise<string | undefined> {
  try {
    return await fs.readFile(file, "utf8");
  } catch {
    return undefined;
  }
}

export interface KicadProjectMetadata {
  variants: KicadVariant[];
  jobsets: string[];
  differentialPairPrefixes: string[];
}

export function parseProjectMetadata(projectFileContent: string): KicadProjectMetadata {
  const variants = parseVariants(projectFileContent);
  const parsed = parseJsonValue(projectFileContent);
  if (parsed && typeof parsed === "object") {
    return {
      variants,
      jobsets: collectStrings(parsed, ["jobset", "jobsets", "jobs_file", "jobset_file"]),
      differentialPairPrefixes: collectStrings(parsed, [
        "diff_pair_prefix",
        "differential_pair_prefix",
        "diff_pair_prefixes",
      ]),
    };
  }
  return {
    variants,
    jobsets: [...projectFileContent.matchAll(/\(jobset\s+"([^"]+)"/g)].map((match) => match[1] ?? ""),
    differentialPairPrefixes: [...projectFileContent.matchAll(/\(diff(?:erential)?_pair_prefix\s+"([^"]+)"/g)].map(
      (match) => match[1] ?? "",
    ),
  };
}

function collectStrings(input: unknown, keys: string[]): string[] {
  const found: string[] = [];
  const stack = [input];
  while (stack.length > 0) {
    const item = stack.pop();
    if (Array.isArray(item)) {
      for (const entry of item) {
        if (typeof entry !== "string") {
          stack.push(entry);
        }
      }
      continue;
    }
    if (item && typeof item === "object") {
      for (const [key, value] of Object.entries(item)) {
        if (keys.includes(key)) {
          if (typeof value === "string") {
            found.push(value);
          } else if (Array.isArray(value)) {
            found.push(...value.filter((entry): entry is string => typeof entry === "string"));
          }
        }
        stack.push(value);
      }
    }
  }
  return [...new Set(found)];
}
