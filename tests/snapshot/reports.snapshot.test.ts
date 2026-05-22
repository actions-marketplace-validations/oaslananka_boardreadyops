import { describe, expect, it } from "vitest";
import { diffFabrication } from "../../src/core/diff/fabrication.js";
import { createFinding, summarizeFindings } from "../../src/core/findings.js";
import type { RunResult } from "../../src/core/result.js";
import { formatJson } from "../../src/report/json.js";
import { formatJunit } from "../../src/report/junit.js";
import { formatMarkdown } from "../../src/report/markdown.js";
import { formatSarif } from "../../src/report/sarif.js";

const finding = createFinding({
  ruleId: "bom.missing-mpn",
  severity: "high",
  message: "R1 is missing an MPN.",
  resource: { path: "bom.csv", kind: "bom" },
  location: { line: 2, column: 1 },
  details: { reference: "R1" },
});

const result: RunResult = {
  schemaVersion: 1,
  tool: { name: "boardreadyops", version: "0.9.0" },
  summary: summarizeFindings([finding], "high"),
  projects: [],
  findings: [finding],
  fabrication: { bom: [], outputs: [] },
  generatedAt: "2026-05-18T00:00:00.000Z",
};

describe("report snapshots", () => {
  it("formats stable JSON", () => {
    expect(JSON.parse(formatJson(result))).toMatchSnapshot();
  });

  it("formats stable SARIF", () => {
    expect(JSON.parse(formatSarif(result))).toMatchSnapshot();
  });

  it("formats SARIF context fields", () => {
    const findings = [
      createFinding({
        ruleId: "manifest.project-discovery",
        severity: "medium",
        message: "Project has no board file.",
        resource: { path: "hardware/main.kicad_pro", kind: "project" },
      }),
      createFinding({
        ruleId: "bom.missing-mpn",
        severity: "high",
        message: "R1 is missing an MPN.",
        resource: { path: "hardware/bom.csv", kind: "bom" },
        location: { line: 7, column: 2 },
      }),
      createFinding({
        ruleId: "design.board-outline",
        severity: "critical",
        message: "Board outline has a gap.",
        project: "hardware/main.kicad_pro",
        resource: { path: "hardware/main.kicad_pcb", kind: "pcb" },
        location: {
          region: {
            startLine: 42,
            endLine: 44,
            startColumn: 3,
            endColumn: 12,
          },
          boardCoordinates: {
            x: 14.2,
            y: 8.7,
            layer: "Edge.Cuts",
            units: "mm",
          },
        },
        fix: {
          description: "Close the outline segment.",
          steps: ["Open Edge.Cuts.", "Connect the adjacent outline endpoints."],
        },
        confidence: "definite",
      }),
    ];
    const richResult: RunResult = {
      ...result,
      summary: summarizeFindings(findings, "high"),
      findings,
    };

    expect(JSON.parse(formatSarif(richResult))).toMatchSnapshot();
  });

  it("formats stable Markdown", () => {
    expect(formatMarkdown(result)).toMatchSnapshot();
  });

  it("formats fabrication diff Markdown", () => {
    expect(
      formatMarkdown(
        result,
        [],
        diffFabrication(
          {
            bom: [{ reference: "D2", value: "LED red" }],
            outputs: [{ kind: "drill", files: [{ path: "fab/board.drl", digest: "old" }] }],
          },
          {
            bom: [{ reference: "R1", value: "10k", footprint: "0402" }],
            outputs: [{ kind: "drill", files: [{ path: "fab/board.drl", digest: "new" }] }],
          },
          [],
          [finding],
        ),
      ),
    ).toMatchSnapshot();
  });

  it("formats stable JUnit", () => {
    expect(formatJunit(result)).toMatchSnapshot();
  });
});
