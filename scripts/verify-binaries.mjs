import { spawnSync } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { binaryTargetForId, selectBinaryTargets } from "./build-binary.mjs";

export function main(argv = process.argv.slice(2), root = process.cwd()) {
  const target = verificationTarget(argv);
  const executable = path.join(root, target.output);

  for (const [command, ...args] of verificationCommands(executable)) {
    const result = spawnSync(command, args, {
      cwd: root,
      stdio: "inherit",
      shell: false,
    });

    if (result.error) {
      throw result.error;
    }
    if (result.status !== 0) {
      throw new Error(`Binary smoke test failed for ${target.id}: ${args.join(" ")}`);
    }
  }
}

export function currentBinaryTargetId(platform = process.platform, architecture = process.arch) {
  if (platform === "linux" && architecture === "x64") {
    return "linux-x64";
  }
  if (platform === "linux" && architecture === "arm64") {
    return "linux-arm64";
  }
  if (platform === "darwin" && architecture === "x64") {
    return "macos-x64";
  }
  if (platform === "darwin" && architecture === "arm64") {
    return "macos-arm64";
  }
  if (platform === "win32" && architecture === "x64") {
    return "windows-x64";
  }

  throw new Error(`Unsupported binary host: ${platform}/${architecture}`);
}

export function verificationCommands(executable) {
  return [
    [executable, "--help"],
    [executable, "--version"],
    [executable, "doctor"],
  ];
}

function verificationTarget(argv) {
  if (argv.length > 0) {
    const targets = selectBinaryTargets(argv);
    if (targets.length !== 1) {
      throw new Error("Binary verification requires one target");
    }
    return targets[0];
  }

  const target = binaryTargetForId(currentBinaryTargetId());
  if (!target) {
    throw new Error("Current host target is not configured");
  }
  return target;
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) {
  main();
}
