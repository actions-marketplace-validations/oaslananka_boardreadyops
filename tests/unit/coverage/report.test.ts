import path from "node:path";
import { describe, expect, it } from "vitest";
import { createFinding } from "../../../src/core/findings.js";
import { runPipeline } from "../../../src/core/pipeline.js";
import { formatAnnotation } from "../../../src/report/annotations.js";
import { formatJunit } from "../../../src/report/junit.js";
import { formatSarif } from "../../../src/report/sarif.js";

describe("report helpers", () => {
  it("formats annotations, junit, and SARIF with findings", async () => {
    const result = await runPipeline({
      path: path.resolve("tests/fixtures/projects/bom-missing-mpn"),
      failOn: "never",
    });
    const finding = result.findings.find((entry) => entry.ruleId === "bom.missing-mpn");
    expect(finding).toBeTruthy();
    if (!finding) {
      throw new Error("Expected bom.missing-mpn finding");
    }
    expect(formatAnnotation(finding)).toContain("::error");
    expect(
      formatAnnotation(
        createFinding({
          ruleId: "info.rule",
          severity: "info",
          message: "notice, escaped",
          resource: { path: "a:b", kind: "manifest" },
        }),
      ),
    ).toContain("::notice");
    expect(
      formatAnnotation(
        createFinding({
          ruleId: "medium.rule",
          severity: "medium",
          message: "warning",
          resource: { path: "file", kind: "manifest" },
          location: { line: 2, column: 3 },
        }),
      ),
    ).toContain("::warning");
    expect(formatJunit(result)).toContain("<testsuite");
    const synthetic = {
      ...result,
      findings: [
        ...result.findings,
        createFinding({
          ruleId: "low.rule",
          severity: "low",
          message: "low",
          resource: { path: "low", kind: "manifest" },
        }),
        createFinding({
          ruleId: "info.rule",
          severity: "info",
          message: "info",
          resource: { path: "info", kind: "manifest" },
        }),
      ],
    };
    expect(JSON.parse(formatSarif(synthetic)).runs[0].results.length).toBeGreaterThan(0);
  });
});
