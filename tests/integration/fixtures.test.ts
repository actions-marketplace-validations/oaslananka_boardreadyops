import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { Severity } from "../../src/core/findings.js";
import { runPipeline } from "../../src/core/pipeline.js";
import { listRules } from "../../src/core/rule-registry.js";

const fixtureRoot = path.resolve("tests/fixtures/projects");
const noFixtureRules = ["fixture.metadata-only"];
const fixtureNames = await listFixtureNames();
const fixtureTimestamp = new Date("2026-01-01T00:00:00.000Z");
const staleFixtureTimestamp = new Date("2025-01-01T00:00:00.000Z");

interface ExpectedFindings {
  fixture: string;
  expectedRules: string[];
  expectedSeverities: Severity[];
  expectPass: boolean;
  performanceBaselineMs: number;
  runRules: string[];
  stalePaths?: string[];
}

describe("fixture corpus", () => {
  it("keeps expected finding metadata next to every project fixture", async () => {
    expect(fixtureNames.length).toBeGreaterThanOrEqual(20);

    for (const fixture of fixtureNames) {
      await expect(
        fs.stat(path.join(fixtureRoot, fixture, "expected-findings.json")),
        `${fixture} expected-findings.json`,
      ).resolves.toBeTruthy();
    }
  });

  it.each(fixtureNames)("matches %s expected findings spec", async (fixture) => {
    const expected = await readExpectedFindings(fixture);
    const fixturePath = path.join(fixtureRoot, fixture);
    await stabilizeFixtureTimes(fixturePath, expected.stalePaths ?? []);
    const result = await runPipeline({
      path: fixturePath,
      rules: expected.runRules.length > 0 ? expected.runRules : noFixtureRules,
      failOn: "high",
    });

    expect(expected.fixture, fixture).toBe(fixture);
    expect(expected.performanceBaselineMs, `${fixture} baseline`).toBeGreaterThan(0);
    expect(unknownRunRules(expected.runRules), `${fixture} runRules`).toEqual([]);
    expect(expected.expectedSeverities, `${fixture} severities per expected rule`).toHaveLength(
      expected.expectedRules.length,
    );
    expect(
      unique(result.findings.map((finding) => `${finding.ruleId}:${finding.severity}`)),
      `${fixture} finding severities`,
    ).toEqual(expectedFindingSeverities(expected));
    expect(!result.summary.failed, `${fixture} pass state`).toBe(expected.expectPass);
  });
});

async function listFixtureNames(): Promise<string[]> {
  const entries = await fs.readdir(fixtureRoot, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

async function readExpectedFindings(fixture: string): Promise<ExpectedFindings> {
  const raw = await fs.readFile(path.join(fixtureRoot, fixture, "expected-findings.json"), "utf8");
  return JSON.parse(raw) as ExpectedFindings;
}

async function stabilizeFixtureTimes(root: string, stalePaths: string[]): Promise<void> {
  const files = await listFixtureFiles(root);
  await Promise.all(files.map((file) => fs.utimes(file, fixtureTimestamp, fixtureTimestamp)));
  await Promise.all(
    stalePaths.map((stalePath) => fs.utimes(path.join(root, stalePath), staleFixtureTimestamp, staleFixtureTimestamp)),
  );
}

async function listFixtureFiles(root: string): Promise<string[]> {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(root, entry.name);
      return entry.isDirectory() ? listFixtureFiles(entryPath) : [entryPath];
    }),
  );
  return files.flat();
}

function unique(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function expectedFindingSeverities(expected: ExpectedFindings): string[] {
  return unique(
    expected.expectedRules.map((ruleId, index) => `${ruleId}:${expected.expectedSeverities[index] ?? "missing"}`),
  );
}

function unknownRunRules(runRules: string[]): string[] {
  const registeredRules = new Set(listRules().map((registeredRule) => registeredRule.meta.id));
  return runRules.filter((runRule) => !registeredRules.has(runRule)).sort();
}
