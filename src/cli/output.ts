import path from "node:path";
import type { LoadedConfig } from "../core/config.js";
import type { RunResult } from "../core/result.js";
import { formatJson } from "../report/json.js";
import { formatJunit } from "../report/junit.js";
import { formatMarkdown } from "../report/markdown.js";
import { formatSarif } from "../report/sarif.js";
import { writeTextFile } from "../util/fs.js";
import { normalizePathInput } from "../util/path.js";

export interface OutputOptions {
  json?: string | undefined;
  sarif?: string | undefined;
  markdown?: string | undefined;
  junit?: string | undefined;
}

export async function writeReports(
  result: RunResult,
  root: string,
  outputs: OutputOptions,
  loaded: LoadedConfig,
  stdout: NodeJS.WritableStream,
): Promise<{ json?: string; sarif?: string; markdown?: string; junit?: string }> {
  const targets = {
    json: outputs.json ?? configOutput(loaded, "json"),
    sarif: outputs.sarif ?? configOutput(loaded, "sarif"),
    markdown: outputs.markdown ?? configOutput(loaded, "markdown"),
    junit: outputs.junit ?? configOutput(loaded, "junit"),
  };
  const written: { json?: string; sarif?: string; markdown?: string; junit?: string } = {};
  if (targets.json) {
    written.json = await writeOrStdout(root, targets.json, formatJson(result), stdout);
  }
  if (targets.sarif) {
    written.sarif = await writeOrStdout(root, targets.sarif, formatSarif(result), stdout);
  }
  if (targets.markdown) {
    written.markdown = await writeOrStdout(root, targets.markdown, formatMarkdown(result), stdout);
  }
  if (targets.junit) {
    written.junit = await writeOrStdout(root, targets.junit, formatJunit(result), stdout);
  }
  return written;
}

function configOutput(loaded: LoadedConfig, key: "json" | "sarif" | "markdown" | "junit"): string | undefined {
  const configured = loaded.config.report?.[key];
  return configured ? configured : undefined;
}

async function writeOrStdout(
  root: string,
  target: string,
  content: string,
  stdout: NodeJS.WritableStream,
): Promise<string> {
  if (target === "-") {
    stdout.write(content);
    return "-";
  }
  const file = path.resolve(root, normalizePathInput(target));
  await writeTextFile(file, content);
  return file;
}
