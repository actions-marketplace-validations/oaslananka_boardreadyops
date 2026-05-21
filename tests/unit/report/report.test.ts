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
  });

  it("renders PR Markdown for empty and populated finding sets without unresolved tokens", () => {
    const empty = formatMarkdown(sampleResult([]));
    expect(empty).toContain(stickyMarker);
    expect(empty).toContain("No findings.");
    expect(empty).not.toMatch(/{{|}}/);

    const populated = formatMarkdown(sampleResult(), [{ label: "SARIF", url: "https://example.test/sarif" }]);
    expect(populated).toContain("Top Findings");
    expect(populated).toContain("[SARIF](https://example.test/sarif)");
    expect(populated).not.toMatch(/{{|}}/);
  });
});

function sampleResult(findings = [sampleFinding()]): RunResult {
  return {
    schemaVersion: 1,
    tool: { name: "boardreadyops", version: "1.0.0" },
    summary: summarizeFindings(findings, "high"),
    projects: [],
    findings,
    generatedAt: "2026-05-18T00:00:00.000Z",
  };
}

function sampleFinding() {
  return createFinding({
    ruleId: "bom.missing-mpn",
    severity: "high",
    message: "R1 is missing an MPN.",
    resource: { path: "bom.csv", kind: "bom" },
    location: { line: 2, column: 1 },
    details: { reference: "R1" },
    references: ["https://github.com/oaslananka/boardreadyops/blob/main/docs/rules/bom.md"],
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
