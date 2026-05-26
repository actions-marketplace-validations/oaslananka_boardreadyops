import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function readPnpmLicenseReport(root, args) {
  const commandLine = pnpmLicenseCommandLine(args);
  const { stdout } = await execFileAsync(commandLine.command, commandLine.args, {
    cwd: root,
    maxBuffer: 20 * 1024 * 1024,
    windowsHide: true,
  });
  return parsePnpmLicenseReport(stdout);
}

export function pnpmLicenseCommandLine(args, platform = process.platform) {
  const pnpmArgs = ["licenses", "list", ...args];
  if (platform === "win32") {
    return { command: process.env.ComSpec ?? "cmd.exe", args: ["/d", "/s", "/c", "pnpm.cmd", ...pnpmArgs] };
  }
  return { command: "pnpm", args: pnpmArgs };
}

function parsePnpmLicenseReport(stdout) {
  const trimmed = stdout.trim();
  if (trimmed === "" || trimmed === "No licenses in packages found") {
    return {};
  }
  return JSON.parse(trimmed);
}
