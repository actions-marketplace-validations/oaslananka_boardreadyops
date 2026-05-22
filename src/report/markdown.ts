import Mustache from "mustache";
import type { FabricationDiff, FabricationOutputDiff } from "../core/diff/fabrication.js";
import type { RunResult } from "../core/result.js";
import prCommentTemplate from "./templates/pr-comment.mustache";
import summaryTemplate from "./templates/summary.mustache";

const stickyMarker = "<!-- boardreadyops:sticky:v1 -->";

export interface MarkdownArtifact {
  label: string;
  url: string;
}

export function formatMarkdown(
  result: RunResult,
  artifacts: MarkdownArtifact[] = [],
  fabrication?: FabricationDiff,
): string {
  const fabricationView = fabrication ? formatFabricationDiff(fabrication) : undefined;
  const topFindings = result.findings.slice(0, 10);
  const fixFindings = result.findings.filter((finding) => finding.fix).slice(0, 10);
  return Mustache.render(
    prCommentTemplate,
    {
      ...result,
      hasFindings: result.findings.length > 0,
      topFindings,
      hasFixes: fixFindings.length > 0,
      fixFindings,
      hasArtifacts: artifacts.length > 0,
      artifacts,
      hasFabricationDiff: Boolean(fabricationView),
      fabrication: fabricationView,
    },
    { summary: summaryTemplate },
  );
}

export { stickyMarker };

function formatFabricationDiff(diff: FabricationDiff) {
  const addedFindings = diff.findings.added.slice(0, 10);
  return {
    ...diff,
    bom: {
      ...diff.bom,
      hasRows: diff.bom.rows.length > 0,
      rows: diff.bom.rows.map((row) => ({
        ...row,
        previous: row.previous || "-",
        current: row.current || "-",
      })),
    },
    outputs: diff.outputs.map((output) => ({
      ...output,
      summary: outputSummary(output),
    })),
    findings: {
      ...diff.findings,
      hasAdded: diff.findings.added.length > 0,
      added: addedFindings,
      addedTruncated: diff.findings.added.length > addedFindings.length,
      addedRemaining: diff.findings.added.length - addedFindings.length,
    },
  };
}

function outputSummary(output: FabricationOutputDiff): string {
  if (output.status === "unchanged" || output.status === "added" || output.status === "removed") {
    return "";
  }
  return [
    output.changed > 0 ? `${output.changed} changed` : "",
    output.added > 0 ? `${output.added} added` : "",
    output.removed > 0 ? `${output.removed} removed` : "",
  ]
    .filter(Boolean)
    .join(", ");
}
