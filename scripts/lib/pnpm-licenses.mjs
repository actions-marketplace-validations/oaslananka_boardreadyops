import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function readPnpmLicenseReport(root, args) {
  const { stdout } = await execFileAsync("pnpm", ["licenses", "list", ...args], {
    cwd: root,
    maxBuffer: 20 * 1024 * 1024,
    windowsHide: true,
  });
  return parsePnpmLicenseReport(stdout);
}

function parsePnpmLicenseReport(stdout) {
  const trimmed = stdout.trim();
  if (trimmed === "" || trimmed === "No licenses in packages found") {
    return {};
  }
  return JSON.parse(trimmed);
}
