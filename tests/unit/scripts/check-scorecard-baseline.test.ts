import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  checkScorecardBaseline,
  defaultRequiredChecks,
  formatScorecardSummary,
  main,
} from "../../../scripts/check-scorecard-baseline.mjs";

describe("check-scorecard-baseline", () => {
  it("passes when the aggregate and required checks meet the minimum", () => {
    const result = checkScorecardBaseline(reportWithScores(9.6, 10));

    expect(result.passed).toBe(true);
    expect(result.failures).toEqual([]);
  });

  it("fails when a required check is below the minimum", () => {
    const report = reportWithScores(9.5, 10, { "Token-Permissions": 8 });

    expect(checkScorecardBaseline(report).failures).toContain(
      "Token-Permissions score 8.0 is below 9.0: Token-Permissions score 8",
    );
  });

  it("fails when the aggregate score is below the minimum", () => {
    const result = checkScorecardBaseline(reportWithScores(8.9, 10));

    expect(result.failures).toContain("aggregate score 8.9 is below 9.0");
  });

  it("formats a summary table", () => {
    const report = reportWithScores(9.1, 10, {
      SAST: 10,
    });
    const firstCheck = report.checks.at(0);
    if (!firstCheck) {
      throw new Error("report fixture must include at least one check");
    }
    firstCheck.reason = "uses C:\\temp | pipe\nnext line";
    const summary = formatScorecardSummary(report, ["Dangerous-Workflow", "SAST", "Missing"], 9);

    expect(summary).toContain("Aggregate score: 9.1 (minimum 9.0)");
    expect(summary).toContain("| Dangerous-Workflow | 10.0 | pass | uses C:\\\\temp \\| pipe<br>next line |");
    expect(summary).toContain("| SAST | 10.0 | pass | SAST score 10 |");
    expect(summary).toContain("| Missing | n/a | fail | missing from report |");
  });

  it("appends the summary file and exits cleanly for passing reports", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "boardreadyops-scorecard-check-"));
    const reportPath = path.join(root, "scorecard.json");
    const summaryPath = path.join(root, "summary.md");
    await writeFile(reportPath, JSON.stringify(reportWithScores(9.4, 10)));

    await main(["--report", reportPath, "--summary-file", summaryPath], {}, root);

    expect(await readFile(summaryPath, "utf8")).toContain("## OpenSSF Scorecard Baseline");
  });
});

function reportWithScores(aggregate: number, defaultScore: number, overrides: Record<string, number> = {}) {
  return {
    score: aggregate,
    checks: defaultRequiredChecks.map((name) => {
      const score = overrides[name] ?? defaultScore;
      return {
        name,
        score,
        reason: `${name} score ${score}`,
      };
    }),
  };
}
