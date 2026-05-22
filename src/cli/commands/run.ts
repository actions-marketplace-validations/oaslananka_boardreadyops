import path from "node:path";
import type { Command } from "commander";
import { loadConfig } from "../../core/config.js";
import type { FailOn } from "../../core/findings.js";
import { canonicalRoot, runPipeline } from "../../core/pipeline.js";
import { detectKicadCli } from "../../kicad/cli.js";
import { emitAnnotations } from "../../report/annotations.js";
import { formatMarkdown } from "../../report/markdown.js";
import { type OutputOptions, writeReports } from "../output.js";

export interface CommonCliOptions {
  config?: string;
  project?: string;
  mode?: "warn" | "enforce";
  requireKicad?: boolean;
  kicadCli?: string;
  bom?: string;
  pinmap?: string;
  variant?: string;
  gate?: string;
  sarif?: string | boolean;
  json?: string | boolean;
  markdown?: string | boolean;
  failOn?: FailOn;
  rule?: string[];
  skip?: string[];
  annotations?: boolean;
  quiet?: boolean;
  verbose?: boolean;
  color?: "auto" | "always" | "never";
}

export async function runCommand(
  pathInput: string | undefined,
  options: CommonCliOptions,
  streams: { stdout: NodeJS.WritableStream; stderr: NodeJS.WritableStream },
): Promise<number> {
  const root = await canonicalRoot(path.resolve(pathInput ?? "."));
  const loaded = await loadConfig(root, options.config);
  if (loaded.errors.length > 0) {
    for (const error of loaded.errors) {
      streams.stderr.write(`Configuration error: ${error}\n`);
    }
    return 2;
  }
  if (options.requireKicad) {
    const kicad = await detectKicadCli(options.kicadCli);
    if (!kicad.found) {
      streams.stderr.write("Environment error: kicad-cli not available.\n");
      return 3;
    }
  }
  const result = await runPipeline({
    cwd: process.cwd(),
    path: root,
    project: options.project,
    config: options.config,
    mode: options.mode ?? "warn",
    requireKicad: options.requireKicad ?? false,
    kicadCli: options.kicadCli,
    bom: options.bom,
    pinmap: options.pinmap,
    variant: options.variant,
    gate: options.gate,
    failOn: options.failOn ?? "high",
    rules: options.rule ?? [],
    skips: options.skip ?? [],
    annotations: options.annotations ?? true,
    quiet: options.quiet ?? false,
    verbose: options.verbose ?? false,
    color: options.color ?? "auto",
  });
  await writeReports(result, root, outputOptions(options), loaded, streams.stdout);
  if (!hasExplicitReportOutput(options)) {
    streams.stdout.write(formatMarkdown(result));
  }
  if (options.annotations !== false) {
    emitAnnotations(result.findings, streams.stderr);
  }
  return result.summary.failed ? 1 : 0;
}

export function addCommonOptions(command: Command): Command {
  return command
    .option("--config <path>", "boardreadyops.yml location")
    .option("--project <path>", "specific .kicad_pro")
    .option("--mode <mode>", "warn or enforce", "warn")
    .option("--require-kicad", "exit non-zero if kicad-cli missing")
    .option("--kicad-cli <path>", "explicit kicad-cli path")
    .option("--bom <path>", "BOM source path or auto")
    .option("--pinmap <path>", "pinmap file path")
    .option("--variant <name>", "KiCad variant name")
    .option("--gate <name>", "gate from boardreadyops.yml")
    .option("--sarif [path]", "write SARIF report")
    .option("--json [path]", "write JSON report")
    .option("--markdown [path]", "write Markdown report")
    .option("--fail-on <level>", "critical|high|medium|low|never", "high")
    .option("--rule <id>", "restrict to rule", collect, [])
    .option("--skip <id>", "skip rule", collect, [])
    .option("--no-annotations", "disable GitHub annotations")
    .option("--quiet", "suppress informational output")
    .option("--verbose", "verbose output")
    .option("--color <mode>", "auto|always|never", "auto");
}

function collect(value: string, previous: string[]): string[] {
  return [...previous, value];
}

function outputOptions(options: CommonCliOptions): OutputOptions {
  return {
    json: optionPath(options.json, "boardreadyops.findings.json"),
    sarif: optionPath(options.sarif, "boardreadyops.sarif.json"),
    markdown: optionPath(options.markdown, "boardreadyops.report.md"),
  };
}

function optionPath(value: string | boolean | undefined, fallback: string): string | undefined {
  if (value === true) {
    return fallback;
  }
  return typeof value === "string" ? value : undefined;
}

function hasExplicitReportOutput(options: CommonCliOptions): boolean {
  return Boolean(options.json || options.sarif || options.markdown);
}
