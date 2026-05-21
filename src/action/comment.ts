import * as github from "@actions/github";
import type { RunResult } from "../core/result.js";
import { formatMarkdown, stickyMarker } from "../report/markdown.js";

export async function upsertPullRequestComment(result: RunResult): Promise<string> {
  const token = process.env.GITHUB_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY;
  const pull = github.context.payload.pull_request;
  if (!token || !repository || !pull) {
    return "";
  }
  const baseRepo = pull.base?.repo?.full_name;
  const headRepo = pull.head?.repo?.full_name;
  if (!baseRepo || !headRepo || baseRepo !== repository || headRepo !== baseRepo) {
    return "";
  }
  const [owner, repo] = repository.split("/");
  if (!owner || !repo) {
    return "";
  }
  const octokit = github.getOctokit(token);
  const body = formatMarkdown(result);
  const comments = await octokit.paginate(octokit.rest.issues.listComments, {
    owner,
    repo,
    issue_number: pull.number,
  });
  const existing = comments.find((comment) => comment.body?.includes(stickyMarker));
  if (existing) {
    const updated = await octokit.rest.issues.updateComment({ owner, repo, comment_id: existing.id, body });
    return updated.data.html_url ?? "";
  }
  const created = await octokit.rest.issues.createComment({ owner, repo, issue_number: pull.number, body });
  return created.data.html_url ?? "";
}
