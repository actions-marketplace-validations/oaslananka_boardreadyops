import fg from "fast-glob";
import { toPosixPath } from "./path.js";

export async function globFiles(root: string, patterns: string[]): Promise<string[]> {
  const results = await fg(patterns, {
    cwd: root,
    absolute: true,
    dot: false,
    onlyFiles: true,
    unique: true,
    ignore: ["**/node_modules/**", "**/.git/**", "**/dist/**", "**/coverage/**"],
  });
  return results.map(toPosixPath).sort((a, b) => a.localeCompare(b));
}
