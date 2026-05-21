import fs from "node:fs/promises";
import zlib from "node:zlib";
import { DefaultArtifactClient } from "@actions/artifact";
import * as github from "@actions/github";

export async function uploadArtifacts(name: string, files: string[], root: string): Promise<void> {
  if (files.length === 0 || process.env.GITHUB_ACTIONS !== "true") {
    return;
  }
  const client = new DefaultArtifactClient();
  await client.uploadArtifact(name, files, root, { retentionDays: 14 });
}

export async function uploadSarif(sarifPath: string): Promise<void> {
  const token = process.env.GITHUB_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY;
  const ref = process.env.GITHUB_REF;
  const commitSha = process.env.GITHUB_SHA;
  const pull = github.context.payload.pull_request;
  if (!token || !repository || !ref || !commitSha) {
    return;
  }
  if (pull?.head?.repo?.full_name && pull.head.repo.full_name !== repository) {
    return;
  }
  const [owner, repo] = repository.split("/");
  if (!owner || !repo) {
    return;
  }
  const octokit = github.getOctokit(token);
  const sarif = zlib.gzipSync(await fs.readFile(sarifPath)).toString("base64");
  await octokit.request("POST /repos/{owner}/{repo}/code-scanning/sarifs", {
    owner,
    repo,
    commit_sha: commitSha,
    ref,
    sarif,
  });
}
