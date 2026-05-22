import fs from "node:fs/promises";
import path from "node:path";
import * as core from "@actions/core";
import { runPipeline } from "../core/pipeline.js";
import { emitAnnotations } from "../report/annotations.js";
import { formatJson } from "../report/json.js";
import { formatMarkdown } from "../report/markdown.js";
import { formatSarif } from "../report/sarif.js";
import { writeTextFile } from "../util/fs.js";
import { upsertPullRequestComment } from "./comment.js";
import { readActionInputs } from "./inputs.js";
import { setActionOutputs } from "./outputs.js";
import { uploadArtifacts, uploadSarif } from "./upload.js";

export async function runAction(): Promise<void> {
  const workspace = process.env.GITHUB_WORKSPACE ?? process.cwd();
  await ensureRunnerFile(process.env.GITHUB_OUTPUT);
  await ensureRunnerFile(process.env.GITHUB_STEP_SUMMARY);
  const inputs = readActionInputs(workspace);
  const result = await runPipeline(inputs);
  const written: { sarif?: string; json?: string; markdown?: string } = {};
  if (inputs.outputs.json) {
    written.json = path.resolve(workspace, inputs.outputs.json);
    await writeTextFile(written.json, formatJson(result));
  }
  if (inputs.outputs.sarif) {
    written.sarif = path.resolve(workspace, inputs.outputs.sarif);
    await writeTextFile(written.sarif, formatSarif(result));
  }
  if (inputs.outputs.markdown) {
    written.markdown = path.resolve(workspace, inputs.outputs.markdown);
    await writeTextFile(written.markdown, formatMarkdown(result));
  }
  if (inputs.annotations) {
    emitAnnotations(result.findings);
  }
  setActionOutputs(result, written);
  await core.summary.addRaw(formatMarkdown(result)).write();
  if (inputs.uploadArtifacts) {
    await uploadArtifacts(
      inputs.artifactName,
      Object.values(written).filter((entry): entry is string => Boolean(entry)),
      workspace,
    );
  }
  if (inputs.uploadSarif && written.sarif) {
    await uploadSarif(written.sarif);
  }
  if (inputs.commentPr) {
    await upsertPullRequestComment(result, inputs.artifactName);
  }
  if (result.summary.failed) {
    throw new Error(
      `BoardReadyOps found ${result.summary.total} finding(s) at or above the configured fail-on threshold.`,
    );
  }
}

runAction().catch((error) => {
  core.setFailed(error instanceof Error ? error.message : "BoardReadyOps failed.");
});

async function ensureRunnerFile(file: string | undefined): Promise<void> {
  if (!file) {
    return;
  }
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.appendFile(file, "", "utf8");
}
