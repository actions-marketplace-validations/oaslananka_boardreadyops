import { type CommonCliOptions, runCommand } from "./run.js";

export async function checkCommand(
  ruleOrPath: string | undefined,
  pathInput: string | undefined,
  options: CommonCliOptions,
  streams: { stdout: NodeJS.WritableStream; stderr: NodeJS.WritableStream },
): Promise<number> {
  if (!ruleOrPath) {
    return runCommand(pathInput, options, streams, "check");
  }
  if (!pathInput && isPathLike(ruleOrPath)) {
    return runCommand(ruleOrPath, options, streams, "check");
  }
  return runCommand(pathInput, { ...options, rule: [ruleOrPath] }, streams, "check");
}

function isPathLike(value: string): boolean {
  return (
    value === "." ||
    value === ".." ||
    value.startsWith("./") ||
    value.startsWith("../") ||
    value.startsWith("/") ||
    value.includes("\\") ||
    value.includes("/") ||
    value.endsWith(".kicad_pro")
  );
}
