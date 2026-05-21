import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { defaultConcurrency, mapLimit } from "../../src/core/concurrency.js";
import { loadConfig, validateConfig } from "../../src/core/config.js";
import { discoverProjects } from "../../src/core/discovery.js";
import { createFinding, shouldFail, summarizeFindings } from "../../src/core/findings.js";
import { runPipeline } from "../../src/core/pipeline.js";
import { formatJson } from "../../src/report/json.js";
import { formatMarkdown } from "../../src/report/markdown.js";
import { formatSarif } from "../../src/report/sarif.js";

const fixtureRoot = path.resolve("tests/fixtures/projects");

describe("configuration", () => {
  it("validates the versioned config schema", () => {
    expect(validateConfig({ version: 1, failOn: "high" })).not.toEqual([]);
    expect(validateConfig({ version: 1, "fail-on": "high" })).toEqual([]);
    expect(validateConfig({ version: 2 }).join("\n")).toContain("must be equal to constant");
  });

  it("loads accepted config filenames", async () => {
    const loaded = await loadConfig(path.join(fixtureRoot, "safe-basic"));
    expect(loaded.errors).toEqual([]);
    expect(loaded.path?.endsWith("boardreadyops.yml")).toBe(true);
  });
});

describe("discovery and findings", () => {
  it("discovers KiCad projects", async () => {
    const projects = await discoverProjects(path.join(fixtureRoot, "safe-basic"));
    expect(projects).toHaveLength(1);
    expect(projects[0]?.schematicFiles).toEqual(["safe-basic.kicad_sch"]);
    expect(projects[0]?.boardFiles).toEqual(["safe-basic.kicad_pcb"]);
  });

  it("summarizes and thresholds findings", () => {
    const finding = createFinding({
      ruleId: "bom.missing-mpn",
      severity: "high",
      message: "missing",
      resource: { path: "bom.csv", kind: "bom" },
    });
    expect(finding.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(shouldFail([finding], "high")).toBe(true);
    expect(shouldFail([finding], "critical")).toBe(false);
    expect(summarizeFindings([finding], "high")).toMatchObject({ total: 1, high: 1, failed: true });
  });

  it("runs bounded concurrency helpers", async () => {
    expect(defaultConcurrency()).toBeGreaterThanOrEqual(1);
    const values = await mapLimit([1, 2, 3], 2, async (value) => value * 2);
    expect(values).toEqual([2, 4, 6]);
    expect(await mapLimit([], 0, async (value) => value)).toEqual([]);
  });

  it("reports missing project shapes before rule results", async () => {
    const emptyRoot = await fs.mkdtemp(path.join(os.tmpdir(), "boardreadyops-empty-"));
    const empty = await runPipeline({ path: emptyRoot, failOn: "never", rules: ["release.revision-set"] });
    expect(empty.findings.map((finding) => finding.message)).toContain("No .kicad_pro project was found.");

    const missingSchematic = await runPipeline({
      path: path.join(fixtureRoot, "missing-schematic"),
      failOn: "never",
      rules: ["release.revision-set"],
    });
    expect(missingSchematic.findings.some((finding) => finding.message.includes("no matching schematic file"))).toBe(
      true,
    );

    const missingBoard = await runPipeline({
      path: path.join(fixtureRoot, "missing-board"),
      failOn: "never",
      rules: ["release.revision-set"],
    });
    expect(missingBoard.findings.some((finding) => finding.message.includes("no matching board file"))).toBe(true);
  });
});

describe("reporting", () => {
  it("emits JSON, Markdown, and SARIF", async () => {
    const result = await runPipeline({ path: path.join(fixtureRoot, "safe-basic"), failOn: "high" });
    expect(result.summary.total).toBe(0);
    expect(JSON.parse(formatJson(result)).tool.name).toBe("boardreadyops");
    expect(formatMarkdown(result)).toContain("No findings.");
    const sarif = JSON.parse(formatSarif(result));
    expect(sarif.version).toBe("2.1.0");
    expect(sarif.runs[0].tool.driver.name).toBe("BoardReadyOps");
  });
});
