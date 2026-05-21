import Mustache from "mustache";
import type { RunResult } from "../core/result.js";
import prCommentTemplate from "./templates/pr-comment.mustache";
import summaryTemplate from "./templates/summary.mustache";

const stickyMarker = "<!-- boardreadyops:sticky:v1 -->";

export interface MarkdownArtifact {
  label: string;
  url: string;
}

export function formatMarkdown(result: RunResult, artifacts: MarkdownArtifact[] = []): string {
  return Mustache.render(
    prCommentTemplate,
    {
      ...result,
      hasFindings: result.findings.length > 0,
      topFindings: result.findings.slice(0, 10),
      hasArtifacts: artifacts.length > 0,
      artifacts,
    },
    { summary: summaryTemplate },
  );
}

export { stickyMarker };
