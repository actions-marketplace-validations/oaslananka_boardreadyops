import fs from "node:fs/promises";
import path from "node:path";
import { createBaseline, diffBaseline, readBaseline, resolveBaselinePath, writeBaseline } from "../../core/baseline.js";
import { loadConfig } from "../../core/config.js";
import { canonicalRoot, runPipeline } from "../../core/pipeline.js";

type Streams = { stdout: NodeJS.WritableStream; stderr: NodeJS.WritableStream };
type PathInput = string | undefined;
type BaselineHandler = (pathInput: PathInput, options: BaselineCliOptions, streams: Streams) => Promise<number>;
export interface BaselineCliOptions {
  config?: string;
}

export const captureBaselineCommand: BaselineHandler = async (pathInput, options, streams) => {
  return withBaselineRoot(pathInput, options.config, streams, async (root, file) => {
    const result = await currentResult(root, options.config, true);
    const baseline = createBaseline(result.findings);
    await writeBaseline(file, baseline);
    streams.stdout.write(`Captured ${baseline.findings.length} finding(s) in ${baselineDisplayPath(root, file)}.\n`);
    return 0;
  });
};

export const diffBaselineCommand: BaselineHandler = async (pathInput, options, streams) => {
  return withBaselineRoot(pathInput, options.config, streams, async (root, file) => {
    const baseline = await requiredBaseline(file, root, streams);
    if (!baseline) {
      return 2;
    }
    const diff = diffBaseline((await currentResult(root, options.config)).findings, baseline);
    streams.stdout.write(
      `Added: ${diff.added.length}\nRemoved: ${diff.removed.length}\nUnchanged: ${diff.unchanged.length}\n`,
    );
    return 0;
  });
};

export const clearBaselineCommand: BaselineHandler = async (pathInput, options, streams) => {
  return withBaselineRoot(pathInput, options.config, streams, async (root, file) => {
    await fs.rm(file, { force: true });
    streams.stdout.write(`Removed ${baselineDisplayPath(root, file)}.\n`);
    return 0;
  });
};

export const showBaselineCommand: BaselineHandler = async (pathInput, options, streams) => {
  return withBaselineRoot(pathInput, options.config, streams, async (root, file) => {
    const baseline = await requiredBaseline(file, root, streams);
    if (!baseline) {
      return 2;
    }
    streams.stdout.write(`${JSON.stringify(baseline, null, 2)}\n`);
    return 0;
  });
};

export const pruneBaselineCommand: BaselineHandler = async (pathInput, options, streams) => {
  return withBaselineRoot(pathInput, options.config, streams, async (root, file) => {
    const baseline = await requiredBaseline(file, root, streams);
    if (!baseline) {
      return 2;
    }
    const current = new Set((await currentResult(root, options.config)).findings.map((finding) => finding.fingerprint));
    const findings = baseline.findings.filter((finding) => current.has(finding.fingerprint));
    await writeBaseline(file, { ...baseline, findings });
    streams.stdout.write(`Pruned ${baseline.findings.length - findings.length} baseline finding(s).\n`);
    return 0;
  });
};

async function withBaselineRoot(
  pathInput: PathInput,
  configInput: string | undefined,
  streams: Streams,
  command: (root: string, file: string) => Promise<number>,
): Promise<number> {
  const root = await canonicalRoot(path.resolve(pathInput ?? "."));
  const loaded = await loadConfig(root, configInput);
  if (loaded.errors.length > 0) {
    for (const error of loaded.errors) {
      streams.stderr.write(`Configuration error: ${error}\n`);
    }
    return 2;
  }
  return command(root, resolveBaselinePath(root, loaded.config.baseline));
}

async function currentResult(root: string, configInput: string | undefined, ignoreBaseline = false) {
  return runPipeline({
    cwd: process.cwd(),
    path: root,
    config: configInput,
    failOn: "never",
    ignoreBaseline,
    annotations: false,
  });
}

async function requiredBaseline(file: string, root: string, streams: Streams) {
  const baseline = await readBaseline(file);
  if (!baseline) {
    streams.stderr.write(`Baseline not found: ${baselineDisplayPath(root, file)}.\n`);
  }
  return baseline;
}

function baselineDisplayPath(root: string, file: string): string {
  return path.relative(root, file).replace(/\\/g, "/") || path.basename(file);
}
