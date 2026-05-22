import { Ajv2020 } from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";
import findingsSchema from "../../../schemas/findings.schema.json" with { type: "json" };
import { createFinding, summarizeFindings } from "../../../src/core/findings.js";
import type { RunResult } from "../../../src/core/result.js";
import { formatJson } from "../../../src/report/json.js";
import { formatMarkdown, stickyMarker } from "../../../src/report/markdown.js";
import { formatSarif } from "../../../src/report/sarif.js";

describe("report formats", () => {
  it("validates JSON output against the findings schema", () => {
    const ajv = new Ajv2020({ allErrors: true });
    const validate = ajv.compile(findingsSchema);
    const payload = JSON.parse(formatJson(sampleResult()));
    expect(validate(payload), JSON.stringify(validate.errors)).toBe(true);
  });

  it("emits SARIF 2.1.0 matching the local SARIF structural schema", () => {
    const ajv = new Ajv2020({ allErrors: true });
    const validate = ajv.compile(sarifSchema);
    const payload = JSON.parse(formatSarif(sampleResult()));
    expect(validate(payload), JSON.stringify(validate.errors)).toBe(true);
    expect(payload.runs[0].results[0].partialFingerprints.primaryLocationLineHash).toMatch(/^[a-f0-9]{64}$/);
    expect(payload.runs[0].tool.driver.rules[0].help.text).toContain("Add manufacturer part numbers.");
    expect(payload.runs[0].tool.driver.rules[0].help.markdown).toContain("1. Populate the MPN column.");
  });

  it("keeps SARIF fix help readable when no steps are provided", () => {
    const payload = JSON.parse(
      formatSarif(
        sampleResult([
          createFinding({
            ruleId: "bom.single-source",
            severity: "medium",
            message: "R1 has one source.",
            resource: { path: "bom.csv", kind: "bom" },
            fix: { description: "Add an alternate approved source." },
          }),
        ]),
      ),
    );

    expect(payload.runs[0].tool.driver.rules[0].help).toEqual({
      text: "Add an alternate approved source.",
      markdown: "Add an alternate approved source.",
    });
  });

  it("keeps per-finding SARIF fix metadata for repeated rule ids", () => {
    const payload = JSON.parse(
      formatSarif(
        sampleResult([
          createFinding({
            ruleId: "manifest.project-discovery",
            severity: "high",
            message: "Project has no schematic.",
            resource: { path: "main.kicad_pro", kind: "project" },
            fix: { description: "Add a matching schematic file." },
          }),
          createFinding({
            ruleId: "manifest.project-discovery",
            severity: "high",
            message: "Project has no board.",
            resource: { path: "main.kicad_pro", kind: "project" },
            fix: { description: "Add a matching board file." },
          }),
        ]),
      ),
    );

    expect(payload.runs[0].tool.driver.rules).toHaveLength(1);
    expect(
      payload.runs[0].results.map(
        (result: { properties: { fix?: { description: string } } }) => result.properties.fix?.description,
      ),
    ).toEqual(["Add a matching schematic file.", "Add a matching board file."]);
  });

  it("renders PR Markdown for empty and populated finding sets without unresolved tokens", () => {
    const empty = formatMarkdown(sampleResult([]));
    expect(empty).toContain(stickyMarker);
    expect(empty).toContain("No findings.");
    expect(empty).not.toMatch(/{{|}}/);

    const populated = formatMarkdown(sampleResult(), [{ label: "SARIF", url: "https://example.test/sarif" }]);
    expect(populated).toContain("Top Findings");
    expect(populated).toContain("## Fix");
    expect(populated).toContain("Add manufacturer part numbers.");
    expect(populated).toContain("[SARIF](https://example.test/sarif)");
    expect(populated).not.toMatch(/{{|}}/);
  });

  it("renders fabrication changes in PR Markdown", () => {
    const markdown = formatMarkdown(sampleResult(), [], {
      bom: {
        truncated: false,
        rows: [
          {
            reference: "C45",
            previous: "",
            current: "100nF 0402",
            status: "added",
          },
        ],
      },
      outputs: [
        { kind: "drill", status: "changed", changed: 1, added: 0, removed: 0 },
        { kind: "gerber", status: "unchanged", changed: 0, added: 0, removed: 0 },
      ],
      findings: {
        added: [sampleFinding()],
        removed: [],
        unchanged: [],
      },
    });

    expect(markdown).toContain("Fabrication Changes");
    expect(markdown).toContain("| C45 | - | 100nF 0402 | added |");
    expect(markdown).toContain("- drill: changed (1 changed)");
    expect(markdown).toContain("- gerber: unchanged");
    expect(markdown).toContain("New Findings");
  });

  it("limits new finding rows in fabrication changes", () => {
    const added = Array.from({ length: 12 }, (_, index) =>
      createFinding({
        ruleId: "bom.missing-mpn",
        severity: "high",
        message: `Missing MPN ${index}.`,
        resource: { path: `bom-${index}.csv`, kind: "bom" },
      }),
    );

    const markdown = formatMarkdown(sampleResult(), [], {
      bom: { truncated: false, rows: [] },
      outputs: [],
      findings: {
        added,
        removed: [],
        unchanged: [],
      },
    });

    expect(markdown).toContain("Missing MPN 0.");
    expect(markdown).toContain("Missing MPN 9.");
    expect(markdown).not.toContain("Missing MPN 10.");
    expect(markdown).toContain("_...and 2 more new findings._");
  });

  it("renders fixes from findings outside the top finding summary", () => {
    const findings = Array.from({ length: 10 }, (_, index) =>
      createFinding({
        ruleId: "bom.missing-mpn",
        severity: "high",
        message: `Missing MPN ${index}.`,
        resource: { path: `bom-${index}.csv`, kind: "bom" },
      }),
    );
    findings.push(
      createFinding({
        ruleId: "bom.single-source",
        severity: "medium",
        message: "R1 has one source.",
        resource: { path: "late-bom.csv", kind: "bom" },
        fix: { description: "Add an alternate approved source." },
      }),
    );

    const markdown = formatMarkdown(sampleResult(findings));
    expect(markdown).toContain("## Fix");
    expect(markdown).toContain("Add an alternate approved source.");
  });

  it("keeps fix metadata in JSON output", () => {
    const payload = JSON.parse(formatJson(sampleResult()));
    expect(payload.findings[0]).toMatchObject({
      project: "assembly/main.kicad_pro",
      fix: {
        description: "Add manufacturer part numbers.",
        steps: ["Populate the MPN column.", "Re-run the BOM check."],
      },
      confidence: "high",
    });
  });
});

function sampleResult(findings = [sampleFinding()]): RunResult {
  return {
    schemaVersion: 1,
    tool: { name: "boardreadyops", version: "1.0.0" },
    summary: summarizeFindings(findings, "high"),
    projects: [],
    findings,
    fabrication: { bom: [], outputs: [] },
    generatedAt: "2026-05-18T00:00:00.000Z",
  };
}

function sampleFinding() {
  return createFinding({
    ruleId: "bom.missing-mpn",
    severity: "high",
    message: "R1 is missing an MPN.",
    project: "assembly/main.kicad_pro",
    resource: { path: "bom.csv", kind: "bom" },
    location: { line: 2, column: 1 },
    details: { reference: "R1" },
    references: ["https://github.com/oaslananka/boardreadyops/blob/main/docs/rules/bom.md"],
    fix: {
      description: "Add manufacturer part numbers.",
      steps: ["Populate the MPN column.", "Re-run the BOM check."],
      references: ["https://example.test/mpn"],
      automated: false,
    },
    confidence: "high",
  });
}

const sarifSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  type: "object",
  required: ["version", "$schema", "runs"],
  properties: {
    version: { const: "2.1.0" },
    $schema: { type: "string" },
    runs: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: ["tool", "results"],
        properties: {
          tool: {
            type: "object",
            required: ["driver"],
            properties: {
              driver: {
                type: "object",
                required: ["name", "version", "rules"],
                properties: {
                  name: { const: "BoardReadyOps" },
                  version: { type: "string" },
                  rules: { type: "array" },
                },
              },
            },
          },
          results: {
            type: "array",
            items: {
              type: "object",
              required: ["ruleId", "level", "message", "locations", "partialFingerprints"],
              properties: {
                ruleId: { type: "string" },
                level: { enum: ["error", "warning", "note", "none"] },
                message: { type: "object", required: ["text"] },
                locations: { type: "array", minItems: 1 },
                partialFingerprints: {
                  type: "object",
                  required: ["primaryLocationLineHash"],
                  properties: {
                    primaryLocationLineHash: { type: "string", pattern: "^[a-f0-9]{64}$" },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};
