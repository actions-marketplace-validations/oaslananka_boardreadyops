import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runCli } from "../../src/cli/index.js";
import { runPipeline } from "../../src/core/pipeline.js";
import { detectKicadCli } from "../../src/kicad/cli.js";

const fixtureRoot = path.resolve("tests/fixtures/projects");

describe("CLI integration", () => {
  it("prints root help and version", async () => {
    const help = captureStreams();
    expect(await runCli(["--help"], help)).toBe(0);
    expect(help.stdoutText()).toContain("BoardReadyOps - CI preflight for production-ready PCBs.");
    expect(help.stdoutText()).toContain("Usage: boardreadyops");

    const version = captureStreams();
    expect(await runCli(["--version"], version)).toBe(0);
    expect(version.stdoutText().trim()).toBe("1.0.0");
  });

  it("runs the default command and writes reports", async () => {
    const temp = await fs.mkdtemp(path.join(os.tmpdir(), "boardreadyops-cli-"));
    await fs.cp(path.join(fixtureRoot, "safe-basic"), temp, { recursive: true });
    const streams = memoryStreams();
    const code = await runCli(
      ["run", temp, "--json", "out.json", "--sarif", "out.sarif.json", "--markdown", "out.md", "--no-annotations"],
      streams,
    );
    expect(code).toBe(0);
    expect(await fs.stat(path.join(temp, "out.json"))).toBeTruthy();
    expect(await fs.stat(path.join(temp, "out.sarif.json"))).toBeTruthy();
    expect(await fs.stat(path.join(temp, "out.md"))).toBeTruthy();
  });

  it("returns exit code 1 at the fail-on threshold", async () => {
    const code = await runCli(["run", path.join(fixtureRoot, "bom-missing-mpn"), "--no-annotations"], memoryStreams());
    expect(code).toBe(1);
  });

  it("prints schemas and doctor diagnostics", async () => {
    const schema = captureStreams();
    expect(await runCli(["schema", "config"], schema)).toBe(0);
    expect(schema.stdoutText()).toContain("https://github.com/oaslananka/boardreadyops/schemas/config-v1.json");
    const findings = captureStreams();
    expect(await runCli(["schema", "findings"], findings)).toBe(0);
    expect(findings.stdoutText()).toContain("BoardReadyOps findings report");
    const pinmap = captureStreams();
    expect(await runCli(["schema", "pinmap"], pinmap)).toBe(0);
    expect(pinmap.stdoutText()).toContain("BoardReadyOps pinmap");
    const doctor = captureStreams();
    expect(await runCli(["doctor"], doctor)).toBe(0);
    expect(doctor.stdoutText()).toContain("Node:");
  });

  it("supports check, init, and stdout report targets", async () => {
    const temp = await fs.mkdtemp(path.join(os.tmpdir(), "boardreadyops-cli-more-"));
    await fs.cp(path.join(fixtureRoot, "pinmap-mismatch"), temp, { recursive: true });
    const check = captureStreams();
    expect(
      await runCli(["check", "pinmap.verify", temp, "--json", "-", "--no-annotations", "--fail-on", "never"], check),
    ).toBe(0);
    expect(JSON.parse(check.stdoutText()).summary.total).toBe(1);

    const checkPath = captureStreams();
    expect(await runCli(["check", temp, "--json", "-", "--no-annotations", "--fail-on", "never"], checkPath)).toBe(0);
    expect(JSON.parse(checkPath.stdoutText()).summary.total).toBeGreaterThan(0);

    const initDir = await fs.mkdtemp(path.join(os.tmpdir(), "boardreadyops-init-"));
    const previous = process.cwd();
    process.chdir(initDir);
    try {
      const init = captureStreams();
      expect(await runCli(["init"], init)).toBe(0);
      expect(await fs.readFile(path.join(initDir, "boardreadyops.yml"), "utf8")).toContain("version: 1");
    } finally {
      process.chdir(previous);
    }
  });

  it("maps bad configuration and missing required KiCad to dedicated exit codes", async () => {
    const badConfig = captureStreams();
    expect(await runCli(["run", path.join(fixtureRoot, "malformed-config"), "--no-annotations"], badConfig)).toBe(2);
    expect(badConfig.stderrText()).toContain("Configuration error:");

    const missingKicad = captureStreams();
    expect(
      await runCli(
        [
          "run",
          path.join(fixtureRoot, "safe-basic"),
          "--require-kicad",
          "--kicad-cli",
          path.join(os.tmpdir(), "missing-kicad-cli"),
          "--no-annotations",
        ],
        missingKicad,
      ),
    ).toBe(3);
    expect(missingKicad.stderrText()).toContain("Environment error:");
  });

  it("runs every KiCad 10 extension fixture through the expected rule", async () => {
    const fixtures: Array<[string, string]> = [
      ["copper-balance-low", "design.copper-balance"],
      ["board-outline-open", "design.board-outline"],
      ["bom-variant-inconsistency", "bom.variant-consistency"],
      ["jobset-missing-output", "manufacturing.jobset-outputs"],
      ["release-bad-version-format", "release.version-format"],
      ["bom-lifecycle", "bom.lifecycle"],
      ["layer-stackup-mismatch", "manufacturing.layer-stackup"],
      ["pinmap-net-label-mismatch", "pinmap.net-label"],
    ];
    for (const [fixture, ruleId] of fixtures) {
      const result = await runPipeline({
        path: path.join(fixtureRoot, fixture),
        rules: [ruleId],
        failOn: "never",
      });
      expect(
        result.findings.some((finding) => finding.ruleId === ruleId),
        fixture,
      ).toBe(true);
    }
  });

  it("runs KiCad-backed DRC/ERC against a KiCad 10.x installation", async (context) => {
    const kicad = await detectKicadCli();
    if (!process.env.CI) {
      context.skip(!kicad.found, "kicad-cli is not installed in this environment");
      context.skip(!/^10\./.test(kicad.version ?? ""), "kicad-cli 10.x is not installed in this environment");
    }
    expect(kicad.found).toBe(true);
    expect(kicad.version).toMatch(/^10\./);
    const temp = await fs.mkdtemp(path.join(os.tmpdir(), "boardreadyops-real-kicad-"));
    await fs.rm(temp, { recursive: true, force: true });
    await fs.cp(path.join(fixtureRoot, "safe-basic"), temp, { recursive: true });
    await fs.rm(path.join(temp, "boardreadyops.yml"), { force: true });
    const result = await runPipeline({
      path: temp,
      kicadCli: kicad.path,
      rules: ["drc.kicad", "erc.kicad"],
      failOn: "never",
    });
    expect(result.findings.some((finding) => finding.ruleId.startsWith("drc."))).toBe(true);
    expect(result.findings.some((finding) => finding.ruleId.startsWith("erc."))).toBe(true);
  }, 60_000);
});

function memoryStreams() {
  return {
    stdout: {
      write() {
        return true;
      },
    },
    stderr: {
      write() {
        return true;
      },
    },
  } as unknown as { stdout: NodeJS.WritableStream; stderr: NodeJS.WritableStream };
}

function captureStreams() {
  let stdout = "";
  let stderr = "";
  return {
    stdout: {
      write(value: string) {
        stdout += value;
        return true;
      },
    },
    stderr: {
      write(value: string) {
        stderr += value;
        return true;
      },
    },
    stdoutText() {
      return stdout;
    },
    stderrText() {
      return stderr;
    },
  } as unknown as {
    stdout: NodeJS.WritableStream;
    stderr: NodeJS.WritableStream;
    stdoutText(): string;
    stderrText(): string;
  };
}
