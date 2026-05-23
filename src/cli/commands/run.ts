import path from "node:path";
import { type Command, InvalidArgumentError } from "commander";
import { loadConfig } from "../../core/config.js";
import type { FailOn } from "../../core/findings.js";
import { createLogger, type LogFormat, type LogLevel, parseLogFormat, parseLogLevel } from "../../core/logger.js";
import { canonicalRoot, runPipeline } from "../../core/pipeline.js";
import { resolveLocale, t } from "../../i18n/t.js";
import { detectKicadCli } from "../../kicad/cli.js";
import { emitAnnotations } from "../../report/annotations.js";
import { formatMarkdown } from "../../report/markdown.js";
import { normalizePathInput } from "../../util/path.js";
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
  concurrency?: number;
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
  logFormat?: LogFormat;
  logLevel?: LogLevel;
  logFile?: string;
  logFileMaxBytes?: number;
  logFileRetention?: number;
}

export async function runCommand(
  pathInput: string | undefined,
  options: CommonCliOptions,
  streams: { stdout: NodeJS.WritableStream; stderr: NodeJS.WritableStream },
  commandName = "run",
): Promise<number> {
  const locale = resolveLocale();
  const root = await canonicalRoot(path.resolve(normalizePathInput(pathInput ?? ".")));
  const logger = createCliLogger(root, options, streams.stderr);
  const startedAt = performance.now();
  let exitCode = 4;
  const finish = (code: number) => {
    exitCode = code;
    return code;
  };
  logger.info("cli.command.start", {
    command: commandName,
    path: root,
  });
  try {
    const loaded = await loadConfig(root, options.config);
    if (loaded.errors.length > 0) {
      for (const error of loaded.errors) {
        streams.stderr.write(`${t("cli.error.configuration", { error }, locale)}\n`);
      }
      return finish(2);
    }
    if (options.requireKicad) {
      const kicad = await detectKicadCli(options.kicadCli);
      if (!kicad.found) {
        streams.stderr.write(`${t("cli.error.environment.kicadMissing", {}, locale)}\n`);
        return finish(3);
      }
    }
    const result = await runPipeline(
      {
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
        ...(options.concurrency ? { concurrency: options.concurrency } : {}),
        gate: options.gate,
        failOn: options.failOn ?? "high",
        rules: options.rule ?? [],
        skips: options.skip ?? [],
        annotations: options.annotations ?? true,
        quiet: options.quiet ?? false,
        verbose: options.verbose ?? false,
        color: options.color ?? "auto",
      },
      logger,
    );
    await writeReports(result, root, outputOptions(options), loaded, streams.stdout, locale);
    if (!hasExplicitReportOutput(options)) {
      streams.stdout.write(formatMarkdown(result, [], undefined, locale));
    }
    if (options.annotations !== false) {
      emitAnnotations(result.findings, streams.stderr);
    }
    return finish(result.summary.failed ? 1 : 0);
  } catch (error) {
    logger.error("cli.command.error", {
      command: commandName,
      path: root,
      latency_ms: Math.round(performance.now() - startedAt),
      error,
    });
    throw error;
  } finally {
    logger.info("cli.command.finish", {
      command: commandName,
      path: root,
      exit_code: exitCode,
      latency_ms: Math.round(performance.now() - startedAt),
    });
  }
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
    .option("--concurrency <count>", "max projects to check in parallel", positiveInteger)
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
    .option("--color <mode>", "auto|always|never", "auto")
    .option("--log-format <format>", "text or json", logFormatInput)
    .option("--log-level <level>", "debug|info|warn|error|critical|silent", logLevelInput)
    .option("--log-file <path>", "write structured logs to a file")
    .option("--log-file-max-bytes <bytes>", "rotate log file after this many bytes", positiveInteger)
    .option("--log-file-retention <count>", "number of rotated log files to keep", nonNegativeInteger);
}

function collect(value: string, previous: string[]): string[] {
  return [...previous, value];
}

function positiveInteger(value: string): number {
  if (!/^[1-9]\d*$/.test(value)) {
    throw new InvalidArgumentError(t("cli.error.concurrencyPositiveInteger"));
  }
  return Number.parseInt(value, 10);
}

function nonNegativeInteger(value: string): number {
  if (!/^(0|[1-9]\d*)$/.test(value)) {
    throw new InvalidArgumentError("Value must be a non-negative integer.");
  }
  return Number.parseInt(value, 10);
}

function logFormatInput(value: string): LogFormat {
  try {
    return parseLogFormat(value, "log-format");
  } catch (error) {
    throw new InvalidArgumentError(error instanceof Error ? error.message : "Invalid log-format.");
  }
}

function logLevelInput(value: string): LogLevel {
  try {
    return parseLogLevel(value, "log-level");
  } catch (error) {
    throw new InvalidArgumentError(error instanceof Error ? error.message : "Invalid log-level.");
  }
}

function createCliLogger(root: string, options: CommonCliOptions, stream: NodeJS.WritableStream) {
  return createLogger({
    level: effectiveLogLevel(options),
    format: options.logFormat ?? envLogFormat(),
    stream,
    projectRoot: root,
    logFile: resolveOptionalPath(root, options.logFile ?? process.env.BOARDREADY_LOG_FILE),
    maxFileBytes: options.logFileMaxBytes ?? envPositiveInteger("BOARDREADY_LOG_FILE_MAX_BYTES") ?? undefined,
    retention: options.logFileRetention ?? envNonNegativeInteger("BOARDREADY_LOG_FILE_RETENTION") ?? undefined,
  });
}

function effectiveLogLevel(options: CommonCliOptions): LogLevel {
  if (options.logLevel) {
    return options.logLevel;
  }
  const envLevel = process.env.BOARDREADY_LOG_LEVEL?.trim();
  if (envLevel) {
    return parseLogLevel(envLevel, "BOARDREADY_LOG_LEVEL");
  }
  if (options.quiet) {
    return "silent";
  }
  if (options.verbose) {
    return "debug";
  }
  return "info";
}

function envLogFormat(): LogFormat {
  const value = process.env.BOARDREADY_LOG_FORMAT?.trim();
  return value ? parseLogFormat(value, "BOARDREADY_LOG_FORMAT") : "text";
}

function envPositiveInteger(name: string): number | undefined {
  const value = process.env[name]?.trim();
  if (!value) {
    return undefined;
  }
  if (!/^[1-9]\d*$/.test(value)) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return Number.parseInt(value, 10);
}

function envNonNegativeInteger(name: string): number | undefined {
  const value = process.env[name]?.trim();
  if (!value) {
    return undefined;
  }
  if (!/^(0|[1-9]\d*)$/.test(value)) {
    throw new Error(`${name} must be a non-negative integer.`);
  }
  return Number.parseInt(value, 10);
}

function resolveOptionalPath(root: string, value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? path.resolve(root, normalizePathInput(trimmed)) : undefined;
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
