import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { validateConfig } from "../../src/core/config.js";
import { createFinding } from "../../src/core/findings.js";
import type { RunResult } from "../../src/core/result.js";
import { formatJson } from "../../src/report/json.js";
import { formatSarif } from "../../src/report/sarif.js";

describe("config and report properties", () => {
  it("config validation never throws for unknown JSON-like values", () => {
    fc.assert(
      fc.property(fc.jsonValue(), (value) => {
        expect(() => validateConfig(value)).not.toThrow();
      }),
    );
  });

  it("JSON and SARIF formatters always emit parseable JSON for generated findings", () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (ruleId, message) => {
        const result: RunResult = {
          schemaVersion: 1,
          tool: { name: "boardreadyops", version: "0.9.0" },
          summary: { total: 1, critical: 0, high: 0, medium: 1, low: 0, info: 0, maxSeverity: "medium", failed: false },
          projects: [],
          findings: [
            createFinding({
              ruleId,
              severity: "medium",
              message,
              resource: { path: "board.kicad_pro", kind: "project" },
            }),
          ],
          fabrication: { bom: [], outputs: [] },
          generatedAt: "2026-05-18T00:00:00.000Z",
        };
        expect(() => JSON.parse(formatJson(result))).not.toThrow();
        expect(() => JSON.parse(formatSarif(result))).not.toThrow();
      }),
    );
  });
});
