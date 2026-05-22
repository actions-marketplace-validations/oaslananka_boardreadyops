#!/usr/bin/env node
import path from "node:path";
import { Command } from "commander";
import { boardReadyVersion } from "../generated/version.js";
import {
  type BaselineCliOptions,
  captureBaselineCommand,
  clearBaselineCommand,
  diffBaselineCommand,
  pruneBaselineCommand,
  showBaselineCommand,
} from "./commands/baseline.js";
import { checkCommand } from "./commands/check.js";
import { doctorCommand } from "./commands/doctor.js";
import { explainCommand } from "./commands/explain.js";
import { initCommand } from "./commands/init.js";
import { addCommonOptions, type CommonCliOptions, runCommand } from "./commands/run.js";
import { schemaCommand } from "./commands/schema.js";

export async function runCli(
  argv: string[],
  streams: { stdout: NodeJS.WritableStream; stderr: NodeJS.WritableStream } = {
    stdout: process.stdout,
    stderr: process.stderr,
  },
): Promise<number> {
  const program = new Command();
  program
    .name("boardreadyops")
    .description("BoardReadyOps - CI preflight for production-ready PCBs.")
    .version(boardReadyVersion)
    .exitOverride();
  program.configureOutput({
    writeOut: (text) => streams.stdout.write(text),
    writeErr: (text) => streams.stderr.write(text),
  });

  addCommonOptions(program.command("run").argument("[path]", "directory to scan")).action(
    async (pathInput: string | undefined, options: CommonCliOptions) => {
      process.exitCode = await runCommand(pathInput, options, streams);
    },
  );

  addCommonOptions(program.command("check").argument("[rule-or-path]").argument("[path]", "directory to scan")).action(
    async (ruleOrPath: string | undefined, pathInput: string | undefined, options: CommonCliOptions) => {
      process.exitCode = await checkCommand(ruleOrPath, pathInput, options, streams);
    },
  );

  program.command("doctor").action(async () => {
    process.exitCode = await doctorCommand(streams);
  });

  program
    .command("explain")
    .argument("<rule-id>", "rule identifier")
    .argument("[path]", "directory to inspect")
    .action(async (ruleId: string, pathInput: string | undefined) => {
      process.exitCode = await explainCommand(ruleId, pathInput, streams);
    });

  program
    .command("schema")
    .argument("[name]", "config, findings, or pinmap", "config")
    .action((name: string | undefined) => {
      process.exitCode = schemaCommand(name, streams);
    });

  program.command("init").action(async () => {
    process.exitCode = await initCommand(process.cwd(), streams);
  });

  const baseline = program.command("baseline").description("capture and maintain finding baselines");
  addBaselineOptions(baseline.command("capture").argument("[path]", "directory to scan")).action(
    async (pathInput: string | undefined, options: BaselineCliOptions) => {
      process.exitCode = await captureBaselineCommand(pathInput, options, streams);
    },
  );
  addBaselineOptions(baseline.command("diff").argument("[path]", "directory to scan")).action(
    async (pathInput: string | undefined, options: BaselineCliOptions) => {
      process.exitCode = await diffBaselineCommand(pathInput, options, streams);
    },
  );
  addBaselineOptions(baseline.command("clear").argument("[path]", "directory to scan")).action(
    async (pathInput: string | undefined, options: BaselineCliOptions) => {
      process.exitCode = await clearBaselineCommand(pathInput, options, streams);
    },
  );
  addBaselineOptions(baseline.command("show").argument("[path]", "directory to scan")).action(
    async (pathInput: string | undefined, options: BaselineCliOptions) => {
      process.exitCode = await showBaselineCommand(pathInput, options, streams);
    },
  );
  addBaselineOptions(baseline.command("prune").argument("[path]", "directory to scan")).action(
    async (pathInput: string | undefined, options: BaselineCliOptions) => {
      process.exitCode = await pruneBaselineCommand(pathInput, options, streams);
    },
  );

  try {
    await program.parseAsync(rewriteDefaultCommand(argv), { from: "user" });
    return process.exitCode && typeof process.exitCode === "number" ? process.exitCode : 0;
  } catch (error) {
    if (isCommanderDisplay(error)) {
      return 0;
    }
    streams.stderr.write(`${error instanceof Error ? error.message : "unexpected CLI error"}\n`);
    return 2;
  }
}

function addBaselineOptions(command: Command): Command {
  return command.option("--config <path>", "boardreadyops.yml location");
}

function rewriteDefaultCommand(argv: string[]): string[] {
  const commands = new Set(["run", "check", "doctor", "explain", "schema", "init", "baseline", "help"]);
  const first = argv[0];
  if (first === "--help" || first === "-h" || first === "--version" || first === "-V") {
    return argv;
  }
  if (!first || first.startsWith("-") || !commands.has(first)) {
    return ["run", ...argv];
  }
  return argv;
}

function isCommanderDisplay(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error.code === "commander.helpDisplayed" || error.code === "commander.version")
  );
}

if (
  process.argv[1] &&
  !process.env.VITEST &&
  (/^index\.(?:ts|js|cjs)$/.test(path.basename(process.argv[1])) || path.basename(process.argv[1]) === "boardreadyops")
) {
  runCli(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}
