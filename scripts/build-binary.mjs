import { spawnSync } from "node:child_process";
import { chmod, mkdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const BINARY_DIR = "dist/binary";
const ENTRYPOINT = "src/cli/binary.ts";

export const BINARY_TARGETS = Object.freeze([
  binaryTarget("linux-x64", "bun-linux-x64-baseline", "boardreadyops-linux-x64"),
  binaryTarget("linux-arm64", "bun-linux-arm64", "boardreadyops-linux-arm64"),
  binaryTarget("macos-x64", "bun-darwin-x64-baseline", "boardreadyops-macos-x64"),
  binaryTarget("macos-arm64", "bun-darwin-arm64", "boardreadyops-macos-arm64"),
  binaryTarget("windows-x64", "bun-windows-x64", "boardreadyops-win-x64.exe"),
]);

export async function main(argv = process.argv.slice(2), root = process.cwd()) {
  const targets = selectBinaryTargets(argv);
  await mkdir(path.join(root, BINARY_DIR), { recursive: true });

  for (const target of targets) {
    buildBinary(root, target);
    if (!target.asset.endsWith(".exe")) {
      await chmod(path.join(root, target.output), 0o755);
    }
  }
}

export function selectBinaryTargets(argv) {
  const targetId = readTargetArgument(argv);
  if (!targetId) {
    return BINARY_TARGETS;
  }

  const target = binaryTargetForId(targetId);
  if (!target) {
    throw new Error(`Unsupported binary target: ${targetId}`);
  }

  return [target];
}

export function binaryTargetForId(id) {
  return BINARY_TARGETS.find((target) => target.id === id);
}

export function binaryTargetIds(targets) {
  return targets.map((target) => target.id);
}

function binaryTarget(id, bunTarget, asset) {
  return Object.freeze({
    id,
    bunTarget,
    asset,
    output: path.posix.join(BINARY_DIR, asset),
  });
}

function buildBinary(root, target) {
  const bun = process.env.BUN_BINARY ?? "bun";
  const result = spawnSync(
    bun,
    ["build", "--compile", `--target=${target.bunTarget}`, ENTRYPOINT, "--outfile", target.output],
    {
      cwd: root,
      stdio: "inherit",
      shell: false,
    },
  );

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`Bun failed to build ${target.id}`);
  }
}

function readTargetArgument(argv) {
  let targetId;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--") {
      continue;
    }
    if (argument === "--target") {
      targetId = argv[index + 1];
      index += 1;
    } else if (argument.startsWith("--target=")) {
      targetId = argument.slice("--target=".length);
    } else {
      throw new Error(`Unsupported binary build argument: ${argument}`);
    }

    if (!targetId) {
      throw new Error("Missing value for --target");
    }
  }
  return targetId;
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) {
  await main();
}
