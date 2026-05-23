import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  calculateMutationMetrics,
  checkMutationThresholds,
  formatFailures,
  formatMissingMutationFiles,
  formatMutationSummary,
  main,
  missingMutationFiles,
} from "../../../scripts/check-mutation-thresholds.mjs";

describe("check-mutation-thresholds", () => {
  it("calculates Stryker mutation score from valid mutant statuses", () => {
    const report = reportWithFiles({
      "src/core/pipeline.ts": ["Killed", "Timeout", "Survived", "NoCoverage", "Ignored", "RuntimeError"],
      "src/rules/design.ts": ["Killed", "Survived"],
    });

    expect(calculateMutationMetrics(report)).toMatchObject({
      files: 2,
      killed: 2,
      timeout: 1,
      survived: 2,
      noCoverage: 1,
      totalDetected: 3,
      totalUndetected: 3,
      totalValid: 6,
    });
    expect(calculateMutationMetrics(report).mutationScore).toBe(50);
  });

  it("fails when core files are absent from the mutation report", () => {
    const results = checkMutationThresholds(reportWithFiles({ "src/rules/design.ts": ["Killed"] }));

    expect(formatFailures(results)).toContain(
      "src/core/** mutation threshold could not be checked because no report files matched src/core/**.",
    );
  });

  it("formats a GitHub job summary table", () => {
    const results = checkMutationThresholds(
      reportWithFiles({
        "src/core/pipeline.ts": ["Killed", "Killed", "Survived"],
        "src/rules/design.ts": ["Killed"],
      }),
    );

    expect(formatMutationSummary(results)).toContain("| Scope | Files | Score | Minimum |");
    expect(formatMutationSummary(results)).toContain("| src/core/** | 1 | 66.67% | 75.00% |");
  });

  it("reports executable core files missing from the Stryker report", () => {
    const missing = missingMutationFiles(reportWithFiles({ "src/core/pipeline.ts": ["Killed"] }), [
      "src/core/config.ts",
      "src/core/pipeline.ts",
    ]);

    expect(formatMissingMutationFiles(missing)).toEqual([
      "src/core/** mutation report is missing executable core files:\nsrc/core/config.ts",
    ]);
  });

  it("appends the summary file and exits cleanly for passing reports", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "boardreadyops-mutation-check-"));
    const reportPath = path.join(root, "mutation.json");
    const summaryPath = path.join(root, "summary.md");
    await writeFile(
      reportPath,
      JSON.stringify(
        reportWithFiles({
          "src/core/pipeline.ts": ["Killed", "Killed", "Killed", "Survived"],
          "src/rules/design.ts": ["Killed"],
        }),
      ),
    );

    await main(["--report", reportPath, "--summary-file", summaryPath], {}, root);

    expect(await readFile(summaryPath, "utf8")).toContain("## Mutation Score");
  });

  it("accepts the npm argument separator before script flags", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "boardreadyops-mutation-check-"));
    const reportPath = path.join(root, "mutation.json");
    const summaryPath = path.join(root, "summary.md");
    await writeFile(
      reportPath,
      JSON.stringify(
        reportWithFiles({
          "src/core/pipeline.ts": ["Killed", "Killed", "Killed", "Survived"],
          "src/rules/design.ts": ["Killed"],
        }),
      ),
    );

    await main(["--", "--report", reportPath, "--summary-file", summaryPath], {}, root);

    expect(await readFile(summaryPath, "utf8")).toContain("| src/core/** | 1 | 75.00% | 75.00% |");
  });
});

function reportWithFiles(files: Record<string, string[]>) {
  return {
    files: Object.fromEntries(
      Object.entries(files).map(([file, statuses]) => [
        file,
        {
          mutants: statuses.map((status, id) => ({ id: `${id}`, status })),
        },
      ]),
    ),
  };
}
