import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathExists } from "../util/fs.js";
import { runProcess } from "../util/process.js";
import { redactControlCharacters } from "../util/strings.js";
import { type KicadDiagnostic, parseKicadDiagnostics } from "./parsers/drc-report.js";
import { defaultKicadCliCandidates } from "./paths.js";

export interface KicadCli {
  found: boolean;
  path?: string;
  version?: string;
}

export async function detectKicadCli(explicit?: string): Promise<KicadCli> {
  const candidates = explicit && explicit.trim() !== "" ? [explicit] : defaultKicadCliCandidates();
  for (const candidate of candidates) {
    if (candidate.includes(path.sep) && !(await pathExists(candidate))) {
      continue;
    }
    const version = await runProcess(candidate, ["version"], { timeoutMs: 10_000, maxStderrBytes: 64 * 1024 });
    if (version.code === 0) {
      return {
        found: true,
        path: candidate,
        version: redactControlCharacters(version.stdout || version.stderr).trim(),
      };
    }
    const dashed = await runProcess(candidate, ["--version"], { timeoutMs: 10_000, maxStderrBytes: 64 * 1024 });
    if (dashed.code === 0) {
      return { found: true, path: candidate, version: redactControlCharacters(dashed.stdout || dashed.stderr).trim() };
    }
  }
  return { found: false };
}

export async function runKicadReport(
  cliPath: string,
  kind: "drc" | "erc",
  inputFile: string,
  _variant?: string,
): Promise<{ status: "passed" | "failed"; diagnostics: KicadDiagnostic[]; error?: string }> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "boardreadyops-"));
  const output = path.join(tempDir, `${kind}.json`);
  const args =
    kind === "drc"
      ? ["pcb", "drc", "--format", "json", "--output", output, inputFile]
      : ["sch", "erc", "--format", "json", "--output", output, inputFile];
  const result = await runProcess(cliPath, args, {
    timeoutMs: 120_000,
    maxStdoutBytes: 256 * 1024,
    maxStderrBytes: 256 * 1024,
  });
  let reportText = "";
  try {
    reportText = await fs.readFile(output, "utf8");
  } catch {
    reportText = "";
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
  }
  try {
    const diagnostics = parseKicadDiagnostics(reportText, kind);
    if (result.code === 0) {
      return { status: diagnostics.length > 0 ? "failed" : "passed", diagnostics };
    }
    if (diagnostics.length > 0) {
      return { status: "failed", diagnostics };
    }
  } catch {
    // Fall through to textual error.
  }
  const outputText = redactControlCharacters(`${result.stdout}\n${result.stderr}\n${reportText}`).trim();
  return {
    status: result.code === 0 ? "passed" : "failed",
    diagnostics: [],
    error: result.timedOut ? `${kind.toUpperCase()} timed out` : outputText,
  };
}
