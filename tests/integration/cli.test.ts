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
    expect(version.stdoutText().trim()).toBe("1.0.2");
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

  it("writes configured JUnit reports", async () => {
    const temp = await fs.mkdtemp(path.join(os.tmpdir(), "boardreadyops-junit-"));
    await fs.cp(path.join(fixtureRoot, "safe-basic"), temp, { recursive: true });
    await fs.writeFile(
      path.join(temp, "boardreadyops.yml"),
      "version: 1\nreport:\n  junit: build/boardreadyops.junit.xml\n",
      "utf8",
    );

    expect(
      await runCli(
        ["run", temp, "--rule", "bom.missing-mpn", "--no-annotations", "--fail-on", "never"],
        memoryStreams(),
      ),
    ).toBe(0);

    const xml = await fs.readFile(path.join(temp, "build/boardreadyops.junit.xml"), "utf8");
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain("<testsuite");
    expect(xml).toContain("</testsuite>");
  });

  it("returns exit code 1 at the fail-on threshold", async () => {
    const code = await runCli(["run", path.join(fixtureRoot, "bom-missing-mpn"), "--no-annotations"], memoryStreams());
    expect(code).toBe(1);
  });

  it("uses a selected gate fail-on threshold from config", async () => {
    const temp = await fs.mkdtemp(path.join(os.tmpdir(), "boardreadyops-cli-gate-"));
    await fs.cp(path.join(fixtureRoot, "bom-missing-mpn"), temp, { recursive: true });
    await fs.appendFile(
      path.join(temp, "boardreadyops.yml"),
      `
gates:
  release:
    fail-on: critical
`,
      "utf8",
    );

    expect(await runCli(["run", temp, "--gate", "release", "--no-annotations"], memoryStreams())).toBe(0);
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

  it("explains manufacturing output detection", async () => {
    const explain = captureStreams();

    expect(
      await runCli(
        ["explain", "manufacturing.outputs-present", path.join(fixtureRoot, "manufacturing-missing-outputs")],
        explain,
      ),
    ).toBe(0);
    expect(explain.stdoutText()).toContain("manufacturing.outputs-present");
    expect(explain.stdoutText()).toContain("Searched patterns");
    expect(explain.stdoutText()).toContain("Found");
    expect(explain.stdoutText()).toContain("Missing");
  });

  it("reports rules that cannot be explained", async () => {
    const unknownRule = captureStreams();
    expect(await runCli(["explain", "unknown.rule", path.join(fixtureRoot, "safe-basic")], unknownRule)).toBe(2);
    expect(unknownRule.stderrText()).toContain("Unknown rule: unknown.rule");

    const unsupportedRule = captureStreams();
    expect(await runCli(["explain", "bom.missing-mpn", path.join(fixtureRoot, "safe-basic")], unsupportedRule)).toBe(2);
    expect(unsupportedRule.stderrText()).toContain("Rule bom.missing-mpn does not support explanation.");
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
      const config = await fs.readFile(path.join(initDir, "boardreadyops.yml"), "utf8");
      expect(config).toContain("version: 1");
      expect(config).toContain("# junit: build/boardreadyops.junit.xml");
    } finally {
      process.chdir(previous);
    }
  });

  it("captures, shows, diffs, prunes, and clears a baseline from the CLI", async () => {
    const temp = await fs.mkdtemp(path.join(os.tmpdir(), "boardreadyops-baseline-cli-"));
    await fs.writeFile(path.join(temp, "sample.kicad_pro"), "{}");
    await fs.writeFile(
      path.join(temp, "boardreadyops.yml"),
      `version: 1
rules:
  drc.kicad:
    enabled: false
  erc.kicad:
    enabled: false
  release.changelog-present:
    enabled: false
  release.revision-set:
    enabled: false
`,
    );

    const capture = captureStreams();
    expect(await runCli(["baseline", "capture", temp], capture)).toBe(0);
    expect(capture.stdoutText()).toContain(".boardreadyops-baseline.json");

    const show = captureStreams();
    expect(await runCli(["baseline", "show", temp], show)).toBe(0);
    expect(JSON.parse(show.stdoutText()).findings).toHaveLength(3);

    const diff = captureStreams();
    expect(await runCli(["baseline", "diff", temp], diff)).toBe(0);
    expect(diff.stdoutText()).toContain("Added: 0");
    expect(diff.stdoutText()).toContain("Removed: 0");
    expect(diff.stdoutText()).toContain("Unchanged: 3");

    await fs.writeFile(path.join(temp, "sample.kicad_sch"), "(kicad_sch)");
    const prune = captureStreams();
    expect(await runCli(["baseline", "prune", temp], prune)).toBe(0);
    expect(
      JSON.parse(await fs.readFile(path.join(temp, ".boardreadyops-baseline.json"), "utf8")).findings,
    ).toHaveLength(2);

    const clear = captureStreams();
    expect(await runCli(["baseline", "clear", temp], clear)).toBe(0);
    await expect(fs.stat(path.join(temp, ".boardreadyops-baseline.json"))).rejects.toThrow();
  });

  it("uses explicit config paths for baseline subcommands", async () => {
    const temp = await fs.mkdtemp(path.join(os.tmpdir(), "boardreadyops-baseline-config-"));
    await fs.mkdir(path.join(temp, "ci"), { recursive: true });
    await fs.writeFile(path.join(temp, "sample.kicad_pro"), "{}");
    await fs.writeFile(
      path.join(temp, "ci", "boardreadyops.yml"),
      `version: 1
baseline:
  file: audit/current.json
  mode: new-only
rules:
  drc.kicad:
    enabled: false
  erc.kicad:
    enabled: false
  release.changelog-present:
    enabled: false
  release.revision-set:
    enabled: false
`,
    );
    await fs.mkdir(path.join(temp, "audit"), { recursive: true });
    await fs.writeFile(path.join(temp, "audit", "current.json"), "null\n", "utf8");

    const capture = captureStreams();
    expect(await runCli(["baseline", "capture", temp, "--config", "ci/boardreadyops.yml"], capture)).toBe(0);
    expect(capture.stdoutText()).toContain("audit/current.json");
    await expect(fs.stat(path.join(temp, "audit", "current.json"))).resolves.toBeTruthy();
    await expect(fs.stat(path.join(temp, ".boardreadyops-baseline.json"))).rejects.toThrow();

    const show = captureStreams();
    expect(await runCli(["baseline", "show", temp, "--config", "ci/boardreadyops.yml"], show)).toBe(0);
    expect(JSON.parse(show.stdoutText()).findings).toHaveLength(3);
  });

  it("keeps suppressed and baselined findings visible without failing the run", async () => {
    const temp = await fs.mkdtemp(path.join(os.tmpdir(), "boardreadyops-suppressed-baseline-"));
    await fs.writeFile(path.join(temp, "sample.kicad_pro"), "{}");
    const initial = await runPipeline({ path: temp, failOn: "never" });
    const projectShapeFindings = initial.findings.filter((finding) => finding.ruleId === "manifest.project-discovery");
    expect(projectShapeFindings).toHaveLength(2);
    const [suppressed, baselined] = projectShapeFindings;
    if (!suppressed || !baselined) {
      throw new Error("expected two project-shape findings");
    }
    await fs.writeFile(
      path.join(temp, "boardreadyops.yml"),
      `version: 1
suppressions:
  - rule: ${suppressed.ruleId}
    fingerprint: ${suppressed.fingerprint}
    reason: project is still being created
baseline:
  file: .boardreadyops-baseline.json
  mode: new-only
rules:
  drc.kicad:
    enabled: false
  erc.kicad:
    enabled: false
  release.changelog-present:
    enabled: false
  release.revision-set:
    enabled: false
`,
    );
    await fs.writeFile(
      path.join(temp, ".boardreadyops-baseline.json"),
      JSON.stringify(
        {
          version: 1,
          capturedAt: "2026-05-21T10:00:00.000Z",
          capturedBy: "boardreadyops/1.0.2",
          findings: [
            {
              fingerprint: baselined.fingerprint,
              ruleId: baselined.ruleId,
              message: baselined.message,
              suppressedUntil: null,
            },
          ],
        },
        null,
        2,
      ),
    );

    const streams = captureStreams();
    expect(
      await runCli(["run", temp, "--rule", "manifest.project-discovery", "--json", "-", "--no-annotations"], streams),
    ).toBe(0);
    const result = JSON.parse(streams.stdoutText());
    expect(result.summary.total).toBe(2);
    expect(result.summary.failed).toBe(false);
    expect(result.findings.map((finding: { suppressed?: boolean }) => finding.suppressed)).toEqual([true, true]);
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
