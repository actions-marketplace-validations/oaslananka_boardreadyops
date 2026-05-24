import fs from "node:fs/promises";
import path from "node:path";

export function toPosixPath(value: string): string {
  return value.replace(/\\/g, "/");
}

export function normalizePathInput(value: string): string {
  return path.sep === "\\" ? value.replace(/\//g, "\\") : value.replace(/\\/g, "/");
}

export function normalizeRelative(root: string, target: string): string {
  const relative = path.relative(root, target);
  return toPosixPath(relative === "" ? "." : relative);
}

export function isInside(parent: string, child: string): boolean {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

export async function displayPath(root: string, target: string): Promise<string> {
  const absoluteRoot = await resolveExistingPathAlias(path.resolve(root));
  const absoluteTarget = path.resolve(target);
  const comparableTarget = await resolveExistingPathAlias(absoluteTarget);
  if (isInside(absoluteRoot, comparableTarget)) {
    return normalizeRelative(absoluteRoot, comparableTarget);
  }
  if (isInside(absoluteRoot, absoluteTarget)) {
    return normalizeRelative(absoluteRoot, absoluteTarget);
  }
  return `<outside-root>/${path.basename(absoluteTarget)}`;
}

export async function resolveExistingPathAlias(target: string): Promise<string> {
  const missingSegments: string[] = [];
  let current = path.resolve(target);
  while (true) {
    try {
      const real = await fs.realpath(current);
      return missingSegments.length > 0 ? path.join(real, ...missingSegments.reverse()) : real;
    } catch {
      const parent = path.dirname(current);
      if (parent === current) {
        return target;
      }
      missingSegments.push(path.basename(current));
      current = parent;
    }
  }
}
