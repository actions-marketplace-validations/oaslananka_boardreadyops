import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { findRunResultArtifact, previousRunIds } from "../../../src/action/previous-result.js";

describe("previous action result", () => {
  it("loads the BoardReadyOps JSON report from a downloaded artifact tree", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "boardreadyops-artifact-"));
    await fs.mkdir(path.join(root, "reports"), { recursive: true });
    await fs.writeFile(path.join(root, "summary.json"), JSON.stringify({ tool: { name: "other" } }), "utf8");
    await fs.writeFile(
      path.join(root, "reports", "boardreadyops.findings.json"),
      JSON.stringify({
        schemaVersion: 1,
        tool: { name: "boardreadyops", version: "1.0.0" },
        summary: { total: 0 },
        projects: [],
        findings: [],
        fabrication: { bom: [], outputs: [] },
        generatedAt: "2026-05-21T00:00:00.000Z",
      }),
      "utf8",
    );

    await expect(findRunResultArtifact(root)).resolves.toMatchObject({
      tool: { name: "boardreadyops" },
      fabrication: { bom: [], outputs: [] },
    });
  });

  it("loads extensionless BoardReadyOps reports from downloaded artifacts", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "boardreadyops-artifact-"));
    await fs.writeFile(
      path.join(root, "findings"),
      JSON.stringify({
        tool: { name: "boardreadyops", version: "1.0.0" },
        findings: [],
      }),
      "utf8",
    );

    await expect(findRunResultArtifact(root)).resolves.toMatchObject({
      tool: { name: "boardreadyops" },
      findings: [],
    });
  });

  it("excludes the in-progress workflow run from prior artifact candidates", async () => {
    const calls: unknown[] = [];
    const octokit = {
      rest: {
        actions: {
          listWorkflowRunsForRepo: async (options: unknown) => {
            calls.push(options);
            return {
              data: {
                workflow_runs: [
                  { id: 101, head_sha: "head", conclusion: "failure" },
                  { id: 102, head_sha: "head", conclusion: undefined },
                  { id: 103, head_sha: "merge", conclusion: "success" },
                ],
              },
            };
          },
        },
      },
    };

    await expect(previousRunIds(octokit as never, "owner", "repo", "pr-branch", "merge", 102)).resolves.toEqual([101]);
    expect(calls).toEqual([{ owner: "owner", repo: "repo", branch: "pr-branch", status: "completed", per_page: 100 }]);
  });
});
