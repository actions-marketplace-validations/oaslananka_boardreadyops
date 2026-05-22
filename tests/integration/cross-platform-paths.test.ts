import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runCli } from "../../src/cli/index.js";
import { runPipeline } from "../../src/core/pipeline.js";

describe("cross-platform path handling", () => {
  it("resolves config project paths with mixed separators relative to the repo root", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "boardreadyops-paths-"));
    const unicodeProjectName = "Üretim Çağrı #&%+";
    const projectDir = path.join(root, "boards", unicodeProjectName);
    const nestedCwd = path.join(root, "nested", "cwd");
    await fs.mkdir(projectDir, { recursive: true });
    await fs.mkdir(path.join(root, "configs"), { recursive: true });
    await fs.mkdir(nestedCwd, { recursive: true });
    await writeMinimalProject(projectDir, "weird", "prototype");

    await fs.writeFile(
      path.join(root, "configs", "boardreadyops.yml"),
      [
        "version: 1",
        "fail-on: never",
        "projects:",
        `  - path: '${["boards", unicodeProjectName, "weird.kicad_pro"].join("\\")}'`,
        "    rules:",
        "      release.version-format:",
        "        enabled: false",
        "rules:",
        "  drc.kicad:",
        "    enabled: false",
        "  erc.kicad:",
        "    enabled: false",
        "  release.changelog-present:",
        "    enabled: false",
        "report:",
        "  json: reports/findings.json",
        "",
      ].join("\n"),
      "utf8",
    );

    const previousCwd = process.cwd();
    process.chdir(nestedCwd);
    try {
      const code = await runCli(
        ["run", "../..", "--config", "configs/boardreadyops.yml", "--rule", "release.version-format"],
        memoryStreams(),
      );

      expect(code).toBe(0);
      const report = JSON.parse(await fs.readFile(path.join(root, "reports", "findings.json"), "utf8"));
      expect(report.summary.total).toBe(0);
      await expect(fs.stat(path.join(nestedCwd, "reports", "findings.json"))).rejects.toThrow();
    } finally {
      process.chdir(previousCwd);
    }
  });

  it("redacts absolute repo prefixes from default configuration errors", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "boardreadyops-redacted-path-"));
    await writeMinimalProject(root, "board", "1.0.0");
    const rootInput = (await createRootAlias(root)) ?? root;
    const missingConfig = path.join(rootInput, "configs", "missing.yml");
    const streams = memoryStreams();

    expect(await runCli(["run", rootInput, "--config", missingConfig], streams)).toBe(2);
    expect(streams.stderrText()).toContain("config file not found: configs/missing.yml");
    expect(streams.stderrText()).not.toContain(root);
    expect(streams.stderrText()).not.toContain(rootInput);
  });

  it("passes KiCad paths containing shell metacharacters as subprocess arguments", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "boardreadyops-kicad-paths-"));
    const projectDir = path.join(root, "Project With Spaces #&%+");
    const toolsDir = path.join(root, "tools with spaces");
    const recordFile = path.join(root, "kicad-args.jsonl");
    await fs.mkdir(projectDir, { recursive: true });
    await fs.mkdir(toolsDir, { recursive: true });
    await writeMinimalProject(projectDir, "board", "1.0.0");
    const cli = await writeRecordingKicadCli(toolsDir, recordFile);

    const result = await runPipeline({ path: root, kicadCli: cli, rules: ["drc.kicad"], failOn: "never" });

    expect(result.findings.map(({ ruleId, message }) => ({ ruleId, message }))).toEqual([]);
    const calls = (await fs.readFile(recordFile, "utf8"))
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as string[]);
    const drcCall = calls.find((args) => args.includes("drc"));
    const inputPath = drcCall?.at(-1);
    expect(inputPath).toBeDefined();
    expect(await fs.realpath(inputPath ?? "")).toBe(await fs.realpath(path.join(projectDir, "board.kicad_pcb")));
  });

  it("discovers projects through symlinked roots and long nested paths when the OS supports them", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "boardreadyops-long-paths-"));
    const longProjectDir = path.join(
      root,
      "segment-001234567890123456789",
      "segment-101234567890123456789",
      "segment-201234567890123456789",
      "segment-301234567890123456789",
      "segment-401234567890123456789",
      "segment-501234567890123456789",
      "segment-601234567890123456789",
      "segment-701234567890123456789",
      "segment-801234567890123456789",
      "Project With Unicode Çağrı",
    );
    expect(longProjectDir.length).toBeGreaterThan(260);
    try {
      await fs.mkdir(longProjectDir, { recursive: true });
      await writeMinimalProject(longProjectDir, "long", "1.0.0");
    } catch (error) {
      if (isUnsupportedLongPath(error)) {
        return;
      }
      throw error;
    }

    const link = path.join(root, "linked-root");
    try {
      await fs.symlink(longProjectDir, link, process.platform === "win32" ? "junction" : "dir");
    } catch (error) {
      if (isUnsupportedSymlink(error)) {
        return;
      }
      throw error;
    }

    const result = await runPipeline({ path: link, rules: ["manifest.project-discovery"], failOn: "never" });

    expect(result.projects).toHaveLength(1);
    expect(result.findings.filter((finding) => finding.ruleId === "manifest.project-discovery")).toEqual([]);
  });

  it("discovers projects through Windows UNC roots when the runner exposes a local share", async () => {
    if (process.platform !== "win32") {
      return;
    }

    const root = await fs.mkdtemp(path.join(os.tmpdir(), "boardreadyops-unc-"));
    await writeMinimalProject(root, "unc", "1.0.0");
    const parsed = path.parse(root);
    const drive = parsed.root.at(0);
    if (!drive) {
      return;
    }
    const uncRoot = `\\\\localhost\\${drive}$\\${root.slice(parsed.root.length).split(path.sep).join("\\")}`;
    try {
      await fs.stat(uncRoot);
    } catch (error) {
      if (isUnavailableUnc(error)) {
        return;
      }
      throw error;
    }

    const result = await runPipeline({ path: uncRoot, rules: ["manifest.project-discovery"], failOn: "never" });

    expect(result.projects).toHaveLength(1);
    expect(result.findings.filter((finding) => finding.ruleId === "manifest.project-discovery")).toEqual([]);
  });
});

async function writeMinimalProject(root: string, name: string, revision: string): Promise<void> {
  await fs.writeFile(path.join(root, `${name}.kicad_pro`), "{}\n", "utf8");
  await fs.writeFile(path.join(root, `${name}.kicad_pcb`), `(kicad_pcb (title_block (rev "${revision}")))\n`, "utf8");
  await fs.writeFile(path.join(root, `${name}.kicad_sch`), `(kicad_sch (title_block (rev "${revision}")))\n`, "utf8");
}

async function writeRecordingKicadCli(root: string, recordFile: string): Promise<string> {
  const script = path.join(root, process.platform === "win32" ? "kicad-cli.cmd" : "kicad-cli");
  const js = path.join(root, "record-kicad.mjs");
  await fs.writeFile(
    js,
    [
      'import fs from "node:fs";',
      "const args = process.argv.slice(2);",
      `fs.appendFileSync(${JSON.stringify(recordFile)}, JSON.stringify(args) + "\\n");`,
      'if (args[0] === "version" || args[0] === "--version") {',
      '  process.stdout.write("10.0.0\\n");',
      "  process.exit(0);",
      "}",
      'const output = args[args.indexOf("--output") + 1];',
      "fs.writeFileSync(output, JSON.stringify({ violations: [] }));",
      "process.exit(0);",
      "",
    ].join("\n"),
    "utf8",
  );
  if (process.platform === "win32") {
    await fs.writeFile(
      script,
      `@echo off\r\nsetlocal DisableDelayedExpansion\r\n"${process.execPath}" "%~dp0record-kicad.mjs" %*\r\n`,
      "utf8",
    );
  } else {
    await fs.writeFile(script, `#!/bin/sh\n"${process.execPath}" "${js}" "$@"\n`, "utf8");
    await fs.chmod(script, 0o755);
  }
  return script;
}

async function createRootAlias(root: string): Promise<string | undefined> {
  const aliasParent = await fs.mkdtemp(path.join(os.tmpdir(), "boardreadyops-root-alias-"));
  const alias = path.join(aliasParent, "visible-root");
  try {
    await fs.symlink(root, alias, process.platform === "win32" ? "junction" : "dir");
    return alias;
  } catch (error) {
    if (isUnsupportedSymlink(error)) {
      return undefined;
    }
    throw error;
  }
}

function memoryStreams() {
  let stdout = "";
  let stderr = "";
  return {
    stdout: {
      write(value: string) {
        stdout += value;
        return true;
      },
    } as NodeJS.WritableStream,
    stderr: {
      write(value: string) {
        stderr += value;
        return true;
      },
    } as NodeJS.WritableStream,
    stdoutText() {
      return stdout;
    },
    stderrText() {
      return stderr;
    },
  };
}

function isUnsupportedLongPath(error: unknown): boolean {
  return error instanceof Error && "code" in error && (error.code === "ENAMETOOLONG" || error.code === "ENOENT");
}

function isUnsupportedSymlink(error: unknown): boolean {
  return error instanceof Error && "code" in error && (error.code === "EPERM" || error.code === "EACCES");
}

function isUnavailableUnc(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    ["EACCES", "EINVAL", "ENOENT", "EPERM", "UNKNOWN"].includes(String(error.code))
  );
}
