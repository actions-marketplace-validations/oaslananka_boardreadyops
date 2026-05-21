import fs from "node:fs/promises";
import path from "node:path";
import { boardReadyVersion } from "../generated/version.js";
import { registerBuiltInRules } from "../rules/_index.js";
import { defaultConcurrency, mapLimit } from "./concurrency.js";
import { type BoardReadyOpsConfig, defaultConfig, type LoadedConfig, loadConfig } from "./config.js";
import type { PipelineOptions, RuleContext } from "./context.js";
import { discoverProjects } from "./discovery.js";
import { createFinding, type Finding, sortFindings, summarizeFindings } from "./findings.js";
import { createLogger, type Logger } from "./logger.js";
import type { RunResult } from "./result.js";
import { listRules } from "./rule-registry.js";

export async function runPipeline(
  input: Partial<PipelineOptions> & { cwd?: string; path?: string } = {},
  logger?: Logger,
): Promise<RunResult> {
  registerBuiltInRules();
  const cwd = input.cwd ?? process.cwd();
  const root = await canonicalRoot(path.resolve(cwd, input.path ?? "."));
  const loaded = await loadConfig(root, input.config);
  const config = { ...defaultConfig(), ...loaded.config };
  const options = normalizeOptions(cwd, root, config, input);
  const activeLogger = logger ?? createLogger(options.quiet ? "silent" : options.verbose ? "debug" : "info");
  const projects = await discoverConfiguredProjects(root, options, config);
  const findings: Finding[] = [];
  findings.push(...configFindings(root, loaded));
  findings.push(...projectShapeFindings(projects));
  const activeRules = listRules().filter((rule) => {
    if (options.rules.length > 0 && !options.rules.includes(rule.meta.id)) {
      return false;
    }
    if (options.skips.includes(rule.meta.id)) {
      return false;
    }
    return true;
  });
  const projectFindings = await mapLimit(projects, defaultConcurrency(), async (project) => {
    const context: RuleContext = { root, projects: [project], config, options, logger: activeLogger };
    const output: Finding[] = [];
    for (const rule of activeRules) {
      output.push(...(await rule.run(context)));
    }
    return output;
  });
  for (const group of projectFindings) {
    findings.push(...group);
  }
  const sorted = sortFindings(findings);
  return {
    schemaVersion: 1,
    tool: {
      name: "boardreadyops",
      version: boardReadyVersion,
    },
    summary: summarizeFindings(sorted, options.failOn),
    projects,
    findings: sorted,
    generatedAt: new Date().toISOString(),
  };
}

export async function canonicalRoot(input: string): Promise<string> {
  try {
    return await fs.realpath(input);
  } catch {
    return input;
  }
}

function normalizeOptions(
  cwd: string,
  root: string,
  config: BoardReadyOpsConfig,
  input: Partial<PipelineOptions>,
): PipelineOptions {
  return {
    cwd,
    path: root,
    project: input.project,
    config: input.config,
    mode: input.mode ?? config.mode ?? "warn",
    requireKicad: input.requireKicad ?? false,
    kicadCli: input.kicadCli,
    bom: input.bom,
    pinmap: input.pinmap,
    variant: input.variant,
    failOn: input.failOn ?? config["fail-on"] ?? "high",
    rules: input.rules ?? [],
    skips: input.skips ?? [],
    annotations: input.annotations ?? true,
    quiet: input.quiet ?? false,
    verbose: input.verbose ?? false,
    color: input.color ?? "auto",
  };
}

async function discoverConfiguredProjects(root: string, options: PipelineOptions, config: BoardReadyOpsConfig) {
  if (options.project) {
    return discoverProjects(root, options.project);
  }
  if (config.projects && config.projects.length > 0) {
    const nested = await Promise.all(config.projects.map((project) => discoverProjects(root, project.path)));
    return nested.flat();
  }
  return discoverProjects(root);
}

function configFindings(root: string, loaded: LoadedConfig): Finding[] {
  return loaded.errors.map((error) =>
    createFinding({
      ruleId: "config.invalid",
      severity: "high",
      message: `Configuration is invalid: ${error}`,
      resource: {
        path: loaded.path ? path.relative(root, loaded.path).replace(/\\/g, "/") : "boardreadyops.yml",
        kind: "manifest",
      },
      location: { line: 1, column: 1 },
    }),
  );
}

function projectShapeFindings(projects: Awaited<ReturnType<typeof discoverProjects>>): Finding[] {
  if (projects.length === 0) {
    return [
      createFinding({
        ruleId: "manifest.project-discovery",
        severity: "high",
        message: "No .kicad_pro project was found.",
        resource: { path: ".", kind: "manifest" },
      }),
    ];
  }
  const findings: Finding[] = [];
  for (const project of projects) {
    if (project.schematicFiles.length === 0) {
      findings.push(
        createFinding({
          ruleId: "manifest.project-discovery",
          severity: "high",
          message: `${project.projectFile} has no matching schematic file.`,
          resource: { path: project.projectFile, kind: "project" },
        }),
      );
    }
    if (project.boardFiles.length === 0) {
      findings.push(
        createFinding({
          ruleId: "manifest.project-discovery",
          severity: "high",
          message: `${project.projectFile} has no matching board file.`,
          resource: { path: project.projectFile, kind: "project" },
        }),
      );
    }
  }
  return findings;
}
