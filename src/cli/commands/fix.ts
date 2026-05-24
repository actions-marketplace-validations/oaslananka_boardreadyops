import path from "node:path";
import { createInterface } from "node:readline/promises";
import { canonicalRoot } from "../../core/pipeline.js";
import { normalizePathInput } from "../../util/path.js";
import {
  appliedRuleCount,
  applyFixPlan,
  type CreateFixPlanOptions,
  commitFixPlan,
  createFixPlan,
  formatFixPlan,
  isGitWorktreeDirty,
} from "../fixes.js";

type Streams = { stdout: NodeJS.WritableStream; stderr: NodeJS.WritableStream };

export interface FixCliOptions {
  config?: string;
  rule?: string[];
  dryRun?: boolean;
  interactive?: boolean;
  commit?: boolean;
  allowDirty?: boolean;
  drcReport?: string;
}

export async function fixCommand(
  pathInput: string | undefined,
  options: FixCliOptions,
  streams: Streams,
): Promise<number> {
  const root = await canonicalRoot(path.resolve(normalizePathInput(pathInput ?? ".")));
  const planOptions: CreateFixPlanOptions = {
    root,
    rules: options.rule ?? [],
  };
  if (options.config) {
    planOptions.config = options.config;
  }
  if (options.drcReport) {
    planOptions.drcReport = options.drcReport;
  }
  const result = await createFixPlan(planOptions);
  if (result.errors.length > 0) {
    for (const error of result.errors) {
      streams.stderr.write(`Configuration error: ${error}\n`);
    }
    return 2;
  }

  streams.stdout.write(formatFixPlan(result.plan));
  if (options.dryRun || result.plan.changes.length === 0) {
    return 0;
  }
  if (options.interactive) {
    const confirmed = await confirmApply(streams);
    if (confirmed === undefined) {
      return 2;
    }
    if (!confirmed) {
      streams.stdout.write("No files changed.\n");
      return 0;
    }
  }
  if (!options.allowDirty && (await isGitWorktreeDirty(root))) {
    streams.stderr.write("Workspace has uncommitted changes. Commit them first or pass --allow-dirty.\n");
    return 2;
  }

  await applyFixPlan(root, result.plan);
  if (options.commit) {
    await commitFixPlan(root, result.plan);
  }
  const count = appliedRuleCount(result.plan);
  streams.stdout.write(`Applied ${count} ${count === 1 ? "fix" : "fixes"}.\n`);
  return 0;
}

async function confirmApply(streams: Streams): Promise<boolean | undefined> {
  if (!process.stdin.isTTY) {
    streams.stderr.write("Interactive fix requires a TTY. Use --dry-run or omit --interactive.\n");
    return undefined;
  }
  const readline = createInterface({ input: process.stdin, output: process.stderr });
  try {
    const answer = await readline.question("Apply these fixes? [y/N] ");
    return /^(y|yes)$/i.test(answer.trim());
  } finally {
    readline.close();
  }
}
