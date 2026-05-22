import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DefaultArtifactClient } from "@actions/artifact";
import * as github from "@actions/github";
import type { FabricationSnapshot } from "../core/diff/fabrication.js";
import type { Finding } from "../core/findings.js";
import type { RunResult } from "../core/result.js";

type PullRequestPayload = NonNullable<typeof github.context.payload.pull_request>;
type Octokit = ReturnType<typeof github.getOctokit>;

export interface PreviousRunResult {
  tool: RunResult["tool"];
  findings: Finding[];
  fabrication?: FabricationSnapshot | undefined;
}

export async function loadPreviousRunResult(
  token: string,
  owner: string,
  repo: string,
  artifactName: string,
  pull: PullRequestPayload,
): Promise<PreviousRunResult | undefined> {
  const octokit = github.getOctokit(token);
  const currentSha = process.env.GITHUB_SHA;
  const currentRunId = runId(process.env.GITHUB_RUN_ID);
  const branches = [...new Set([pull.head?.ref, pull.base?.ref].filter((branch): branch is string => Boolean(branch)))];
  const client = new DefaultArtifactClient();
  for (const branch of branches) {
    for (const previousRunId of await previousRunIds(octokit, owner, repo, branch, currentSha, currentRunId)) {
      const findBy = { token, workflowRunId: previousRunId, repositoryOwner: owner, repositoryName: repo };
      const artifact = (
        await client.listArtifacts({ latest: true, findBy }).catch(() => ({ artifacts: [] }))
      ).artifacts.find((entry) => entry.name === artifactName);
      if (!artifact) {
        continue;
      }
      const directory = await fs.mkdtemp(path.join(os.tmpdir(), "boardreadyops-previous-"));
      try {
        const downloaded = await client
          .downloadArtifact(artifact.id, { path: directory, findBy })
          .catch(() => undefined);
        const previous = await findRunResultArtifact(downloaded?.downloadPath ?? directory);
        if (previous) {
          return previous;
        }
      } finally {
        await fs.rm(directory, { recursive: true, force: true }).catch(() => undefined);
      }
    }
  }
  return undefined;
}

export async function findRunResultArtifact(root: string): Promise<PreviousRunResult | undefined> {
  for (const file of await artifactFiles(root)) {
    try {
      const payload = JSON.parse(await fs.readFile(file, "utf8")) as unknown;
      if (isPreviousRunResult(payload)) {
        return payload;
      }
    } catch {}
  }
  return undefined;
}

export async function previousRunIds(
  octokit: Octokit,
  owner: string,
  repo: string,
  branch: string,
  currentSha: string | undefined,
  currentRunId: number | undefined,
): Promise<number[]> {
  const response = await octokit.rest.actions
    .listWorkflowRunsForRepo({ owner, repo, branch, status: "completed", per_page: 100 })
    .catch(() => undefined);
  return (
    response?.data.workflow_runs
      .filter((run) => run.id !== currentRunId && run.head_sha !== currentSha)
      .map((run) => run.id) ?? []
  );
}

async function artifactFiles(root: string): Promise<string[]> {
  const entries = await fs.readdir(root, { recursive: true, withFileTypes: true }).catch(() => []);
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(entry.parentPath, entry.name))
    .sort((a, b) => a.localeCompare(b));
}

function runId(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

function isPreviousRunResult(payload: unknown): payload is PreviousRunResult {
  if (!payload || typeof payload !== "object") {
    return false;
  }
  const candidate = payload as Partial<RunResult>;
  return candidate.tool?.name === "boardreadyops" && Array.isArray(candidate.findings);
}
